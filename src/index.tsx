import { Hono } from "hono";
import { requireUser } from "./lib/auth";
import { purgeExpiredOAuthData } from "./lib/oauth";
import { mcpRoutes } from "./mcp";
import { budgetRoute } from "./routes/budget";
import { itemsRoute } from "./routes/items";
import { mcpSettingsRoute } from "./routes/mcpSettings";
import { oauthRoutes, wellKnownRoutes } from "./routes/oauth";

export const app = new Hono<{ Bindings: Env; Variables: { userEmail: string } }>();

app.get("/healthz", (c) => c.text("ok"));
// エージェント向け。requireUser(Cloudflare AccessのJWT)より前に置く。/oauth/authorize 以外は
// AccessをBypassするパスなので、トークン・認可コードだけで認証する(/oauth/authorize は自分でrequireUserを通す)
app.route("/mcp", mcpRoutes);
app.route("/oauth", oauthRoutes);
app.route("/.well-known", wellKnownRoutes);
app.use("*", requireUser);
app.route("/", itemsRoute);
app.route("/", budgetRoute);
app.route("/", mcpSettingsRoute);

export default {
  fetch: app.fetch,
  // 期限切れの認可コード・90日使われていない接続・未使用のDCR登録の掃除(日次、wrangler.jsoncのtriggers)
  async scheduled(_controller, env) {
    await purgeExpiredOAuthData(env.DB);
  },
} satisfies ExportedHandler<Env>;
