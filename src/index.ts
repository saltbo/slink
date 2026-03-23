import { Hono } from "hono";
import { auth } from "./auth";
import { api } from "./api";
import { pages } from "./pages";
import { redirect } from "./redirect";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", auth);
app.route("/api", api);
app.route("/", pages);
app.route("/", redirect);

export default app;
