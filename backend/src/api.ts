import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import type { Account, AttachmentMeta, Domain, Env, Message } from "./types";
import { generatePassword, hashPassword, signJWT, verifyJWT, verifyPassword } from "./crypto";
import { generateUsername, getRandomDomain } from "./generator";

async function getAuthUser(headers: Headers, env: Env) {
  const authHeader = headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const secret = env.JWT_SECRET || "pvrge-default-secret-key-change-in-prod";
  const payload = await verifyJWT(token, secret);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email };
}

export const app = new Elysia({ aot: false })
  .use(cors())
  .derive(({ request }) => ({
    env: (request as unknown as { env: Env }).env
  }))
  .get("/api/domains", async ({ env }) => {
    const result = await env.DB.prepare(
      "SELECT id, is_active FROM domains WHERE is_active = 1"
    ).all<Domain>();
    return { domains: result.results || [] };
  })
  .post("/api/accounts", async ({ body, env, set }) => {
    const reqBody = (body || {}) as { username?: string; domain?: string; password?: string };
    let username = reqBody.username?.trim().toLowerCase();
    let domain = reqBody.domain?.trim().toLowerCase();
    let password = reqBody.password;

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

    const secret = env.JWT_SECRET || "pvrge-default-secret-key-change-in-prod";
    const token = await signJWT({
      sub: id,
      email,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    }, secret);

    set.status = 201;
    return {
      id,
      email,
      password,
      token
    };
  })
  .post("/api/auth/token", async ({ body, env, set }) => {
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
      set.status = 401;
      return { error: "Invalid email or password" };
    }

    const valid = await verifyPassword(password, account.password_hash, account.password_salt);
    if (!valid) {
      set.status = 401;
      return { error: "Invalid email or password" };
    }

    const secret = env.JWT_SECRET || "pvrge-default-secret-key-change-in-prod";
    const token = await signJWT({
      sub: account.id,
      email: account.email,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    }, secret);

    return {
      token,
      account: {
        id: account.id,
        email: account.email
      }
    };
  })
  .get("/api/accounts/me", async ({ request, env, set }) => {
    const user = await getAuthUser(request.headers, env);
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
    const user = await getAuthUser(request.headers, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
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
    const user = await getAuthUser(request.headers, env);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const result = await env.DB.prepare(
      "SELECT id, sender_email, sender_name, subject, snippet, has_attachments, received_at, expires_at FROM messages WHERE account_id = ? AND expires_at > datetime('now') ORDER BY received_at DESC"
    ).bind(user.id).all();

    return { messages: result.results || [] };
  })
  .get("/api/messages/:id", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request.headers, env);
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

    return {
      message: {
        ...message,
        attachments
      }
    };
  })
  .delete("/api/messages/:id", async ({ params, request, env, set }) => {
    const user = await getAuthUser(request.headers, env);
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
    const user = await getAuthUser(request.headers, env);
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
  });
