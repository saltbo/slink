# Slink

Slink is a small URL shortener built as a Cloudflare Worker with Hono and D1.
It serves a web dashboard, JSON API routes for managing links, short-link
redirects, per-link stats, and a lightweight `/health` endpoint.

## Local Development

Install dependencies:

```bash
npm ci --legacy-peer-deps
```

Start Wrangler's local development server:

```bash
npm run dev
```

Run the local D1 schema migration when the links table needs to be created:

```bash
npm run db:migrate
```

## Health Check

See [docs/health-check.md](docs/health-check.md) for the local health check
request and expected response.
