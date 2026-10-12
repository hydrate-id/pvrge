import PostalMime from "postal-mime";
import type { AttachmentMeta, AuthStatus, Env } from "./types";
import { ensureAdminSeeded, isDutyEmail } from "./admin";

export function extractAuthStatus(headers: Headers): AuthStatus {
  const authHeader = (
    headers.get("authentication-results") ||
    headers.get("arc-authentication-results") ||
    ""
  ).toLowerCase();

  if (!authHeader) return "none";

  const spfMatch = authHeader.match(/\bspf=(pass|fail|softfail|none)\b/);
  const dkimMatch = authHeader.match(/\bdkim=(pass|fail|none)\b/);

  const spf = spfMatch ? spfMatch[1] : null;
  const dkim = dkimMatch ? dkimMatch[1] : null;

  if (spf === "fail" || dkim === "fail") {
    return "fail";
  }

  if (spf === "pass" || dkim === "pass") {
    return "pass";
  }

  return "none";
}

export async function email(
  message: ForwardableEmailMessage,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  // Pre-parsing check: reject if recipient account is not registered (CPU < 1ms)
  const recipientMatch = message.to.match(/<([^>]+)>/);
  const recipient = (recipientMatch ? recipientMatch[1] : message.to).toLowerCase().trim();
  let account = await env.DB.prepare(
    "SELECT id FROM accounts WHERE email = ?"
  ).bind(recipient).first<{ id: string }>();

  if (!account && (await isDutyEmail(env.DB, recipient))) {
    await ensureAdminSeeded(env);
    account = await env.DB.prepare(
      "SELECT id FROM accounts WHERE email = ?"
    ).bind(recipient).first<{ id: string }>();
  }

  if (!account) {
    message.setReject("Unknown mailbox");
    return;
  }

  // Raw size guard: > 2MB rejected
  if (message.rawSize > 2 * 1024 * 1024) {
    message.setReject("Message size exceeds 2MB limit");
    return;
  }

  const rawBuffer = await new Response(message.raw).arrayBuffer();
  const messageId = crypto.randomUUID();
  const rawR2Key = `emails/${account.id}/${messageId}/raw.eml`;
  const receivedAt = new Date();
  const isDuty = await isDutyEmail(env.DB, recipient);
  const expiresAt = isDuty ? null : new Date(receivedAt.getTime() + 24 * 60 * 60 * 1000);

  // Save raw .eml to R2
  await env.STORAGE.put(rawR2Key, rawBuffer, {
    httpMetadata: {
      contentType: "message/rfc822"
    }
  });

  // Parse MIME with corruption fallback
  let parsed;
  try {
    const parser = new PostalMime();
    parsed = await parser.parse(rawBuffer);
  } catch (err) {
    console.error("Malformed MIME parsing error:", err);
    const envelopeSubject = message.headers.get("subject") || "[Malformed Message]";
    const authStatus = extractAuthStatus(message.headers);
    const messageRfcId = message.headers.get("message-id") || null;
    const inReplyTo = message.headers.get("in-reply-to") || null;
    const referencesHeader = message.headers.get("references") || null;

    await env.DB.prepare(
      `INSERT INTO messages (
        id, account_id, thread_id, message_rfc_id, in_reply_to, references_header,
        sender_email, sender_name, subject, snippet,
        body_text, body_html, raw_r2_key, has_attachments, attachments_json,
        auth_status, received_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      messageId,
      account.id,
      messageId,
      messageRfcId,
      inReplyTo,
      referencesHeader,
      message.from,
      "",
      envelopeSubject,
      "[Malformed MIME Message]",
      "[Unable to parse email content. Please inspect the raw source.]",
      "",
      rawR2Key,
      0,
      null,
      authStatus,
      receivedAt.toISOString(),
      expiresAt ? expiresAt.toISOString() : null
    ).run();

    return;
  }

  // Save attachments to R2 (Capped at 5 attachments per email)
  const attachmentsMeta: AttachmentMeta[] = [];
  if (parsed.attachments && parsed.attachments.length > 0) {
    const attachmentsToProcess = parsed.attachments.slice(0, 5);
    for (let i = 0; i < attachmentsToProcess.length; i++) {
      const att = attachmentsToProcess[i];
      const attId = crypto.randomUUID();
      const r2Key = `emails/${account.id}/${messageId}/attachments/${attId}`;

      await env.STORAGE.put(r2Key, att.content, {
        httpMetadata: {
          contentType: att.mimeType || "application/octet-stream"
        }
      });

      const attSize =
        typeof att.content === "string"
          ? new TextEncoder().encode(att.content).byteLength
          : att.content.byteLength;

      attachmentsMeta.push({
        id: attId,
        filename: att.filename || `attachment-${i + 1}`,
        mimeType: att.mimeType || "application/octet-stream",
        size: attSize,
        r2Key
      });
    }
  }

  const senderEmail = parsed.from?.address || message.from;
  const senderName = parsed.from?.name || "";
  const subject = parsed.subject || "(No Subject)";
  const bodyText = parsed.text || "";
  const bodyHtml = parsed.html || "";
  const snippet = (bodyText.replace(/\s+/g, " ").trim() || subject).slice(0, 150);
  const authStatus = extractAuthStatus(message.headers);

  const messageRfcId = parsed.messageId || message.headers.get("message-id") || null;
  const inReplyTo = parsed.inReplyTo || message.headers.get("in-reply-to") || null;
  const rawRefs = parsed.references || message.headers.get("references") || null;
  const referencesHeader = Array.isArray(rawRefs) ? rawRefs.join(" ") : (rawRefs || null);

  let threadId: string | null = null;

  // 1. Check In-Reply-To
  if (inReplyTo) {
    const cleanInReplyTo = inReplyTo.trim();
    const matchedMsg = await env.DB.prepare(
      "SELECT thread_id FROM messages WHERE message_rfc_id = ? AND account_id = ?"
    ).bind(cleanInReplyTo, account.id).first<{ thread_id: string }>();

    if (matchedMsg?.thread_id) {
      threadId = matchedMsg.thread_id;
    } else {
      const matchedReply = await env.DB.prepare(`
        SELECT m.thread_id FROM email_replies r
        JOIN messages m ON r.message_id = m.id
        WHERE r.message_rfc_id = ? AND m.account_id = ?
      `).bind(cleanInReplyTo, account.id).first<{ thread_id: string }>();

      if (matchedReply?.thread_id) {
        threadId = matchedReply.thread_id;
      }
    }
  }

  // 2. Check References header tokens
  if (!threadId && referencesHeader) {
    const refTokens = referencesHeader.match(/<[^>]+>/g) || referencesHeader.split(/\s+/).filter(Boolean);
    for (let i = refTokens.length - 1; i >= 0; i--) {
      const token = refTokens[i].trim();
      const matchedMsg = await env.DB.prepare(
        "SELECT thread_id FROM messages WHERE message_rfc_id = ? AND account_id = ?"
      ).bind(token, account.id).first<{ thread_id: string }>();

      if (matchedMsg?.thread_id) {
        threadId = matchedMsg.thread_id;
        break;
      }

      const matchedReply = await env.DB.prepare(`
        SELECT m.thread_id FROM email_replies r
        JOIN messages m ON r.message_id = m.id
        WHERE r.message_rfc_id = ? AND m.account_id = ?
      `).bind(token, account.id).first<{ thread_id: string }>();

      if (matchedReply?.thread_id) {
        threadId = matchedReply.thread_id;
        break;
      }
    }
  }

  // 3. Fallback: Subject matching within account in past 14 days
  if (!threadId) {
    const cleanSubject = subject.replace(/^(\s*(re|fw|fwd)\s*[:;]\s*)+/gi, "").trim();
    if (cleanSubject && cleanSubject.length > 3) {
      const matchedSubject = await env.DB.prepare(`
        SELECT thread_id FROM messages
        WHERE account_id = ?
          AND (sender_email = ? OR sender_email = ?)
          AND received_at > datetime('now', '-14 days')
          AND (
            subject = ? OR
            subject LIKE ?
          )
        ORDER BY received_at DESC LIMIT 1
      `).bind(account.id, senderEmail, message.from, subject, `%${cleanSubject}%`).first<{ thread_id: string }>();

      if (matchedSubject?.thread_id) {
        threadId = matchedSubject.thread_id;
      }
    }
  }

  // 4. Default: New thread
  if (!threadId) {
    threadId = messageId;
  }

  // Insert into D1 messages
  await env.DB.prepare(
    `INSERT INTO messages (
      id, account_id, thread_id, message_rfc_id, in_reply_to, references_header,
      sender_email, sender_name, subject, snippet,
      body_text, body_html, raw_r2_key, has_attachments, attachments_json,
      auth_status, received_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    messageId,
    account.id,
    threadId,
    messageRfcId,
    inReplyTo,
    referencesHeader,
    senderEmail,
    senderName,
    subject,
    snippet,
    bodyText,
    bodyHtml,
    rawR2Key,
    attachmentsMeta.length > 0 ? 1 : 0,
    attachmentsMeta.length > 0 ? JSON.stringify(attachmentsMeta) : null,
    authStatus,
    receivedAt.toISOString(),
    expiresAt ? expiresAt.toISOString() : null
  ).run();
}
