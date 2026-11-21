-- MCPクライアント用の個人アクセストークン。1ユーザー1トークンで、本体は保存せずSHA-256のハッシュだけを持つ。
CREATE TABLE mcp_tokens (
  user_email TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
