import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const redirect = new Hono<{ Bindings: Bindings }>();

redirect.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  if (!slug) {
    return c.notFound();
  }

  const link = await c.env.DB.prepare("SELECT url, expires_at FROM links WHERE slug = ?")
    .bind(slug)
    .first<{ url: string; expires_at: string | null }>();

  if (!link) {
    return c.json({ error: "Link not found" }, 404);
  }

  if (link.expires_at && link.expires_at <= new Date().toISOString()) {
    return c.json({ error: "This link has expired" }, 410);
  }

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "UPDATE links SET clicks = clicks + 1, updated_at = datetime('now') WHERE slug = ?"
    )
      .bind(slug)
      .run()
  );

  return c.redirect(link.url, 302);
});

export default redirect;
