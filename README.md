# PayGate Aggregator

Unified payment gateway API aggregating **Stripe**, **PayPal**, and **Mercado Pago**. The stack is Node.js (Express), PostgreSQL (Prisma), and Redis.

---

## Prerequisites

- **Node.js** 20+ (matches `docker/Dockerfile.dev`)
- **npm**
- **Docker** and Docker Compose (recommended for PostgreSQL and Redis locally)

---

## What Docker is used for

The compose file at [`docker/docker-compose.yml`](docker/docker-compose.yml) runs: 

| Service | Image | Purpose |
|--------|--------|---------|
| **db** | `postgres:16-alpine` | Application database (`paygate` database, user/password `paygate`) |
| **redis** | `redis:7-alpine` | Caching, rate limiting, idempotency (per `REDIS_URL`) |
| **api** *(optional)* | Built from `docker/Dockerfile.dev` | Same app as `npm run dev`, with the repo mounted for hot reload |

Postgres is published on the host as **port 5433 → container 5432** so it does not conflict with another PostgreSQL instance on the default `localhost:5432` (for example Homebrew).

Redis is published on **6379**.

You can run **only** `db` and `redis` and start the API on your machine, or run the full stack including `api` in Docker.

---

## Environment variables

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set secrets (`API_KEY_SECRET`, provider keys, webhooks, etc.).  
   For local development with Docker Postgres/Redis, keep the defaults in [`.env.example`](.env.example) for `DATABASE_URL` and `REDIS_URL` (they point at `localhost:5433` and `localhost:6379`).

---

## Startup

### Option A — Database and Redis in Docker, API on the host (typical for development)

From the **repository root**:

```bash
docker compose -f docker/docker-compose.yml up -d db redis
npm install
npm run prisma:generate
npx prisma migrate dev
npm run start
```

The API listens on **http://localhost:3000** (or the `PORT` in `.env`).  
API documentation (Swagger UI): **http://localhost:3000/api/docs**

### Option B — Full stack in Docker (API + DB + Redis)

```bash
docker compose -f docker/docker-compose.yml up --build
```

The API container uses `DATABASE_URL` pointing at the `db` service inside the compose network. Apply migrations when the stack is up, for example:

```bash
docker compose -f docker/docker-compose.yml exec api npx prisma migrate deploy
```

(Use `migrate dev` only when you intend to create migrations from that environment.)

### Production-style run (built output)

```bash
npm run build
npm run start:server
```

`npm start` runs **Prisma Studio** and the compiled server, with optional ngrok; set `SKIP_NGROK=1` in `.env` if you want to skip ngrok (see comments in `.env.example`).

---

## Viewing the database

**Prisma Studio** (browser UI, uses `DATABASE_URL` from `.env`):

```bash
npm run prisma:studio
```

`npm start` also launches Prisma Studio (same as above). Open the URL Prisma prints (usually **http://localhost:5555**).

**Command line** (with Docker DB running and credentials from compose):

```bash
psql postgresql://paygate:paygate@localhost:5433/paygate
```

**Desktop clients** (TablePlus, DBeaver, pgAdmin, etc.): connect with host `localhost`, port **5433**, database `paygate`, user `paygate`, password `paygate`.

---

## API documentation (Swagger UI)

Interactive docs: **`GET /api/docs`** (e.g. `http://localhost:3000/api/docs`).

`npm run build` runs `swagger-jsdoc` over `src/routes` and `src/controllers`, then writes **`dist/openapi.json`**. At runtime the server prefers that file when present so **deployments without a `src/` tree** (Docker-only `dist/`) still show the full spec, including `POST /api/v1/payments/mercadopago/subscription-link`.

---

## Useful scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | TypeScript dev server with reload |
| `npm run build` then `npm start` | Compile, emit `dist/openapi.json`, then run server + Prisma Studio (optional ngrok via `start-with-ngrok.cjs`) |
| `npm run build` / `npm run start:server` | Compile and run compiled JS only (no Studio / ngrok) |
| `npm test` | Run tests |
| `npm run prisma:migrate` | Create/apply migrations in development |
| `npm run prisma:studio` | Open Prisma Studio for the database |

---

## Stopping Docker services

```bash
docker compose -f docker/docker-compose.yml down
```

To remove the Postgres volume as well (wipes local DB data): `docker compose -f docker/docker-compose.yml down -v`.
