-- Schema for pvrge Cloudflare D1 Database

CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    is_active INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO domains (id, is_active) VALUES
('pvrge.com', 1),
('voyd.top', 1);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    password_salt TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS duty_accounts (
    email TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS support_threads (
    id TEXT PRIMARY KEY,
    channel TEXT DEFAULT 'telegram',
    telegram_chat_id TEXT NOT NULL,
    telegram_user_id TEXT NOT NULL,
    telegram_username TEXT,
    telegram_first_name TEXT,
    telegram_last_name TEXT,
    status TEXT DEFAULT 'open',
    last_message_snippet TEXT,
    last_message_at TEXT,
    unread_operator_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_threads_chat_id ON support_threads(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_status ON support_threads(status);
CREATE INDEX IF NOT EXISTS idx_support_threads_last_msg ON support_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    telegram_message_id TEXT,
    is_sent_to_telegram INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread_time ON support_messages(thread_id, created_at ASC);

