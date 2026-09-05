# Slink

Slink is a small URL shortener built as a Cloudflare Worker with Hono and D1.
It serves a web dashboard, JSON API routes for managing links, short-link
redirects, per-link stats, and a lightweight `/health` endpoint.

## Local Development

Use Node.js 24 and npm. Install from the committed lockfile so local
dependencies match CI:

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

## Checks

GitHub Actions runs the same checks on pull requests and on pushes to `main`.
Run them locally before committing changes:

```bash
npm run lint
npm run typecheck
```

## Health Check

See [docs/health-check.md](docs/health-check.md) for the local health check
request and expected response.
