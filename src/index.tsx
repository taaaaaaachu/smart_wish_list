import { Hono } from "hono";
import { requireUser } from "./lib/auth";
import { mcpRoute } from "./mcp";
import { budgetRoute } from "./routes/budget";
import { itemsRoute } from "./routes/items";
import { mcpSettingsRoute } from "./routes/mcpSettings";

const app = new Hono<{ Bindings: Env; Variables: { userEmail: string } }>();

app.get("/healthz", (c) => c.text("ok"));
// requireUser(Cloudflare AccessのJWT)より前に置く。/mcpは個人アクセストークンで認証する
app.route("/mcp", mcpRoute);
app.use("*", requireUser);
app.route("/", itemsRoute);
app.route("/", budgetRoute);
app.route("/", mcpSettingsRoute);

export default app;
