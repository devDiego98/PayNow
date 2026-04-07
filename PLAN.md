# PayGate Aggregator — implementation plan

This document orders the work to complete the project described in [README.md](./README.md). Follow the steps in sequence unless noted; later steps depend on earlier foundations.

---

## Phase 0 — Repository hygiene _(done)_

1. **Consolidate root prototypes** — Move or merge logic from loose files at the repo root (`Payment.service.ts`, `Stripe.provider.ts`, `Swagger.ts`, `Payment.service.test`, `Payment.routes.test`) into the paths under `src/` and `tests/` described in the README, then delete the duplicates so a single source of truth exists.
2. **Environment loading** — Add `dotenv` (or equivalent) so local `npm run dev` loads `.env` without relying only on the shell; keep Docker using `environment` / `env_file` as today.
3. **Linting** — Add `.eslintrc.cjs` / Prettier config aligned with `package.json` scripts so `npm run lint` and CI pass consistently.

**Completed:** Prototypes merged into `src/services/core/payment.service.ts`, `src/services/providers/stripe.provider.ts`, `src/config/swagger.ts`; provider types, `BaseProvider`, `ProviderFactory.get`, PayPal/Mercado Pago stubs, and payment route wiring (auth, idempotency, Zod validation) are in place; integration tests live in `tests/integration/payment.routes.test.ts`. Root duplicates removed. `dotenv` loads in `src/server.ts` and `tests/setup.ts`. ESLint + Prettier configs added (`tsconfig.eslint.json` for type-aware lint).

---

## Phase 1 — Data layer and infrastructure

4. **Prisma schema** — Expand `prisma/schema.prisma` with models for payments, transactions (ledger), refunds, webhook events, and API keys / clients as needed for auth and auditing. Add indexes for common queries (e.g. idempotency key, provider transaction id).
5. **Migrations** — Run `prisma migrate dev` for the initial schema; commit migration SQL under `prisma/migrations/`.
6. **Redis client** — Add a small `src/config/redis.ts` (or similar) wrapping `ioredis`, with connection lifecycle tied to `server.ts` shutdown for tests and production.
7. **Docker production image** — Turn `docker/Dockerfile` into a proper multi-stage build: install deps, `prisma generate`, `npm run build`, run migrations or document migrate-on-start, expose port 3000.
8. **Test database** — Wire `docker/docker-compose.test.yml` (and env vars) so integration tests use a dedicated Postgres + Redis; update `tests/setup.ts` / `tests/teardown.ts` to connect, migrate, and clean up.

---

## Phase 2 — Domain types and validation

9. **Types** — Flesh out `src/types/payment.types.ts`, `provider.types.ts`, and `api.types.ts` to match the normalized API in the README (create payment, refund, webhook event shape).
10. **Zod schemas** — Complete `src/utils/validator.ts` (and route-level schemas) for all request bodies and query params; connect `validation.middleware.ts` to those schemas.
11. **Errors** — Standardize HTTP mapping in `src/utils/errors.ts` and `error.middleware.ts` (codes, validation vs provider vs internal).

---

## Phase 3 — Provider abstraction

12. **`IPaymentProvider`** — Define the full interface in `base.provider.ts`: charge, refund, get transaction, and any webhook verification hooks required by all three providers.
13. **Provider factory** — In `provider.factory.ts`, register `StripeProvider`, `PayPalProvider`, and `MercadoPagoProvider` with real constructors reading from `loadEnv()`.
14. **Stripe** — Implement `stripe.provider.ts` using the Stripe SDK; map amounts/currencies and errors to normalized types.
15. **PayPal** — Implement `paypal.provider.ts` using the chosen PayPal API (note: `paypal-rest-sdk` is deprecated — migrate to the recommended server SDK if the README stack is updated).
16. **Mercado Pago** — Implement `mercadopago.provider.ts` using the official SDK; handle regional currencies and idempotency expectations.
17. **Mappers** — Implement `src/utils/mapper.ts` and `src/utils/crypto.ts` (signatures: Stripe, PayPal, Mercado Pago).

---

## Phase 4 — Core services

18. **Idempotency** — Implement `idempotency.service.ts`: read/write `Idempotency-Key` in Redis with 24h TTL; return cached response for duplicates.
19. **Retry** — Implement `retry.service.ts` with exponential backoff and a clear policy for retryable vs non-retryable provider errors.
20. **Payment orchestration** — Implement `payment.service.ts`: validate input, call idempotency, select provider via factory, apply retry policy, write to transaction ledger, persist payment record.
21. **Refunds** — Implement `refund.service.ts` with partial/full rules and ledger updates.
22. **Webhooks** — Implement `webhook.service.ts`: verify signatures, map provider payloads to a normalized `PayGateEvent`, update DB state, optional future fan-out to client URLs (see roadmap).

---

## Phase 5 — HTTP layer

23. **Middleware** — Replace stubs in `auth.middleware.ts` (API keys), `idempotency.middleware.ts`, `ratelimit.middleware.ts` (Redis-backed limits), and wire order: auth → rate limit → idempotency (where applicable) → validation → controller.
24. **Controllers** — Implement `payment.controller.ts`, `refund.controller.ts`, `webhook.controller.ts`, `health.controller.ts` (health should check DB + Redis readiness).
25. **Routes** — Align paths and methods with README: `/api/v1/payments`, `/api/v1/refunds`, `/api/v1/webhooks/:provider`, `/health`. For Stripe webhooks, use raw body where required for signature verification (separate route or conditional parser).
26. **Models** — Move DB access into `src/models/*.ts` helpers called from services to keep controllers thin.

---

## Phase 6 — API documentation

27. **JSDoc / OpenAPI** — Add `@openapi` (or YAML fragments) on routes so `swagger-jsdoc` in `src/config/swagger.ts` documents every endpoint; confirm `/api/docs` works from both `ts-node-dev` and compiled `dist/` (adjust `apis` globs if production build omits `src/`).
28. **Docs** — Expand `docs/architecture.md` and `docs/providers.md` with decisions and provider quirks.

---

## Phase 7 — Testing (pyramid)

29. **Unit tests** — Replace placeholders in `tests/unit/` with mocks for DB, Redis, and SDKs; cover `PaymentService`, `RefundService`, `RetryService`, `IdempotencyService`, and each provider’s mapping logic.
30. **Integration tests** — Implement `tests/integration/*.test.ts` with Supertest against `createApp()`, real test DB/Redis, and HTTP mocks (`nock`) for provider APIs.
31. **E2E tests** — Implement `tests/e2e/` against sandbox credentials and full stack (document required env in `.env.example`).
32. **Coverage gates** — Re-enable Jest `coverageThreshold` (≥80% statements/branches/functions/lines per README) in `jest.config.js` once the suite is meaningful; fix CI to run `test:coverage` on PRs.

---

## Phase 8 — Operations and CI/CD

33. **Scripts** — Implement `scripts/seed.sh` with `prisma db seed` and a `prisma/seed.ts` for local dev data.
34. **GitHub Actions** — Harden `.github/workflows/ci.yml`: cache, `npm ci`, `prisma generate`, lint, type-check, unit + integration tests (with service containers or compose). Implement `.github/workflows/cd.yml` for your registry and deployment target.
35. **Deployment** — Document production env vars, secrets, migration strategy, and health checks in README or a short runbook.

---

## Phase 9 — Roadmap (optional, post-MVP)

36. **Webhook delivery** — Outbound retries to merchant URLs.
37. **Additional providers / features** — As listed in README Roadmap (Adyen, split payments, smart routing, dashboard, gRPC, multi-tenancy).

---

## Quick reference: order of execution

| Order | Focus |
|------|--------|
| 0 | Hygiene, dotenv, ESLint |
| 1 | Prisma + Redis + Docker + test infra |
| 2 | Types + Zod + errors |
| 3 | Providers + factory + mappers + crypto |
| 4 | Idempotency + retry + payment + refund + webhook services |
| 5 | Middleware + controllers + routes + models + health |
| 6 | Swagger + docs |
| 7 | Unit → integration → E2E + coverage |
| 8 | Seed + CI/CD + deployment docs |
| 9 | Roadmap features |

This sequence minimizes rework: database and Redis first, then contracts (types/validation), then providers, then orchestration, then HTTP and tests, then hardening and delivery.
