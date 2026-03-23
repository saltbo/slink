import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const redirect = new Hono<{ Bindings: Bindings }>();

redirect.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const result = await c.env.DB.prepare(
    "UPDATE links SET clicks = clicks + 1 WHERE slug = ? RETURNING url",
  )
    .bind(slug)
    .first<{ url: string }>();

  if (!result) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.redirect(result.url, 302);
});

export { redirect };
