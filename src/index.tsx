import { Hono } from "hono";
import { requireUser } from "./lib/auth";
import { budgetRoute } from "./routes/budget";
import { itemsRoute } from "./routes/items";

const app = new Hono<{ Bindings: Env; Variables: { userEmail: string } }>();

app.get("/healthz", (c) => c.text("ok"));
app.use("*", requireUser);
app.route("/", itemsRoute);
app.route("/", budgetRoute);

export default app;
