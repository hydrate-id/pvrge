import type { Env } from "./types";
import { generatePassword, hashPassword } from "./crypto";

export const ADMIN_EMAIL = "support@pvrge.com";

export async function isDutyEmail(db: D1Database, email: string): Promise<boolean> {
  if (email === ADMIN_EMAIL) return true;
  const row = await db.prepare("SELECT email FROM duty_accounts WHERE email = ?").bind(email).first();
  return Boolean(row);
}

export async function ensureAdminSeeded(env: Env): Promise<void> {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS duty_accounts (email TEXT PRIMARY KEY, created_at TEXT)").run();
  await env.DB.prepare("INSERT OR IGNORE INTO duty_accounts (email, created_at) VALUES (?, datetime('now'))").bind(ADMIN_EMAIL).run();

  const existing = await env.DB.prepare(
    "SELECT id FROM accounts WHERE email = ?"
  ).bind(ADMIN_EMAIL).first<{ id: string }>();

  if (!existing) {
    const password = generatePassword(16);
    const { hash, salt } = await hashPassword(password);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO accounts (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, ADMIN_EMAIL, hash, salt, createdAt).run();

    console.log(
`[ADMIN SEED] ========================================
[ADMIN SEED] Admin account '${ADMIN_EMAIL}' created.
[ADMIN SEED] Initial Password: ${password}
[ADMIN SEED] ========================================`
    );
  }
}
