CREATE TABLE IF NOT EXISTS wa_inbound (
  message_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
