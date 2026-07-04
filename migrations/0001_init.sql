CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT,
  price INTEGER NOT NULL,
  want_level INTEGER NOT NULL,
  usage_freq INTEGER NOT NULL,
  purchased INTEGER NOT NULL DEFAULT 0,
  purchased_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
