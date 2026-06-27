import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../src/index";

async function request(path: string, init?: RequestInit): Promise<Response> {
  return app.fetch(new Request(`https://slink.test${path}`, init), env);
}

async function createLink(body: Record<string, unknown>): Promise<Response> {
  return request("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("links API", () => {
  it("reports health", async () => {
    const response = await request("/health");

    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.status).toBe(200);
  });

  it("renders dashboard and stats pages", async () => {
    const dashboard = await request("/");
    expect(dashboard.status).toBe(200);
    await expect(dashboard.text()).resolves.toContain("Slink");

    const stats = await request("/stats/1");
    expect(stats.status).toBe(200);
    await expect(stats.text()).resolves.toContain("Link Stats");
  });

  it("creates links with valid URLs and custom slugs", async () => {
    const response = await createLink({ url: "https://example.com/articles/1", slug: "article-1" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      slug: "article-1",
      url: "https://example.com/articles/1",
      clicks: 0,
      expires_at: null,
    });
  });

  it("creates links with generated slugs", async () => {
    const response = await createLink({ url: "https://example.com/generated" });
    const body = await response.json<{ slug: string; url: string }>();

    expect(response.status).toBe(201);
    expect(body.url).toBe("https://example.com/generated");
    expect(body.slug).toMatch(/^[a-zA-Z0-9_-]{7}$/);
  });

  it("rejects missing URLs, invalid URLs, and invalid slugs", async () => {
    const missingUrl = await createLink({ slug: "missing-url" });
    expect(missingUrl.status).toBe(400);
    await expect(missingUrl.json()).resolves.toEqual({ error: "Invalid or missing url" });

    const invalidUrl = await createLink({ url: "ftp://example.com", slug: "valid-slug" });
    expect(invalidUrl.status).toBe(400);
    await expect(invalidUrl.json()).resolves.toEqual({ error: "Invalid or missing url" });

    for (const slug of ["no", "contains_underscore", "contains space"]) {
      const invalidSlug = await createLink({ url: "https://example.com", slug });
      expect(invalidSlug.status).toBe(400);
      await expect(invalidSlug.json()).resolves.toEqual({
        error: "Slug must be 3-32 alphanumeric or hyphen characters",
      });
    }
  });

  it("returns conflict for duplicate slugs", async () => {
    expect((await createLink({ url: "https://example.com/one", slug: "same-slug" })).status).toBe(
      201
    );

    const duplicate = await createLink({ url: "https://example.com/two", slug: "same-slug" });

    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({ error: "Slug already exists" });
  });

  it("lists links with pagination metadata", async () => {
    await createLink({ url: "https://example.com/one", slug: "link-one" });
    await createLink({ url: "https://example.com/two", slug: "link-two" });

    const response = await request("/api/links?page=1&per_page=1");
    const body = await response.json<{
      links: Array<{ slug: string }>;
      total: number;
      page: number;
      per_page: number;
    }>();

    expect(response.status).toBe(200);
    expect(body.links).toHaveLength(1);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.per_page).toBe(1);
  });

  it("clamps pagination inputs to supported bounds", async () => {
    const response = await request("/api/links?page=0&per_page=999");
    const body = await response.json<{
      links: unknown[];
      total: number;
      page: number;
      per_page: number;
    }>();

    expect(response.status).toBe(200);
    expect(body.links).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.per_page).toBe(100);
  });

  it("returns stats and missing-link responses", async () => {
    const created = await createLink({ url: "https://example.com/stats", slug: "stats-link" });
    const link = await created.json<{ id: number }>();

    const stats = await request(`/api/links/${link.id}/stats`);
    expect(stats.status).toBe(200);
    await expect(stats.json()).resolves.toMatchObject({
      id: link.id,
      slug: "stats-link",
      url: "https://example.com/stats",
      clicks: 0,
      is_expired: false,
    });

    const expiredCreated = await createLink({
      url: "https://example.com/expired",
      slug: "expired-stats",
      expires_at: "2000-01-01T00:00:00.000Z",
    });
    const expiredLink = await expiredCreated.json<{ id: number }>();
    const expiredStats = await request(`/api/links/${expiredLink.id}/stats`);
    expect(expiredStats.status).toBe(200);
    await expect(expiredStats.json()).resolves.toMatchObject({
      expires_at: "2000-01-01T00:00:00.000Z",
      is_expired: true,
    });

    expect((await request("/api/links/999")).status).toBe(404);
    expect((await request("/api/links/999/stats")).status).toBe(404);
  });

  it("updates and deletes links", async () => {
    const first = await createLink({ url: "https://example.com/first", slug: "first-link" });
    const second = await createLink({ url: "https://example.com/second", slug: "second-link" });
    const firstLink = await first.json<{ id: number }>();
    const secondLink = await second.json<{ id: number }>();

    const missingBody = await request(`/api/links/${firstLink.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missingBody.status).toBe(400);

    const invalidUrl = await request(`/api/links/${firstLink.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "ftp://example.com" }),
    });
    expect(invalidUrl.status).toBe(400);

    const invalidSlug = await request(`/api/links/${firstLink.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "no" }),
    });
    expect(invalidSlug.status).toBe(400);

    const missingLink = await request("/api/links/999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/missing" }),
    });
    expect(missingLink.status).toBe(404);

    const conflict = await request(`/api/links/${firstLink.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "second-link" }),
    });
    expect(conflict.status).toBe(409);

    const updated = await request(`/api/links/${firstLink.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/updated", slug: "updated-link" }),
    });
    expect(updated.status).toBe(200);
    const updatedBody = await updated.json<{ id: number; slug: string; url: string }>();
    expect(updatedBody).toMatchObject({
      slug: "updated-link",
      url: "https://example.com/updated",
    });

    const fetched = await request(`/api/links/${updatedBody.id}`);
    expect(fetched.status).toBe(200);
    await expect(fetched.json()).resolves.toMatchObject({
      slug: "updated-link",
      url: "https://example.com/updated",
    });

    expect((await request("/api/links/999", { method: "DELETE" })).status).toBe(404);

    const deleted = await request(`/api/links/${secondLink.id}`, { method: "DELETE" });
    expect(deleted.status).toBe(204);
    expect((await request(`/api/links/${secondLink.id}`)).status).toBe(404);
  });
});
