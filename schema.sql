-- Schema for pvrge Cloudflare D1 Database

CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO domains (id, is_active) VALUES
('pvrge.com', 1),
('suar.in', 1);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    password_salt TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    sender_email TEXT,
    sender_name TEXT,
    subject TEXT,
    snippet TEXT,
    body_text TEXT,
    body_html TEXT,
    raw_r2_key TEXT,
    has_attachments INTEGER DEFAULT 0,
    attachments_json TEXT,
    auth_status TEXT DEFAULT 'none',
    received_at TEXT,
    expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_account ON messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at);

CREATE TABLE IF NOT EXISTS ip_creations (
    ip_hash TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ip_creations_hash_date ON ip_creations(ip_hash, created_at);
