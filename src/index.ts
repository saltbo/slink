import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/health", (c) => c.json({ status: "ok" }));

// TODO: Mount API routes (src/api.ts)
// TODO: Mount redirect handler (src/redirect.ts)
// TODO: Mount management page (src/pages.tsx)

export default app;
