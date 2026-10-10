CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  state TEXT NOT NULL,
  characters INTEGER,
  words INTEGER,
  created_at INTEGER NOT NULL
);
