import { Hono } from "hono";
import api from "./api";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api", api);

// TODO: Mount redirect handler (src/redirect.ts)
// TODO: Mount management page (src/pages.tsx)

export default app;
