-- Muse Brand OS sync — D1 schema
-- Áp dụng: wrangler d1 execute muse_db --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS accounts (
  code       TEXT PRIMARY KEY,            -- access code = bearer token (admin cấp)
  name       TEXT,                        -- tên hiển thị
  blob       TEXT,                        -- JSON.stringify(S.characters) (NULL tới push đầu)
  version    INTEGER NOT NULL DEFAULT 0,  -- tăng mỗi push; nền của conflict detection (CAS)
  created_at TEXT,
  updated_at TEXT,
  last_seen  TEXT,
  plan       TEXT DEFAULT 'life',
  note       TEXT,
  pushes     INTEGER DEFAULT 0,
  expires_at TEXT
);
