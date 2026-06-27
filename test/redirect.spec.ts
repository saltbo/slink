import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import app from "../src/index";

async function createLink(slug: string, expiresAt: string | null = null): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO links (slug, url, expires_at) VALUES (?, ?, ?) RETURNING id"
  )
    .bind(slug, "https://example.com/target", expiresAt)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Failed to create test link");
  }

  return result.id;
}

describe("redirects", () => {
  it("redirects active links and records clicks", async () => {
    const id = await createLink("active-link");
    const ctx = createExecutionContext();

    const response = await app.fetch(
      new Request("https://slink.test/active-link", { redirect: "manual" }),
      env,
      ctx
    );
    await waitOnExecutionContext(ctx);

    const stats = await env.DB.prepare("SELECT clicks FROM links WHERE id = ?")
      .bind(id)
      .first<{ clicks: number }>();

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/target");
    expect(stats?.clicks).toBe(1);
  });

  it("returns not found for unknown slugs", async () => {
    const response = await app.fetch(new Request("https://slink.test/missing"), env);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Link not found" });
  });

  it("rejects expired links without recording a click", async () => {
    const id = await createLink("expired-link", "2000-01-01T00:00:00.000Z");

    const response = await app.fetch(new Request("https://slink.test/expired-link"), env);
    const stats = await env.DB.prepare("SELECT clicks FROM links WHERE id = ?")
      .bind(id)
      .first<{ clicks: number }>();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: "This link has expired" });
    expect(stats?.clicks).toBe(0);
  });
});
