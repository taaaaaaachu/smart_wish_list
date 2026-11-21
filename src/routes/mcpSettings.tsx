import { Hono } from "hono";
import { Layout } from "../components/Layout";
import {
  getMcpTokenCreatedAt,
  issueMcpToken,
  revokeMcpToken,
} from "../lib/mcpToken";

export const mcpSettingsRoute = new Hono<{
  Bindings: Env;
  Variables: { userEmail: string };
}>();

function McpSettingsPage({
  mcpUrl,
  createdAt,
  newToken,
}: {
  mcpUrl: string;
  createdAt: string | null;
  newToken?: string;
}) {
  return (
    <Layout title="MCP連携">
      <h1>MCP連携</h1>
      <p>
        MCPクライアント(Museなど)から、このリストを読み書きできます。接続先URLは{" "}
        <code>{mcpUrl}</code> で、ヘッダー{" "}
        <code>Authorization: Bearer &lt;トークン&gt;</code> を付けて接続します。
      </p>
      {newToken && (
        <div class="token-box">
          <p>
            新しいトークンです。この画面を離れると二度と表示されないので、今すぐコピーしてください。
          </p>
          <input type="text" readonly value={newToken} aria-label="発行したトークン" />
        </div>
      )}
      <p>
        {createdAt
          ? `トークン発行済み(${createdAt} UTC)`
          : "トークンはまだ発行されていません。"}
      </p>
      <form method="post" action="/settings/mcp/token">
        <button type="submit">
          {createdAt ? "トークンを再発行(古いトークンは無効になります)" : "トークンを発行"}
        </button>
      </form>
      {createdAt && (
        <form method="post" action="/settings/mcp/token/delete">
          <button type="submit">トークンを無効にする</button>
        </form>
      )}
    </Layout>
  );
}

mcpSettingsRoute.get("/settings/mcp", async (c) => {
  const createdAt = await getMcpTokenCreatedAt(c.env.DB, c.get("userEmail"));
  return c.html(
    <McpSettingsPage mcpUrl={new URL("/mcp", c.req.url).href} createdAt={createdAt} />,
  );
});

// トークンはリダイレクト先に渡せない(URLに残る)ので、POSTの応答でそのまま表示する
mcpSettingsRoute.post("/settings/mcp/token", async (c) => {
  const userEmail = c.get("userEmail");
  const newToken = await issueMcpToken(c.env.DB, userEmail);
  const createdAt = await getMcpTokenCreatedAt(c.env.DB, userEmail);
  c.header("Cache-Control", "no-store");
  return c.html(
    <McpSettingsPage
      mcpUrl={new URL("/mcp", c.req.url).href}
      createdAt={createdAt}
      newToken={newToken}
    />,
  );
});

mcpSettingsRoute.post("/settings/mcp/token/delete", async (c) => {
  await revokeMcpToken(c.env.DB, c.get("userEmail"));
  return c.redirect("/settings/mcp");
});
