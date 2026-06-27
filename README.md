# Slink

Slink is a Cloudflare Workers URL shortener built with Hono and D1.

## Setup

```bash
npm ci
npm run db:migrate
```

Run the Worker locally:

```bash
npm run dev
```

## Verification

Run the full local quality gate before submitting changes:

```bash
npm run check
```

The gate checks formatting, lint, TypeScript, Worker/D1 behavior tests with coverage thresholds, and browser E2E journeys. Focused commands are available as `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, and `npm run test:e2e`.

## API

| Method   | Path                   | Behavior                                                                |
| -------- | ---------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/health`              | Returns Worker health.                                                  |
| `POST`   | `/api/links`           | Creates a short link from `url`, optional `slug`, and optional expiry.  |
| `GET`    | `/api/links`           | Lists links with `page` and `per_page` pagination.                      |
| `GET`    | `/api/links/:id`       | Returns a single link or `404`.                                         |
| `GET`    | `/api/links/:id/stats` | Returns click and expiration stats or `404`.                            |
| `PUT`    | `/api/links/:id`       | Updates a link URL and/or slug.                                         |
| `DELETE` | `/api/links/:id`       | Deletes a link.                                                         |
| `GET`    | `/:slug`               | Redirects active links, returns `404` when missing, `410` when expired. |

Behavior scenarios are documented in `spec/url-shortener.feature`.
