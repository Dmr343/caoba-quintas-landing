CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL,
  telefono   TEXT    NOT NULL,
  fuente     TEXT    NOT NULL DEFAULT 'hero',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
