CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL
);
INSERT INTO bookmarks(id,title,url) VALUES(1,'Cloudflare Workers','https://developers.cloudflare.com/workers/') ON CONFLICT(id) DO NOTHING;
