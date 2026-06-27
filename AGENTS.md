# Agent Guidance

## Local Setup

Run `npm ci` before local verification. The Worker uses Wrangler-generated runtime types from `src/worker-configuration.d.ts`; rerun `npx wrangler types src/worker-configuration.d.ts` after changing `wrangler.toml`.

Initialize the local D1 schema for manual development with:

```bash
npm run db:migrate
```

Start the local Worker with:

```bash
npm run dev
```

## Verification

Use the smallest focused check while developing, then run the aggregate gate before review:

```bash
npm run check
```

`npm run check` runs formatting, ESLint, TypeScript, Worker/D1 tests with coverage thresholds, and the browser E2E journey suite. Do not submit changes that bypass this command unless the task includes an explicit waiver.

Focused commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:unit
npm run test:e2e
```

## Acceptance Specs

Feature specs live in `spec/*.feature`. When behavior changes, update the Gherkin scenario first or alongside the code and keep automated tests aligned with the scenario.

Test current Worker behavior through HTTP routes. Prefer the Cloudflare Vitest worker pool with local D1 bindings over hand-rolled database fakes or deployed Cloudflare resources.

## API Conventions

Model links as REST resources under `/api/links`. Use method semantics directly, preserve idempotent behavior where relevant, and return consistent JSON error bodies with appropriate status codes.
