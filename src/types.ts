export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  ASSETS?: Fetcher;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
  DISABLE_RATE_LIMIT?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
}

export interface Domain {
  id: string;
  is_active: number;
}

export interface Account {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

export interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  r2Key: string;
}

export type AuthStatus = "pass" | "fail" | "none";

export interface Message {
  id: string;
  account_id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  snippet: string;
  body_text: string;
  body_html: string;
  raw_r2_key: string | null;
  has_attachments: number;
  attachments_json: string | null;
  auth_status: AuthStatus;
  received_at: string;
  expires_at: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  exp: number;
}

export interface SupportThread {
  id: string;
  channel: string;
  telegram_chat_id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  status: "open" | "resolved";
  last_message_snippet: string | null;
  last_message_at: string | null;
  unread_operator_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  sender_type: "user" | "operator";
  sender_name: string;
  content: string;
  telegram_message_id: string | null;
  is_sent_to_telegram: number;
  created_at: string;
}

