import { env } from "cloudflare:workers";
import { beforeEach } from "vitest";

beforeEach(async () => {
  await env.DB.exec("DROP TABLE IF EXISTS links;");
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug)").run();
});
