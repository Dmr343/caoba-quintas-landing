CREATE TABLE wa_sessions (
  phone TEXT PRIMARY KEY,
  step INTEGER NOT NULL DEFAULT 0,
  nombre TEXT,
  cedula TEXT,
  disponibilidad TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX idx_wa_sessions_updated ON wa_sessions(updated_at);
