# Health Check

The local health check endpoint confirms that the Worker process is serving
requests. It is intentionally lightweight and does not query the D1 database.

## Scope

`/health` checks that the Worker can serve requests. It does not query D1 or
prove database readiness.

## Start Locally

Install dependencies, then start Wrangler's local development server:

```bash
npm ci --legacy-peer-deps
npm run dev
```

By default, Wrangler serves this project at `http://localhost:8787`.

For the standard local checks contributors should run before committing, see
[README Checks](../README.md#checks).

## Request

```bash
curl -i http://127.0.0.1:8787/health
```

## Response

The endpoint returns `200 OK`, sets `Cache-Control: no-store`, and returns this
JSON body:

```text
{"status":"ok","service":"slink"}
```

Verified locally with:

```bash
npm run dev -- --port 8787
curl -i http://127.0.0.1:8787/health
```

Observed response:

```http
HTTP/1.1 200 OK
Content-Length: 33
Content-Type: application/json
Cache-Control: no-store

{"status":"ok","service":"slink"}
```
