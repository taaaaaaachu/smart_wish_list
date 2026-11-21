import { Hono } from "hono";
import { Layout } from "../components/Layout";
import {
  AGENT_NAME_MAX,
  issueManualConnection,
  listAgentConnections,
  normalizeAgentName,
  revokeAgentConnection,
  type AgentConnectionSummary,
} from "../lib/agentConnections";

/** 本人のエージェント接続の一覧・手動発行・取り消し。画面向けなのでAccessの内側(requireUser)に置く */
export const mcpSettingsRoute = new Hono<{
  Bindings: Env;
  Variables: { userEmail: string };
}>();

const fmt = (iso: string) => new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

function McpSettingsPage({
  mcpUrl,
  connections,
  issued,
  error,
}: {
  mcpUrl: string;
  connections: AgentConnectionSummary[];
  issued?: { name: string; token: string };
  error?: string;
}) {
  return (
    <Layout title="エージェント接続">
      <h1>エージェント接続(MCP)</h1>
      <p>
        AIエージェントからMCPでこのリストを操作できます。接続先URLは <code>{mcpUrl}</code> です。
      </p>
      <ul>
        <li>OAuthに対応したエージェント: URLを登録するだけで、ブラウザに許可画面が開きます。</li>
        <li>
          OAuthに対応していないエージェント(Museなど): 下でトークンを発行し、
          <code>Authorization: Bearer &lt;トークン&gt;</code> ヘッダーとして登録します。
        </li>
        <li>90日間使われなかった接続は自動で失効します。</li>
      </ul>

      {issued && (
        <div class="token-box">
          <p>
            「{issued.name}」のトークンです。この画面を離れると二度と表示されないので、今すぐコピーしてください。
          </p>
          <input type="text" readonly value={issued.token} aria-label="発行したトークン" />
        </div>
      )}

      <h2>トークンを発行</h2>
      {error && <p class="error">{error}</p>}
      <form method="post" action="/settings/mcp/connections">
        <label>
          接続の名前(一覧での表示用)
          <input name="name" required maxlength={AGENT_NAME_MAX} placeholder="例: Muse" />
        </label>
        <button type="submit">発行</button>
      </form>

      <h2>接続一覧</h2>
      {connections.length === 0 ? (
        <p>接続はありません。</p>
      ) : (
        <ul class="connection-list">
          {connections.map((conn) => (
            <li>
              <strong>{conn.name}</strong>({conn.origin})<br />
              作成 {fmt(conn.createdAt)} / 最終利用 {fmt(conn.lastUsedAt)}
              <form method="post" action={`/settings/mcp/connections/${conn.id}/delete`}>
                <button type="submit">取り消す</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}

mcpSettingsRoute.get("/settings/mcp", async (c) => {
  const connections = await listAgentConnections(c.env.DB, c.get("userEmail"));
  return c.html(<McpSettingsPage mcpUrl={new URL("/mcp", c.req.url).href} connections={connections} />);
});

// トークンはリダイレクト先に渡せない(URLに残る)ので、POSTの応答でそのまま表示する
mcpSettingsRoute.post("/settings/mcp/connections", async (c) => {
  const userEmail = c.get("userEmail");
  const raw = await c.req.parseBody();
  const name = normalizeAgentName(raw.name);
  const mcpUrl = new URL("/mcp", c.req.url).href;
  if (!name) {
    const connections = await listAgentConnections(c.env.DB, userEmail);
    return c.html(
      <McpSettingsPage
        mcpUrl={mcpUrl}
        connections={connections}
        error={`名前は1〜${AGENT_NAME_MAX}文字で入力してください。`}
      />,
      400,
    );
  }
  const { token } = await issueManualConnection(c.env.DB, userEmail, name);
  const connections = await listAgentConnections(c.env.DB, userEmail);
  c.header("Cache-Control", "no-store");
  return c.html(<McpSettingsPage mcpUrl={mcpUrl} connections={connections} issued={{ name, token }} />);
});

mcpSettingsRoute.post("/settings/mcp/connections/:id/delete", async (c) => {
  await revokeAgentConnection(c.env.DB, c.req.param("id"), c.get("userEmail"));
  return c.redirect("/settings/mcp");
});
