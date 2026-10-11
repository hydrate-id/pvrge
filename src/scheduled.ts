import type { Env } from "./types";

export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const expired = await env.DB.prepare(
    `SELECT id, raw_r2_key, attachments_json FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ? AND account_id NOT IN (SELECT id FROM accounts WHERE email IN (SELECT email FROM duty_accounts)) LIMIT 100;`
  ).bind(new Date().toISOString()).all<{ id: string; raw_r2_key: string | null; attachments_json: string | null }>();

  if (!expired.results || expired.results.length === 0) {
    return;
  }

  const r2Keys: string[] = [];
  const idsToDelete: string[] = [];

  for (const msg of expired.results) {
    idsToDelete.push(msg.id);
    if (msg.raw_r2_key) {
      r2Keys.push(msg.raw_r2_key);
    }
    if (msg.attachments_json) {
      try {
        const atts = JSON.parse(msg.attachments_json) as { r2Key?: string }[];
        for (const att of atts) {
          if (att.r2Key) {
            r2Keys.push(att.r2Key);
          }
        }
      } catch {
        // ignore malformed JSON
      }
    }
  }

  // Delete files from R2
  if (r2Keys.length > 0) {
    await env.STORAGE.delete(r2Keys);
  }

  // Delete rows from D1
  if (idsToDelete.length > 0) {
    const placeholders = idsToDelete.map(() => "?").join(",");
    await env.DB.prepare(
      `DELETE FROM messages WHERE id IN (${placeholders})`
    ).bind(...idsToDelete).run();
  }
}
