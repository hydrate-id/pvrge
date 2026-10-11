import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { email } from "./email";
import type { Account, AttachmentMeta, Domain, Env, Message, SupportMessage, SupportThread } from "./types";
import { createJwt, generatePassword, hashPassword, signJWT, verifyJWT, verifyPassword } from "./crypto";
import { isDutyEmail } from "./admin";
import { sendTelegramMessage } from "./telegram";
import { generateUsername, getRandomDomain } from "./generator";
import {
  checkRateLimit,
  getClientIp,
  hashIp,
  isLoginBlocked,
  isRateLimitBypassed,
  recordFailedLogin,
  resetFailedLogin
} from "./rate-limit";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getJwtSecret(env: Env): string {
  if (!env.JWT_SECRET) {
    if (env.ENVIRONMENT === "production") {
      console.error(
        "[CRITICAL] JWT_SECRET is not configured in production! Set it immediately using 'wrangler secret put JWT_SECRET'."
      );
    } else {
      console.warn(
        "[WARN] JWT_SECRET is not set. Using default insecure dev secret. Run 'wrangler secret put JWT_SECRET' for production."
      );
    }
    return "pvrge-default-secret-key-change-in-prod";
  }
  return env.JWT_SECRET;
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  const pairs = header.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key) {
        cookies[key] = decodeURIComponent(val);
      }
    }
  }
  return cookies;
}

function shouldSetSecureCookie(request: Request, env: Env): boolean {
  if (isRateLimitBypassed(env, request)) return false;
  return request.url.startsWith("https://");
}

function buildSetCookie(
  name: string,
  value: string,
  options: { maxAge?: number; sameSite?: "Lax" | "Strict"; path?: string; secure?: boolean } = {}
): string {
  const maxAge = options.maxAge !== undefined ? options.maxAge : 604800;
  const sameSite = options.sameSite || "Lax";
  const path = options.path || "/";
  const securePart = options.secure ? "; Secure" : "";
  return `${name}=${value}; HttpOnly${securePart}; SameSite=${sameSite}; Path=${path}; Max-Age=${maxAge}`;
}

async function getAuthUser(reqOrHeaders: Request | Headers, env: Env) {
  let headers: Headers;
  let pathname = "";
  if (reqOrHeaders instanceof Headers) {
    headers = reqOrHeaders;
  } else if ("headers" in reqOrHeaders && reqOrHeaders.headers instanceof Headers) {
    headers = reqOrHeaders.headers;
    try {
      pathname = new URL(reqOrHeaders.url).pathname;
    } catch {}
  } else {
    headers = new Headers();
  }

  const cookieHeader = headers.get("cookie");
  const cookies = parseCookies(cookieHeader);

  const isAdminOrDuty =
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/duty") ||
    headers.has("x-duty") ||
    headers.has("x-duty-auth");

  let token: string | undefined;

  // 1. Cek pvrge_duty_session jika admin/duty
  if (isAdminOrDuty && cookies.pvrge_duty_session) {
    token = cookies.pvrge_duty_session;
  }

  // 2. Cek pvrge_session
  if (!token && cookies.pvrge_session) {
    token = cookies.pvrge_session;
  }

  // 3. Fallback header Authorization: Bearer <token>
  if (!token) {
    const authHeader = headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return null;

  const secret = getJwtSecret(env);
  const payload = await verifyJWT(token, secret);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email };
}

export const app = new Elysia({ aot: false })
  .use(cors())
  .derive(({ request }) => ({
    env: (request as unknown as { env: Env }).env,
    ctx: (request as unknown as { ctx?: ExecutionContext }).ctx
  }))
  .get("/api/domains", async ({ env }) => {
    const result = await env.DB.prepare(
      "SELECT id, is_active FROM domains WHERE is_active = 1"
    ).all<Domain>();
    return { domains: result.results || [] };
  })
  .post("/api/accounts", async ({ body, request, env, set }) => {
    const clientIp = getClientIp(request.headers);

    // Burst protection (In-Memory): Max 2 requests per 30s per IP
    const burstCheck = checkRateLimit(`account_burst:${clientIp}`, 2, 30, env, request);
    if (!burstCheck.allowed) {
      set.status = 429;
      set.headers["Retry-After"] = String(burstCheck.retryAfter);
      return { error: "Too many account creation attempts. Please try again later." };
    }

    // 24-hour limit (Durable D1): Max 5 accounts per day per IP
    const ipHash = await hashIp(clientIp);
    if (!isRateLimitBypassed(env, request)) {
      const creationCount = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM ip_creations WHERE ip_hash = ? AND created_at > datetime('now', '-24 hours')"
      ).bind(ipHash).first<{ count: number }>();

      if (creationCount && creationCount.count >= 5) {
        set.status = 429;
        return { error: "Maximum of 5 accounts per day reached for this IP." };
      }
    }

    const reqBody = (body || {}) as { username?: string; domain?: string; password?: string };
    let username = reqBody.username?.trim().toLowerCase();
    let domain = reqBody.domain?.trim().toLowerCase();
    let password = reqBody.password;

    if (username === "support" && domain === "pvrge.com") {
      set.status = 400;
      return { error: "This email address is reserved." };
    }

    if (!domain) {
      domain = await getRandomDomain(env.DB);
    } else {
      const domainCheck = await env.DB.prepare(
        "SELECT id FROM domains WHERE id = ? AND is_active = 1"
      ).bind(domain).first();
      if (!domainCheck) {
        set.status = 400;
        return { error: "Invalid or inactive domain" };
      }
    }

    if (!username) {
      username = generateUsername();
    } else {
      if (!/^[a-z0-9]{3,32}$/.test(username)) {
        set.status = 400;
        return { error: "Username must be 3-32 alphanumeric characters" };
      }
    }

    if (!password) {
      password = generatePassword();
    }

    const email = `${username}@${domain}`;

    const existing = await env.DB.prepare(
      "SELECT id FROM accounts WHERE email = ?"
    ).bind(email).first();
    if (existing) {
      set.status = 409;
      return { error: "Account already exists" };
    }

    const id = crypto.randomUUID();
    const { hash, salt } = await hashPassword(password);
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO accounts (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, email, hash, salt, createdAt).run();

    if (!isRateLimitBypassed(env, request)) {
      await env.DB.prepare(
        "INSERT INTO ip_creations (ip_hash, created_at) VALUES (?, datetime('now'))"
      ).bind(ipHash).run();
    }

    const secret = getJwtSecret(env);
    const token = await signJWT({
      sub: id,
      email,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    }, secret);

    set.headers["Set-Cookie"] = buildSetCookie("pvrge_session", token, {
      maxAge: 604800,
      sameSite: "Lax",
      secure: shouldSetSecureCookie(request, env)
    });
    set.status = 201;
    return {
      id,
      email,
      password,
      token
    };
  })
  .post("/api/auth/token", async ({ body, request, env, set }) => {
    const clientIp = getClientIp(request.headers);

    // Brute-force protection: Max 5 failed attempts per IP per 15 min (900s)
    const loginStatus = isLoginBlocked(clientIp, env, request);
    if (loginStatus.blocked) {
      set.status = 429;
      set.headers["Retry-After"] = String(loginStatus.retryAfter);
      return { error: "Too many failed login attempts. Please wait 15 minutes." };
    }

    const reqBody = (body || {}) as { email?: string; password?: string };
    const email = reqBody.email?.trim().toLowerCase();
    const password = reqBody.password;

    if (!email || !password) {
      set.status = 400;
      return { error: "Email and password are required" };
    }

    const account = await env.DB.prepare(
      "SELECT id, email, password_hash, password_salt FROM accounts WHERE email = ?"
    ).bind(email).first<Account>();

    if (!account) {
      recordFailedLogin(clientIp);
      set.status = 401;
      return { error: "Invalid email or password" };
    }

    const valid = await verifyPassword(password, account.password_hash, account.password_salt);
    if (!valid) {
      recordFailedLogin(clientIp);
      set.status = 401;
      return { error: "Invalid email or password" };
    }

    // Reset failed attempts on success
    resetFailedLogin(clientIp);

    const secret = getJwtSecret(env);
    const token = await signJWT({
      sub: account.id,
      email: account.email,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    }, secret);

    const isDuty = await isDutyEmail(env.DB, email);
    if (isDuty) {
      set.headers["Set-Cookie"] = buildSetCookie("pvrge_duty_session", token, {
        maxAge: 86400,
        sameSite: "Strict",
        secure: shouldSetSecureCookie(request, env)
      });
    } else {
      set.headers["Set-Cookie"] = buildSetCookie("pvrge_session", token, {
        maxAge: 604800,
        sameSite: "Lax",
        secure: shouldSetSecureCookie(request, env)
      });
    }

    return {
      token,
      account: {
        id: account.id,
        email: account.email
      }
    };
  })
  .post("/api/auth/logout", async ({ request, env, set }) => {
    set.headers["Set-Cookie"] = buildSetCookie("pvrge_session", "", {
      maxAge: 0,
      sameSite: "Lax",
      secure: shouldSetSecureCookie(request, env)
    });
    return { success: true };
  })
  .post("/api/auth/duty-logout", async ({ request, env, set }) => {
    set.headers["Set-Cookie"] = buildSetCookie("pvrge_duty_session", "", {
      maxAge: 0,
      sameSite: "Strict",
      secure: shouldSetSecureCookie(request, env)
    });
    return { success: true };
  })
  .get("/api/duty/me", async ({ request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (user && (await isDutyEmail(env.DB, user.email))) {
      return { authenticated: true, email: user.email };
    }
    set.status = 401;
    return { authenticated: false };
  })
  .post("/api/duty/change-password", async ({ body, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const reqBody = (body || {}) as { currentPassword?: string; newPassword?: string };
    const { currentPassword, newPassword } = reqBody;

    if (!currentPassword || !newPassword) {
      set.status = 400;
      return { error: "Current password and new password are required" };
    }

    if (newPassword.length < 6) {
      set.status = 400;
      return { error: "New password must be at least 6 characters" };
    }

    const account = await env.DB.prepare(
      "SELECT id, password_hash, password_salt FROM accounts WHERE id = ?"
    ).bind(user.id).first<{ id: string; password_hash: string; password_salt: string }>();

    if (!account) {
      set.status = 404;
      return { error: "Account not found" };
    }

    const valid = await verifyPassword(currentPassword, account.password_hash, account.password_salt);
    if (!valid) {
      set.status = 400;
      return { error: "Invalid current password" };
    }

    const { hash, salt } = await hashPassword(newPassword);
    await env.DB.prepare(
      "UPDATE accounts SET password_hash = ?, password_salt = ? WHERE id = ?"
    ).bind(hash, salt, user.id).run();

    return { success: true };
  })
  .post("/api/duty/accounts", async ({ body, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const reqBody = (body || {}) as { email?: string; password?: string };
    const targetEmail = reqBody.email?.trim().toLowerCase();
    const targetPassword = reqBody.password;

    if (!targetEmail || !targetPassword) {
      set.status = 400;
      return { error: "Email and password are required" };
    }

    if (targetPassword.length < 6) {
      set.status = 400;
      return { error: "Password must be at least 6 characters" };
    }

    const existing = await env.DB.prepare(
      "SELECT id FROM accounts WHERE email = ?"
    ).bind(targetEmail).first();

    if (existing) {
      set.status = 409;
      return { error: "Account already exists" };
    }

    const id = crypto.randomUUID();
    const { hash, salt } = await hashPassword(targetPassword);
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO accounts (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, targetEmail, hash, salt, createdAt).run();

    await env.DB.prepare(
      "INSERT INTO duty_accounts (email, created_at) VALUES (?, datetime('now'))"
    ).bind(targetEmail).run();

    set.status = 201;
    return { success: true, account: { id, email: targetEmail } };
  })
  .post("/api/auth/switch", async ({ body, request, env, set }) => {
    const reqBody = (body || {}) as { accountId?: string };
    const accountId = reqBody.accountId;
    if (!accountId) {
      set.status = 404;
      return { error: "Account not found" };
    }

    const target = await env.DB.prepare(
      "SELECT id, email FROM accounts WHERE id = ?"
    ).bind(accountId).first<{ id: string; email: string }>();

    if (target && target.email !== "support@pvrge.com") {
      const token = await createJwt({ sub: target.id, email: target.email }, env.JWT_SECRET || getJwtSecret(env));
      set.headers["Set-Cookie"] = buildSetCookie("pvrge_session", token, {
        maxAge: 604800,
        sameSite: "Lax",
        secure: shouldSetSecureCookie(request, env)
      });
      return { success: true, account: { id: target.id, email: target.email } };
    } else {
      set.status = 404;
      return { error: "Account not found" };
    }
  })
  .get("/api/accounts/me", async ({ request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const account = await env.DB.prepare(
      "SELECT id, email, created_at FROM accounts WHERE id = ?"
    ).bind(user.id).first<{ id: string; email: string; created_at: string }>();

    if (!account) {
      set.status = 404;
      return { error: "Account not found" };
    }

    return { account };
  })
  .delete("/api/accounts/me", async ({ request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (user.email === "support@pvrge.com") {
      set.status = 403;
      return { error: "Admin account cannot be deleted." };
    }

    const messages = await env.DB.prepare(
      "SELECT id, raw_r2_key, attachments_json FROM messages WHERE account_id = ?"
    ).bind(user.id).all<{ id: string; raw_r2_key: string | null; attachments_json: string | null }>();

    const r2Keys: string[] = [];
    if (messages.results) {
      for (const msg of messages.results) {
        if (msg.raw_r2_key) r2Keys.push(msg.raw_r2_key);
        if (msg.attachments_json) {
          try {
            const atts = JSON.parse(msg.attachments_json) as { r2Key?: string }[];
            for (const att of atts) {
              if (att.r2Key) r2Keys.push(att.r2Key);
            }
          } catch {}
        }
      }
    }

    if (r2Keys.length > 0) {
      await env.STORAGE.delete(r2Keys);
    }

    await env.DB.prepare("DELETE FROM messages WHERE account_id = ?").bind(user.id).run();
    await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(user.id).run();

    return { success: true };
  })
  .get("/api/messages", async ({ request, env, set }) => {
    const clientIp = getClientIp(request.headers);

    // Per-IP aggregate: Max 30 requests per 10s
    const ipLimit = checkRateLimit(`poll_ip:${clientIp}`, 30, 10, env, request);
    if (!ipLimit.allowed) {
      set.status = 429;
      set.headers["Retry-After"] = String(ipLimit.retryAfter);
      return { error: "Rate limit exceeded" };
    }

    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // Per-account token: Max 3 requests per 6s
    const accountLimit = checkRateLimit(`poll_account:${user.id}`, 3, 6, env, request);
    if (!accountLimit.allowed) {
      set.status = 429;
      set.headers["Retry-After"] = String(accountLimit.retryAfter);
      return { error: "Rate limit exceeded" };
    }

    const result = await env.DB.prepare(
      "SELECT id, sender_email, sender_name, subject, snippet, has_attachments, COALESCE(auth_status, 'none') as auth_status, received_at, expires_at FROM messages WHERE account_id = ? AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY received_at DESC"
    ).bind(user.id).all<Message>();

    const messages = (result.results || []).map((msg) => ({
      ...msg,
      auth_status: msg.auth_status || "none"
    }));

    return { messages };
  })
  .get("/api/admin/users", async ({ request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Admin access required" };
    }

    const result = await env.DB.prepare(
      `SELECT a.id, a.email, a.created_at, COUNT(m.id) as message_count,
              CASE WHEN d.email IS NOT NULL THEN 1 ELSE 0 END as is_duty
       FROM accounts a
       LEFT JOIN messages m ON a.id = m.account_id
       LEFT JOIN duty_accounts d ON a.email = d.email
       GROUP BY a.id ORDER BY a.created_at DESC`
    ).all<{ id: string; email: string; created_at: string; message_count: number; is_duty: number }>();

    const users = (result.results || []).map((u) => ({
      ...u,
      is_duty: Boolean(u.is_duty)
    }));
    return { users, total: users.length };
  })
  .post("/api/admin/users/bulk-delete", async ({ body, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Admin access required" };
    }

    const reqBody = (body || {}) as { userIds?: string[] };
    const userIds = Array.isArray(reqBody.userIds) ? reqBody.userIds : [];

    if (userIds.length === 0) {
      return { success: true, count: 0 };
    }

    // Ambil semua ID akun duty dan user yang sedang login agar tidak terhapus
    const dutyRows = await env.DB.prepare(
      "SELECT id FROM accounts WHERE email = 'support@pvrge.com' OR email IN (SELECT email FROM duty_accounts)"
    ).all<{ id: string }>();

    const protectedIds = new Set<string>((dutyRows.results || []).map((r) => r.id));
    protectedIds.add(user.id);

    const targetIds = Array.from(new Set(userIds)).filter((id) => id && !protectedIds.has(id));

    let deletedCount = 0;
    for (const targetId of targetIds) {
      const target = await env.DB.prepare(
        "SELECT id FROM accounts WHERE id = ?"
      ).bind(targetId).first<{ id: string }>();

      if (!target) continue;

      const messages = await env.DB.prepare(
        "SELECT id, raw_r2_key, attachments_json FROM messages WHERE account_id = ?"
      ).bind(target.id).all<{ id: string; raw_r2_key: string | null; attachments_json: string | null }>();

      const r2Keys: string[] = [];
      if (messages.results) {
        for (const msg of messages.results) {
          if (msg.raw_r2_key) r2Keys.push(msg.raw_r2_key);
          if (msg.attachments_json) {
            try {
              const atts = JSON.parse(msg.attachments_json) as { r2Key?: string }[];
              for (const att of atts) {
                if (att.r2Key) r2Keys.push(att.r2Key);
              }
            } catch {}
          }
        }
      }

      if (r2Keys.length > 0) {
        await env.STORAGE.delete(r2Keys);
      }

      await env.DB.prepare("DELETE FROM messages WHERE account_id = ?").bind(target.id).run();
      await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(target.id).run();
      deletedCount++;
    }

    return { success: true, count: deletedCount };
  })
  .delete("/api/admin/users/:id", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Admin access required" };
    }

    const target = await env.DB.prepare(
      "SELECT id, email FROM accounts WHERE id = ?"
    ).bind(params.id).first<{ id: string; email: string }>();

    if (!target) {
      set.status = 404;
      return { error: "User not found" };
    }

    if (await isDutyEmail(env.DB, target.email)) {
      set.status = 400;
      return { error: "Cannot delete duty account" };
    }

    const messages = await env.DB.prepare(
      "SELECT id, raw_r2_key, attachments_json FROM messages WHERE account_id = ?"
    ).bind(target.id).all<{ id: string; raw_r2_key: string | null; attachments_json: string | null }>();

    const r2Keys: string[] = [];
    if (messages.results) {
      for (const msg of messages.results) {
        if (msg.raw_r2_key) r2Keys.push(msg.raw_r2_key);
        if (msg.attachments_json) {
          try {
            const atts = JSON.parse(msg.attachments_json) as { r2Key?: string }[];
            for (const att of atts) {
              if (att.r2Key) r2Keys.push(att.r2Key);
            }
          } catch {}
        }
      }
    }

    if (r2Keys.length > 0) {
      await env.STORAGE.delete(r2Keys);
    }

    await env.DB.prepare("DELETE FROM messages WHERE account_id = ?").bind(target.id).run();
    await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(target.id).run();

    return { success: true };
  })
  .get("/api/messages/:id", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const message = await env.DB.prepare(
      "SELECT * FROM messages WHERE id = ? AND account_id = ?"
    ).bind(params.id, user.id).first<Message>();

    if (!message) {
      set.status = 404;
      return { error: "Message not found" };
    }

    let attachments: AttachmentMeta[] = [];
    if (message.attachments_json) {
      try {
        attachments = JSON.parse(message.attachments_json);
      } catch {}
    }

    let replies: any[] = [];
    try {
      const repRows = await env.DB.prepare(
        "SELECT id, sender_email, recipient_email, subject, body, created_at FROM email_replies WHERE message_id = ? ORDER BY created_at ASC"
      ).bind(params.id).all();
      replies = repRows.results || [];
    } catch {}

    return {
      message: {
        ...message,
        auth_status: message.auth_status || "none",
        attachments,
        replies
      }
    };
  })
  .post("/api/duty/messages/:id/reply", async ({ params, body, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const message = await env.DB.prepare(
      "SELECT id, sender_email, subject FROM messages WHERE id = ?"
    ).bind(params.id).first<{ id: string; sender_email: string; subject: string }>();

    if (!message) {
      set.status = 404;
      return { error: "Message not found" };
    }

    const reqBody = (body || {}) as { subject?: string; body?: string };
    const replyText = reqBody.body?.trim();
    if (!replyText) {
      set.status = 400;
      return { error: "Body is required" };
    }

    const from = user.email;
    const to = message.sender_email;
    const finalSubject = reqBody.subject?.trim() || (message.subject?.startsWith("Re:") ? message.subject : `Re: ${message.subject || ""}`);
    const formattedBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; white-space: pre-wrap;">${escapeHtml(replyText)}</div>`;

    const plunkRes = await fetch("https://next-api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.PLUNK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to,
        subject: finalSubject,
        body: formattedBody,
        from
      })
    });

    if (!plunkRes.ok) {
      const err = await plunkRes.text().catch(() => "");
      console.error("Plunk error:", plunkRes.status, err);
      set.status = 502;
      return { error: "Failed to send email via Plunk" };
    }

    const replyId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO email_replies (id, message_id, sender_email, recipient_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
    ).bind(replyId, message.id, from, to, finalSubject, replyText).run();

    return { success: true, message: "Reply sent successfully" };
  })
  .get("/api/messages/:id/source", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const message = await env.DB.prepare(
      "SELECT id, sender_name, sender_email, subject, body_text, body_html, raw_r2_key, received_at FROM messages WHERE id = ? AND account_id = ?"
    ).bind(params.id, user.id).first<{
      id: string;
      sender_name: string | null;
      sender_email: string;
      subject: string;
      body_text: string | null;
      body_html: string | null;
      raw_r2_key: string | null;
      received_at: string;
    }>();

    if (!message) {
      set.status = 404;
      return { error: "Message not found" };
    }

    if (message.raw_r2_key) {
      const object = await env.STORAGE.get(message.raw_r2_key);
      if (object) {
        const rawText = await object.text();
        return new Response(rawText, {
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    }

    const rawText = `Delivered-To: ${user.email}
From: ${message.sender_name ? `${message.sender_name} <${message.sender_email}>` : message.sender_email}
To: ${user.email}
Subject: ${message.subject}
Date: ${new Date(message.received_at).toUTCString()}
Content-Type: text/html; charset=utf-8

${message.body_html || message.body_text || ""}`;

    return new Response(rawText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  })
  .delete("/api/messages/:id", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const message = await env.DB.prepare(
      "SELECT id, raw_r2_key, attachments_json FROM messages WHERE id = ? AND account_id = ?"
    ).bind(params.id, user.id).first<{ id: string; raw_r2_key: string | null; attachments_json: string | null }>();

    if (!message) {
      set.status = 404;
      return { error: "Message not found" };
    }

    const r2Keys: string[] = [];
    if (message.raw_r2_key) r2Keys.push(message.raw_r2_key);
    if (message.attachments_json) {
      try {
        const atts = JSON.parse(message.attachments_json) as { r2Key?: string }[];
        for (const att of atts) {
          if (att.r2Key) r2Keys.push(att.r2Key);
        }
      } catch {}
    }

    if (r2Keys.length > 0) {
      await env.STORAGE.delete(r2Keys);
    }

    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(params.id).run();

    return { success: true };
  })
  .get("/api/messages/:id/attachments/:attachmentId", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const message = await env.DB.prepare(
      "SELECT attachments_json FROM messages WHERE id = ? AND account_id = ?"
    ).bind(params.id, user.id).first<{ attachments_json: string | null }>();

    if (!message || !message.attachments_json) {
      set.status = 404;
      return { error: "Message or attachment not found" };
    }

    let attachments: AttachmentMeta[] = [];
    try {
      attachments = JSON.parse(message.attachments_json);
    } catch {
      set.status = 500;
      return { error: "Corrupted attachment metadata" };
    }

    const target = attachments.find((a) => a.id === params.attachmentId);
    if (!target || !target.r2Key) {
      set.status = 404;
      return { error: "Attachment not found" };
    }

    const object = await env.STORAGE.get(target.r2Key);
    if (!object || !object.body) {
      set.status = 404;
      return { error: "Attachment file not found in storage" };
    }

    const headers = new Headers();
    headers.set("Content-Type", target.mimeType || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(target.filename)}"`);
    if (object.size) {
      headers.set("Content-Length", object.size.toString());
    }

    return new Response(object.body, { headers });
  })
  .post("/api/dev/incoming-email", async ({ body, request, env, ctx, set }) => {
    if (env.ENVIRONMENT === "production") {
      set.status = 403;
      return { error: "Dev endpoint disabled in production" };
    }

    let rawEmail = "";
    if (typeof body === "string" && body.length > 0) {
      rawEmail = body;
    } else {
      try {
        rawEmail = await request.text();
      } catch {
        rawEmail = "";
      }
    }

    if (!rawEmail || !rawEmail.trim()) {
      set.status = 400;
      return { error: "Empty email payload" };
    }

    const headerSection = rawEmail.split(/\r?\n\r?\n/)[0] || "";
    const headers = new Headers();
    const unfoldedHeaders = headerSection.replace(/\r?\n[ \t]+/g, " ");
    for (const line of unfoldedHeaders.split(/\r?\n/)) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        headers.append(key, value);
      }
    }

    function extractAddress(val: string): string {
      const match = val.match(/<([^>]+)>/);
      return match ? match[1].trim() : val.trim();
    }

    const to = extractAddress(
      request.headers.get("x-to") || headers.get("to") || ""
    );
    const from = extractAddress(
      request.headers.get("x-from") || headers.get("from") || ""
    );

    const rawBytes = new TextEncoder().encode(rawEmail);
    let rejectionReason: string | null = null;
    const mockMessage = {
      from,
      to,
      headers,
      raw: new Response(rawBytes).body as ReadableStream<Uint8Array>,
      rawSize: rawBytes.byteLength,
      setReject: (reason: string) => {
        rejectionReason = reason;
        console.warn(`[dev/incoming-email] Rejected: ${reason}`);
      },
      forward: async () => {},
      reply: async () => {}
    } as unknown as ForwardableEmailMessage;

    const executionCtx = ctx || ({
      waitUntil: () => {},
      passThroughOnException: () => {}
    } as unknown as ExecutionContext);

    await email(mockMessage, env, executionCtx);

    if (rejectionReason) {
      set.status = 400;
      return { error: `Email rejected: ${rejectionReason}` };
    }

    return { success: true, message: "Email processed" };
  })
  .post("/api/telegram/webhook", async ({ body, request, env, set }) => {
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    }

    const update = (body || {}) as {
      message?: {
        message_id?: number;
        chat?: { id: number | string; type?: string };
        from?: { id: number | string; username?: string; first_name?: string; last_name?: string };
        text?: string;
        caption?: string;
      };
      edited_message?: {
        message_id?: number;
        chat?: { id: number | string; type?: string };
        from?: { id: number | string; username?: string; first_name?: string; last_name?: string };
        text?: string;
        caption?: string;
      };
    };

    const msg = update.message || update.edited_message;
    if (!msg || !msg.chat?.id) {
      return { ok: true };
    }

    const chatId = String(msg.chat.id);
    const userId = String(msg.from?.id ?? msg.chat.id);
    const username = msg.from?.username || null;
    const firstName = msg.from?.first_name || null;
    const lastName = msg.from?.last_name || null;
    const text = (msg.text || msg.caption || "").trim();
    const telegramMessageId = msg.message_id ? String(msg.message_id) : null;

    if (text.startsWith("/start") && env.TELEGRAM_BOT_TOKEN) {
      await sendTelegramMessage(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        "Halo! Selamat datang di layanan dukungan pvrge. Silakan kirimkan pertanyaan atau kendala Anda di sini, tim kami siap membantu."
      );
    }

    const snippet = text.slice(0, 100) || "[Media]";
    const existing = await env.DB.prepare(
      "SELECT id FROM support_threads WHERE telegram_chat_id = ?"
    ).bind(chatId).first<{ id: string }>();

    let threadId = existing?.id;
    if (!threadId) {
      threadId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO support_threads (
          id, channel, telegram_chat_id, telegram_user_id, telegram_username,
          telegram_first_name, telegram_last_name, status, last_message_snippet,
          last_message_at, unread_operator_count, created_at, updated_at
        ) VALUES (?, 'telegram', ?, ?, ?, ?, ?, 'open', ?, datetime('now'), 1, datetime('now'), datetime('now'))
      `).bind(
        threadId, chatId, userId, username, firstName, lastName, snippet
      ).run();
    } else {
      await env.DB.prepare(`
        UPDATE support_threads SET
          telegram_user_id = ?,
          telegram_username = coalesce(?, telegram_username),
          telegram_first_name = coalesce(?, telegram_first_name),
          telegram_last_name = coalesce(?, telegram_last_name),
          status = 'open',
          last_message_snippet = ?,
          last_message_at = datetime('now'),
          unread_operator_count = unread_operator_count + 1,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        userId, username, firstName, lastName, snippet, threadId
      ).run();
    }

    const senderName = [firstName, lastName].filter(Boolean).join(" ") || username || "Telegram User";
    const msgId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO support_messages (
        id, thread_id, sender_type, sender_name, content, telegram_message_id, is_sent_to_telegram, created_at
      ) VALUES (?, ?, 'user', ?, ?, ?, 1, datetime('now'))
    `).bind(
      msgId, threadId, senderName, text || "[Empty message]", telegramMessageId
    ).run();

    return { ok: true };
  })
  .get("/api/duty/support/threads", async ({ query, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const countsRow = await env.DB.prepare(`
      SELECT
        count(*) as total,
        sum(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        sum(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM support_threads
    `).first<{ total: number; open_count: number | null; resolved_count: number | null }>();

    const counts = {
      all: countsRow?.total || 0,
      open: countsRow?.open_count || 0,
      resolved: countsRow?.resolved_count || 0
    };

    const statusFilter = (query as { status?: string })?.status || "all";
    const search = (query as { search?: string })?.search?.trim() || "";

    let sql = "SELECT * FROM support_threads WHERE 1=1";
    const bindings: unknown[] = [];

    if (statusFilter === "open" || statusFilter === "resolved") {
      sql += " AND status = ?";
      bindings.push(statusFilter);
    }

    if (search) {
      sql += " AND (telegram_username LIKE ? OR telegram_first_name LIKE ? OR telegram_last_name LIKE ? OR last_message_snippet LIKE ?)";
      const term = `%${search}%`;
      bindings.push(term, term, term, term);
    }

    sql += " ORDER BY last_message_at DESC";

    const stmt = env.DB.prepare(sql);
    const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
    const { results: threads } = await bound.all<SupportThread>();

    return { threads: threads || [], counts };
  })
  .get("/api/duty/support/threads/:id", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const thread = await env.DB.prepare(
      "SELECT * FROM support_threads WHERE id = ?"
    ).bind(params.id).first<SupportThread>();

    if (!thread) {
      set.status = 404;
      return { error: "Thread not found" };
    }

    await env.DB.prepare(
      "UPDATE support_threads SET unread_operator_count = 0 WHERE id = ?"
    ).bind(params.id).run();

    const messages = await env.DB.prepare(
      "SELECT * FROM support_messages WHERE thread_id = ? ORDER BY created_at ASC"
    ).bind(params.id).all<SupportMessage>();

    return {
      thread: { ...thread, unread_operator_count: 0 },
      messages: messages.results || []
    };
  })
  .post("/api/duty/support/threads/:id/reply", async ({ params, body, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const reqBody = (body || {}) as { content?: string };
    const content = reqBody.content?.trim();
    if (!content) {
      set.status = 400;
      return { error: "Message content is required" };
    }

    const thread = await env.DB.prepare(
      "SELECT telegram_chat_id FROM support_threads WHERE id = ?"
    ).bind(params.id).first<{ telegram_chat_id: string }>();

    if (!thread) {
      set.status = 404;
      return { error: "Thread not found" };
    }

    let isSent = 0;
    if (env.TELEGRAM_BOT_TOKEN) {
      const ok = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, thread.telegram_chat_id, content);
      isSent = ok ? 1 : 0;
    }

    const messageId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO support_messages (
        id, thread_id, sender_type, sender_name, content, is_sent_to_telegram, created_at
      ) VALUES (?, ?, 'operator', ?, ?, ?, datetime('now'))
    `).bind(messageId, params.id, user.email, content, isSent).run();

    const snippet = content.slice(0, 100);
    await env.DB.prepare(`
      UPDATE support_threads SET
        last_message_snippet = ?,
        last_message_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(snippet, params.id).run();

    const savedMessage = await env.DB.prepare(
      "SELECT * FROM support_messages WHERE id = ?"
    ).bind(messageId).first<SupportMessage>();

    return { success: true, message: savedMessage };
  })
  .patch("/api/duty/support/threads/:id", async ({ params, body, request, env, set }) => {
    const user = await getAuthUser(request, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!(await isDutyEmail(env.DB, user.email))) {
      set.status = 403;
      return { error: "Forbidden: Duty access required" };
    }

    const reqBody = (body || {}) as { status?: string };
    const status = reqBody.status;
    if (status !== "open" && status !== "resolved") {
      set.status = 400;
      return { error: "Invalid status: must be 'open' or 'resolved'" };
    }

    const thread = await env.DB.prepare(
      "SELECT id FROM support_threads WHERE id = ?"
    ).bind(params.id).first<{ id: string }>();

    if (!thread) {
      set.status = 404;
      return { error: "Thread not found" };
    }

    await env.DB.prepare(
      "UPDATE support_threads SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(status, params.id).run();

    return { success: true, status };
  });
