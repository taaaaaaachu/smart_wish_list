import { Hono } from "hono";
import { itemsRoute } from "./routes/items";

const app = new Hono<{ Bindings: Env }>();

app.get("/healthz", (c) => c.text("ok"));
app.route("/", itemsRoute);

export default app;
