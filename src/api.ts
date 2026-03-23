import { Hono } from "hono";
import { requireAuth } from "./auth";
import type { Env } from "./auth";

const api = new Hono<Env>();

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

api.use("/links/*", requireAuth);
api.use("/links", requireAuth);

api.post("/links", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ url?: string; slug?: string }>();

  if (!body.url || !/^https?:\/\//.test(body.url)) {
    return c.json({ error: "Invalid URL: must start with http:// or https://" }, 400);
  }

  const slug = body.slug || generateSlug();

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO links (user_id, slug, url) VALUES (?, ?, ?) RETURNING id, slug, url, clicks, created_at",
    )
      .bind(userId, slug, body.url)
      .first();

    return c.json(result, 201);
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return c.json({ error: "Slug already exists" }, 409);
    }
    throw e;
  }
});

api.get("/links", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, slug, url, clicks, created_at FROM links WHERE user_id = ? ORDER BY created_at DESC",
  )
    .bind(userId)
    .all();

  return c.json({ links: results });
});

api.get("/links/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "SELECT id, slug, url, clicks, created_at FROM links WHERE id = ? AND user_id = ?",
  )
    .bind(id, userId)
    .first();

  if (!result) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(result);
});

api.delete("/links/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const result = await c.env.DB.prepare(
    "DELETE FROM links WHERE id = ? AND user_id = ? RETURNING id",
  )
    .bind(id, userId)
    .first();

  if (!result) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

export { api };
