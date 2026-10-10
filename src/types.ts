export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  ASSETS?: Fetcher;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
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
