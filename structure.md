# 💳 PayGate Aggregator

> **A unified Payment Gateway Aggregation API** — integrate once, pay everywhere.  
> Supports Stripe, PayPal, and Mercado Pago under a single, normalized REST interface with Swagger docs, full test coverage, and production-ready architecture.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing Strategy](#testing-strategy)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Overview

**PayGate Aggregator** solves one of the biggest pain points for e-commerce platforms in Latin America and globally: **having to integrate multiple payment providers separately**.

Instead of writing Stripe logic, PayPal logic, and Mercado Pago logic in your app, you call **one API**. PayGate normalizes request/response formats, handles provider-specific quirks, retries failed transactions, stores transaction history, and routes webhook events — all transparently.

### Who is this for?

| Customer | Use Case |
|----------|----------|
| E-commerce platforms | Offer multiple payment options without multi-integration overhead |
| Marketplaces | Route payments to the cheapest/most available provider |
| SaaS companies | Bill customers across different regions and preferred methods |
| Fintech startups | White-label the aggregator as their payments backbone |

---

## Features

- ✅ **Unified API** — one endpoint to charge via Stripe, PayPal, or Mercado Pago
- ✅ **Provider abstraction** — swap or add providers without touching business logic
- ✅ **Idempotency** — duplicate-safe requests via idempotency keys
- ✅ **Webhook normalization** — receive one consistent event format regardless of provider
- ✅ **Automatic retries** — exponential backoff on transient failures
- ✅ **Refunds** — unified refund API across all providers
- ✅ **Transaction ledger** — all payment attempts stored and queryable
- ✅ **API key authentication** — per-client key management
- ✅ **Rate limiting** — protect the API from abuse
- ✅ **Swagger UI** — interactive API docs at `/api/docs`
- ✅ **Full test suite** — unit, integration, and E2E tests
- ✅ **Docker-ready** — single `docker-compose up` to run locally

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Runtime** | Node.js 20 LTS | Widely supported, strong ecosystem for HTTP/async |
| **Language** | TypeScript 5 | Type safety across provider contracts, fewer runtime bugs |
| **Framework** | Express.js | Lightweight, flexible, ideal for REST APIs |
| **Database** | PostgreSQL 16 | ACID transactions for financial data |
| **ORM** | Prisma | Type-safe DB access, migrations, easy schema management |
| **Cache / Queue** | Redis 7 | Idempotency key storage, rate limiting, retry queues |
| **Testing** | Jest + Supertest | Unit, integration, and E2E test coverage |
| **API Docs** | Swagger (OpenAPI 3.0) via `swagger-jsdoc` + `swagger-ui-express` | Auto-generated, interactive, always up-to-date |
| **Validation** | Zod | Schema validation with TypeScript inference |
| **Logging** | Winston + Morgan | Structured JSON logs, request logging |
| **Containerization** | Docker + Docker Compose | Consistent dev/prod environments |
| **CI/CD** | GitHub Actions | Automated test + lint + build on every PR |
| **Linting** | ESLint + Prettier | Consistent code style |

---

## Architecture

PayGate uses a **Provider Pattern** with a clean layered architecture:

```
┌─────────────────────────────────────────────────┐
│                  CLIENT / APP                   │
└────────────────────────┬────────────────────────┘
                         │ REST API calls
┌────────────────────────▼────────────────────────┐
│              Express API Layer                  │
│  Routes → Controllers → Middleware (Auth, IDK)  │
└────────────────────────┬────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│              Core Services Layer                │
│  PaymentService  │  RefundService  │ WebhookSvc  │
│  RetryService    │  IdempotencySvc              │
└────────────────────────┬────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│            Provider Factory (Strategy)          │
│   ProviderFactory.get('stripe' | 'paypal' | ...) │
└──────┬──────────────────┬───────────────┬───────┘
       │                  │               │
┌──────▼──────┐  ┌────────▼────┐  ┌──────▼──────┐
│   Stripe    │  │   PayPal    │  │ MercadoPago │
│  Provider   │  │  Provider   │  │  Provider   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│          Data Layer (Prisma + PostgreSQL)        │
│    payments │ transactions │ webhooks │ refunds  │
└─────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│                Redis (Cache / Queue)             │
│        idempotency keys │ rate limits            │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions

**Provider Pattern (Strategy):** Each payment provider (`StripeProvider`, `PayPalProvider`, `MercadoPagoProvider`) implements the same `IPaymentProvider` interface. The `ProviderFactory` returns the correct one based on the request. Adding a new provider (e.g., Adyen) only requires implementing the interface — zero changes to the core services.

**Idempotency:** Every payment request requires an `Idempotency-Key` header. Keys are stored in Redis with a 24h TTL. Duplicate requests return the cached response, preventing double charges.

**Webhook Normalization:** Providers send webhooks in wildly different formats. The `WebhookService` maps each provider's event to a normalized `PayGateEvent` format, then fans out to your registered endpoints.

**Transaction Ledger:** Every attempt — success or failure — is written to the `transactions` table. This gives full audit history and enables reconciliation.

---

## Project Structure

```
paygate-aggregator/
├── src/
│   ├── config/
│   │   ├── index.ts              # Env config with Zod validation
│   │   ├── database.ts           # Prisma client setup
│   │   ├── swagger.ts            # OpenAPI 3.0 configuration
│   │   └── logger.ts             # Winston logger setup
│   │
│   ├── controllers/
│   │   ├── payment.controller.ts # POST /payments, GET /payments/:id
│   │   ├── refund.controller.ts  # POST /refunds
│   │   ├── webhook.controller.ts # POST /webhooks/:provider
│   │   └── health.controller.ts  # GET /health
│   │
│   ├── services/
│   │   ├── core/
│   │   │   ├── payment.service.ts      # Orchestrates payment flow
│   │   │   ├── refund.service.ts       # Handles refund logic
│   │   │   ├── webhook.service.ts      # Normalizes & dispatches webhooks
│   │   │   ├── retry.service.ts        # Exponential backoff retry logic
│   │   │   └── idempotency.service.ts  # Redis-backed idempotency
│   │   │
│   │   └── providers/
│   │       ├── base.provider.ts          # IPaymentProvider interface
│   │       ├── provider.factory.ts       # Returns provider by name
│   │       ├── stripe.provider.ts        # Stripe SDK integration
│   │       ├── paypal.provider.ts        # PayPal REST API integration
│   │       └── mercadopago.provider.ts   # Mercado Pago SDK integration
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts         # API key validation
│   │   ├── idempotency.middleware.ts  # Idempotency key enforcement
│   │   ├── ratelimit.middleware.ts    # Redis-backed rate limiting
│   │   ├── validation.middleware.ts   # Zod schema validation
│   │   └── error.middleware.ts        # Global error handler
│   │
│   ├── models/
│   │   ├── payment.model.ts      # Payment Prisma model helpers
│   │   ├── transaction.model.ts  # Transaction ledger helpers
│   │   ├── refund.model.ts       # Refund model helpers
│   │   └── webhook.model.ts      # Webhook event model helpers
│   │
│   ├── routes/
│   │   ├── index.ts              # Aggregates all routes
│   │   ├── payment.routes.ts     # /api/v1/payments
│   │   ├── refund.routes.ts      # /api/v1/refunds
│   │   ├── webhook.routes.ts     # /api/v1/webhooks
│   │   └── health.routes.ts      # /health
│   │
│   ├── types/
│   │   ├── payment.types.ts      # Payment domain types
│   │   ├── provider.types.ts     # Provider interface types
│   │   └── api.types.ts          # Request/Response types
│   │
│   ├── utils/
│   │   ├── crypto.ts             # Webhook signature verification
│   │   ├── mapper.ts             # Provider response → normalized type
│   │   ├── validator.ts          # Zod schemas for all requests
│   │   └── errors.ts             # Custom error classes
│   │
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # HTTP server entrypoint
│
├── tests/
│   ├── unit/
│   │   ├── payment.service.test.ts       # Core payment flow logic
│   │   ├── stripe.provider.test.ts       # Stripe provider methods
│   │   ├── paypal.provider.test.ts       # PayPal provider methods
│   │   ├── mercadopago.provider.test.ts  # Mercado Pago methods
│   │   └── refund.service.test.ts        # Refund logic
│   │
│   ├── integration/
│   │   ├── payment.routes.test.ts   # Full HTTP request → DB
│   │   ├── refund.routes.test.ts    # Full refund flow
│   │   └── webhook.routes.test.ts   # Webhook ingestion
│   │
│   ├── e2e/
│   │   ├── checkout.e2e.test.ts  # Full checkout journey
│   │   └── refund.e2e.test.ts    # Full refund journey
│   │
│   ├── setup.ts         # Global test setup (DB seed, mocks)
│   ├── teardown.ts      # Global test teardown
│   └── helpers.ts       # Shared test utilities & factories
│
├── docker/
│   ├── Dockerfile               # Production image
│   ├── Dockerfile.dev           # Dev image with hot reload
│   ├── docker-compose.yml       # Full stack (API + Postgres + Redis)
│   └── docker-compose.test.yml  # Isolated test environment
│
├── docs/
│   ├── architecture.md   # Detailed architecture decisions
│   └── providers.md      # Provider-specific notes & quirks
│
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Auto-generated migrations
│
├── scripts/
│   ├── migrate.sh        # Run DB migrations
│   └── seed.sh           # Seed test data
│
├── .github/
│   └── workflows/
│       ├── ci.yml        # Run tests + lint on PRs
│       └── cd.yml        # Deploy on merge to main
│
├── .env.example          # All required env vars documented
├── jest.config.ts        # Jest configuration
├── tsconfig.json         # TypeScript configuration
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/paygate-aggregator.git
cd paygate-aggregator
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Fill in your provider API keys and DB credentials
```

### 3. Run with Docker (Recommended)

```bash
# Starts API + PostgreSQL + Redis
docker-compose -f docker/docker-compose.yml up
```

### 4. Run Locally (Manual)

```bash
# Apply DB migrations
npx prisma migrate dev

# Start dev server with hot reload
npm run dev
```

### 5. Access Swagger UI

```
http://localhost:3000/api/docs
```

---

## API Documentation

Interactive Swagger UI is available at `/api/docs` when the server is running.

### Core Endpoints

#### Payments

```
POST   /api/v1/payments          Create a new payment
GET    /api/v1/payments/:id      Get payment by ID
GET    /api/v1/payments          List payments (with filters)
```

#### Refunds

```
POST   /api/v1/refunds           Create a refund
GET    /api/v1/refunds/:id       Get refund status
```

#### Webhooks

```
POST   /api/v1/webhooks/stripe        Stripe webhook receiver
POST   /api/v1/webhooks/paypal        PayPal webhook receiver
POST   /api/v1/webhooks/mercadopago   Mercado Pago webhook receiver
```

#### System

```
GET    /health                   Health check (DB + Redis status)
```

### Example: Create a Payment

**Request:**
```http
POST /api/v1/payments
Authorization: Bearer <api_key>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "provider": "mercadopago",
  "amount": 1500,
  "currency": "ARS",
  "description": "Order #8821",
  "customer": {
    "email": "user@example.com",
    "name": "Juan Perez"
  },
  "paymentMethod": {
    "type": "card",
    "token": "card_token_from_frontend_sdk"
  },
  "metadata": {
    "orderId": "8821",
    "storeId": "store_42"
  }
}
```

**Response:**
```json
{
  "id": "pay_01J3X8K9M...",
  "provider": "mercadopago",
  "status": "succeeded",
  "amount": 1500,
  "currency": "ARS",
  "providerTransactionId": "123456789",
  "description": "Order #8821",
  "createdAt": "2025-07-15T14:32:00Z",
  "metadata": {
    "orderId": "8821",
    "storeId": "store_42"
  }
}
```

---

## Testing Strategy

The project enforces a **three-layer testing pyramid** with a minimum of **80% code coverage**.

### Unit Tests (`tests/unit/`)

Test individual services and provider methods in isolation. All external dependencies (Stripe SDK, PayPal HTTP client, DB) are **mocked**.

```bash
npm run test:unit
```

What's covered:
- `PaymentService` — routing logic, idempotency checks, error handling
- `RefundService` — partial & full refund validation
- Each provider — `charge()`, `refund()`, `getTransaction()` mapped correctly
- `RetryService` — backoff intervals, max attempts, non-retryable errors

### Integration Tests (`tests/integration/`)

Tests full HTTP request → service → real test database flows. Uses a **dedicated test PostgreSQL DB** and **real Redis** (via Docker). Provider SDKs are still mocked at the HTTP level via `nock`.

```bash
npm run test:integration
```

What's covered:
- All routes return correct HTTP status codes
- Validation errors return `400` with descriptive messages
- Auth middleware rejects missing/invalid keys with `401`
- Idempotency: second request with same key returns cached response
- Database records are created/updated correctly

### E2E Tests (`tests/e2e/`)

Full happy-path and edge-case journeys against a running instance of the full stack. Uses real provider sandbox credentials.

```bash
npm run test:e2e
```

What's covered:
- Complete checkout flow: create payment → receive webhook → status = `succeeded`
- Refund flow: create payment → create refund → status = `refunded`
- Failed payment: declined card → status = `failed`, error details returned

### Run All Tests

```bash
npm test                  # All tests
npm run test:coverage     # With coverage report
npm run test:watch        # Watch mode (dev)
```

### Coverage Requirements

| Threshold | Value |
|-----------|-------|
| Statements | ≥ 80% |
| Branches | ≥ 80% |
| Functions | ≥ 80% |
| Lines | ≥ 80% |

CI will **fail the build** if coverage drops below these thresholds.

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
# App
NODE_ENV=development
PORT=3000
API_KEY_SECRET=your_secret_for_signing_api_keys

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/paygate

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENVIRONMENT=sandbox   # or 'production'

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_WEBHOOK_SECRET=...
```

---

## Deployment

### Docker Production Build

```bash
docker build -f docker/Dockerfile -t paygate-aggregator:latest .
docker run -p 3000:3000 --env-file .env paygate-aggregator:latest
```

### CI/CD (GitHub Actions)

- **`ci.yml`** — Triggered on every PR: runs `lint`, `type-check`, `test:unit`, `test:integration`
- **`cd.yml`** — Triggered on merge to `main`: builds Docker image, pushes to registry, deploys

---

## Roadmap

- [ ] **Webhook delivery** — Forward normalized events to client-registered URLs with retries
- [ ] **Adyen provider** — Add Adyen for European markets
- [ ] **Split payments** — Route a single charge across multiple providers
- [ ] **Smart routing** — Auto-select provider based on success rate, fees, and currency
- [ ] **Dashboard UI** — React admin panel for transaction monitoring
- [ ] **gRPC support** — Alternative to REST for high-throughput internal services
- [ ] **Multi-tenancy** — Isolated configurations per merchant

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`
2. Follow the existing code style (ESLint + Prettier enforced)
3. Write tests for any new logic — PRs without tests will not be merged
4. Open a Pull Request with a clear description

---

## License

MIT — see `LICENSE` for details.