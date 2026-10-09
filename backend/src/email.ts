import PostalMime from "postal-mime";
import type { AttachmentMeta, Env } from "./types";

export async function email(
  message: ForwardableEmailMessage,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  // Pre-parsing check: reject if recipient account is not registered (CPU < 1ms)
  const recipient = message.to.toLowerCase().trim();
  const account = await env.DB.prepare(
    "SELECT id FROM accounts WHERE email = ?"
  ).bind(recipient).first<{ id: string }>();

  if (!account) {
    message.setReject("Unknown mailbox");
    return;
  }

  // Raw size guard: > 2MB rejected
  if (message.rawSize > 2 * 1024 * 1024) {
    message.setReject("Message size exceeds 2MB limit");
    return;
  }

  // Parse MIME
  const rawBuffer = await new Response(message.raw).arrayBuffer();
  const parser = new PostalMime();
  const parsed = await parser.parse(rawBuffer);

  const messageId = crypto.randomUUID();
  const rawR2Key = `emails/${account.id}/${messageId}/raw.eml`;

  // Save raw .eml to R2
  await env.STORAGE.put(rawR2Key, rawBuffer, {
    httpMetadata: {
      contentType: "message/rfc822"
    }
  });

  // Save attachments to R2
  const attachmentsMeta: AttachmentMeta[] = [];
  if (parsed.attachments && parsed.attachments.length > 0) {
    for (let i = 0; i < parsed.attachments.length; i++) {
      const att = parsed.attachments[i];
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

  const receivedAt = new Date();
  const expiresAt = new Date(receivedAt.getTime() + 24 * 60 * 60 * 1000);

  const senderEmail = parsed.from?.address || message.from;
  const senderName = parsed.from?.name || "";
  const subject = parsed.subject || "(No Subject)";
  const bodyText = parsed.text || "";
  const bodyHtml = parsed.html || "";
  const snippet = (bodyText.replace(/\s+/g, " ").trim() || subject).slice(0, 150);

  // Insert into D1 messages
  await env.DB.prepare(
    `INSERT INTO messages (
      id, account_id, sender_email, sender_name, subject, snippet,
      body_text, body_html, raw_r2_key, has_attachments, attachments_json,
      received_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    messageId,
    account.id,
    senderEmail,
    senderName,
    subject,
    snippet,
    bodyText,
    bodyHtml,
    rawR2Key,
    attachmentsMeta.length > 0 ? 1 : 0,
    attachmentsMeta.length > 0 ? JSON.stringify(attachmentsMeta) : null,
    receivedAt.toISOString(),
    expiresAt.toISOString()
  ).run();
}
