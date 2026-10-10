import type { Env } from "./types";
import { generatePassword, hashPassword } from "./crypto";

export async function ensureAdminSeeded(env: Env): Promise<void> {
  const existing = await env.DB.prepare(
    "SELECT id FROM accounts WHERE email = 'support@pvrge.com'"
  ).first<{ id: string }>();

  if (!existing) {
    const password = generatePassword(16);
    const { hash, salt } = await hashPassword(password);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO accounts (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, "support@pvrge.com", hash, salt, createdAt).run();

    console.log(
`[ADMIN SEED] ========================================
[ADMIN SEED] Admin account 'support@pvrge.com' created.
[ADMIN SEED] Initial Password: ${password}
[ADMIN SEED] ========================================`
    );
  }
}
