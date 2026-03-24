import { Hono } from "hono";
import api from "./api";
import redirect from "./redirect";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api", api);

// TODO: Mount management page (src/pages.tsx)

app.route("/", redirect);

export default app;
