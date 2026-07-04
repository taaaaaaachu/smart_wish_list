import { Hono } from "hono";
import { budgetRoute } from "./routes/budget";
import { itemsRoute } from "./routes/items";

const app = new Hono<{ Bindings: Env }>();

app.get("/healthz", (c) => c.text("ok"));
app.route("/", itemsRoute);
app.route("/", budgetRoute);

export default app;
