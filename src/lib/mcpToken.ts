// MCPクライアント用の個人アクセストークン。DBにはハッシュだけを保存し、本体は発行時に一度だけ表示する。

const TOKEN_PREFIX = "swl_";

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashToken(token: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
}

/** 新しいトークンを発行し、既存のトークンは置き換える(古いトークンは使えなくなる)。 */
export async function issueMcpToken(
  db: D1Database,
  userEmail: string,
): Promise<string> {
  const token = TOKEN_PREFIX + toHex(crypto.getRandomValues(new Uint8Array(32)));
  await db
    .prepare(
      `INSERT INTO mcp_tokens (user_email, token_hash) VALUES (?, ?)
       ON CONFLICT(user_email) DO UPDATE SET token_hash = excluded.token_hash, created_at = datetime('now')`,
    )
    .bind(userEmail, await hashToken(token))
    .run();
  return token;
}

export async function revokeMcpToken(
  db: D1Database,
  userEmail: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM mcp_tokens WHERE user_email = ?")
    .bind(userEmail)
    .run();
}

/** 発行済みなら発行日時を返す。 */
export async function getMcpTokenCreatedAt(
  db: D1Database,
  userEmail: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT created_at FROM mcp_tokens WHERE user_email = ?")
    .bind(userEmail)
    .first<{ created_at: string }>();
  return row?.created_at ?? null;
}

/** トークンの持ち主のメールアドレスを返す。無効なトークンならnull。 */
export async function findUserByMcpToken(
  db: D1Database,
  token: string,
): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const row = await db
    .prepare("SELECT user_email FROM mcp_tokens WHERE token_hash = ?")
    .bind(await hashToken(token))
    .first<{ user_email: string }>();
  return row?.user_email ?? null;
}
