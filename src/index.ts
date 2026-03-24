import { Hono } from "hono";
import api from "./api";
import { DashboardPage } from "./pages";
import redirect from "./redirect";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api", api);

app.get("/", (c) => c.html(DashboardPage()));

app.route("/", redirect);

export default app;
