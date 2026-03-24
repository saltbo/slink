import { Hono } from "hono";
import { nanoid } from "nanoid";

type Bindings = {
  DB: D1Database;
};

type Link = {
  id: number;
  slug: string;
  url: string;
  clicks: number;
  created_at: string;
  updated_at: string;
};

const SLUG_PATTERN = /^[a-zA-Z0-9-]{3,32}$/;

function isValidUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

const api = new Hono<{ Bindings: Bindings }>();

// POST /links — Create a short link
api.post("/links", async (c) => {
  const body = await c.req.json<{ url?: string; slug?: string }>();

  if (!body.url || !isValidUrl(body.url)) {
    return c.json({ error: "Invalid or missing url" }, 400);
  }

  const slug = body.slug ?? nanoid(7);

  if (body.slug && !SLUG_PATTERN.test(body.slug)) {
    return c.json({ error: "Slug must be 3-32 alphanumeric or hyphen characters" }, 400);
  }

  const result = await c.env.DB.prepare("INSERT INTO links (slug, url) VALUES (?, ?) RETURNING *")
    .bind(slug, body.url)
    .first<Link>();

  if (!result) {
    return c.json({ error: "Slug already exists" }, 409);
  }

  return c.json(result, 201);
});

// GET /links — List all links
api.get("/links", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = Math.max(1, Math.min(100, Number(c.req.query("per_page") ?? 20)));
  const offset = (page - 1) * perPage;

  const countResult = await c.env.DB.prepare("SELECT COUNT(*) as total FROM links").first<{
    total: number;
  }>();

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM links ORDER BY created_at DESC LIMIT ? OFFSET ?"
  )
    .bind(perPage, offset)
    .all<Link>();

  return c.json({
    links: results,
    total: countResult?.total ?? 0,
    page,
    per_page: perPage,
  });
});

// GET /links/:id — Get a single link
api.get("/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const link = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?").bind(id).first<Link>();

  if (!link) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(link);
});

// PUT /links/:id — Update a link
api.put("/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ url?: string; slug?: string }>();

  if (!body.url && !body.slug) {
    return c.json({ error: "At least one of url or slug is required" }, 400);
  }

  if (body.url && !isValidUrl(body.url)) {
    return c.json({ error: "Invalid url" }, 400);
  }

  if (body.slug && !SLUG_PATTERN.test(body.slug)) {
    return c.json({ error: "Slug must be 3-32 alphanumeric or hyphen characters" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT * FROM links WHERE id = ?")
    .bind(id)
    .first<Link>();

  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const newUrl = body.url ?? existing.url;
  const newSlug = body.slug ?? existing.slug;

  if (body.slug && body.slug !== existing.slug) {
    const conflict = await c.env.DB.prepare("SELECT id FROM links WHERE slug = ?")
      .bind(body.slug)
      .first();
    if (conflict) {
      return c.json({ error: "Slug already exists" }, 409);
    }
  }

  const updated = await c.env.DB.prepare(
    "UPDATE links SET url = ?, slug = ?, updated_at = datetime('now') WHERE id = ? RETURNING *"
  )
    .bind(newUrl, newSlug, id)
    .first<Link>();

  return c.json(updated);
});

// DELETE /links/:id — Delete a link
api.delete("/links/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const existing = await c.env.DB.prepare("SELECT id FROM links WHERE id = ?").bind(id).first();

  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM links WHERE id = ?").bind(id).run();

  return c.body(null, 204);
});

export default api;
