# Mercado Pago — local test flow (Checkout Pro, webhooks, “paid” in DB)

This guide walks through creating a **sandbox payment**, receiving a **webhook**, and confirming a row is stored with **`status: approved`** (treated as paid). It matches this repo’s routes and env names.

## What you need

1. **PostgreSQL** running and **migrations applied** (`mercadopago_payment_records` table exists).

   ```bash
   npx prisma migrate deploy
   ```

2. A **Mercado Pago application** in [Your integrations](https://www.mercadopago.com.ar/developers/panel/app) with:

   - **Seller and buyer must both be [test accounts](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/additional-content/your-integrations/test/accounts)** (created under **Test accounts** in the same app). The **seller** test account must be of type **Checkout Pro**.
   - **Seller API access**: set `MERCADOPAGO_ACCESS_TOKEN` to the **Access Token** from **Credenciales de producción** (Production credentials) on the integration.
   - A **test buyer** account to pay in Checkout Pro (log in as that buyer at checkout). Official steps: [Integration test](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/integration-test) and [Test purchases](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/integration-test/test-purchases).
   - <a id="sandbox-seller-and-buyer-must-both-be-test-accounts"></a>**Sandbox:** checkout only behaves as a **sandbox test** if the **payer** is a test buyer **and** the **seller** behind the preference is a test seller (Checkout Pro). Mixing a real Mercado Pago user at checkout with test seller/buyer setup (or the reverse) causes mismatches; keep both sides on test accounts as above.

3. **Public HTTPS URL** for webhooks (Mercado Pago cannot call `http://localhost` directly). This project’s `npm run start` starts **ngrok** and prints URLs; set **`MERCADOPAGO_NOTIFICATION_URL`** to the printed **webhook URL** (see below).

---

## Step 1 — Configure `.env`

Copy `.env.example` to `.env` and set at least:

| Variable | Purpose |
|----------|---------|
| `MERCADOPAGO_ACCESS_TOKEN` | **Access Token** from **Credenciales de producción** (Production credentials) for the Checkout Pro integration. The **seller** must still be a **test** Checkout Pro account; the **buyer** at checkout must be a **test** buyer (see [note under “What you need”](#sandbox-seller-and-buyer-must-both-be-test-accounts)). |
| `DATABASE_URL` | Postgres connection string. |
| `MERCADOPAGO_NOTIFICATION_URL` | Full URL to this app’s webhook (set **after** ngrok prints it in Step 3). Example shape: `https://<subdomain>.ngrok-free.dev/api/v1/webhooks/mercadopago`. |
| `API_KEY_SECRET` | Optional; if set, API requests need `Authorization: Bearer <same value>`. |

**Webhook signature (optional for first tests)**

| Variable | Purpose |
|----------|---------|
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret from **Your integrations → Webhooks**. If **set**, Mercado Pago must send valid `x-signature` / `x-request-id` headers or the webhook returns **401**. For the simplest local test, **leave it empty** so no signature is required. |

**Recipient allowlist (only if you use it)**

If `MERCADOPAGO_RECIPIENT_ALIAS` and/or `MERCADOPAGO_RECIPIENT_CBU` are set, `POST .../mercadopago/payment-link` **must** send matching `alias` / `cbu`. For a minimal test, leave both **empty** in `.env`.

---

## Step 2 — Build

```bash
npm run build
```

---

## Step 3 — Start the API and ngrok

```bash
npm run start
```

The script stops any existing ngrok agents, starts a new tunnel, then starts PayGate. In the console you should see something like:

- **ngrok public URL** — `https://....ngrok-free.dev`
- **Mercado Pago webhook URL** — `https://....ngrok-free.dev/api/v1/webhooks/mercadopago`

1. Copy the **Mercado Pago webhook URL** line into `.env` as **`MERCADOPAGO_NOTIFICATION_URL`** (exact full URL).
2. **Restart** the process (`Ctrl+C`, then `npm run start` again) so the preference API picks up the new value.

Preferences created **before** this URL is set will not notify that URL unless you also configure the same URL in the Mercado Pago app’s **Webhooks** section (dashboard can complement or override per docs).

---

## Step 4 — Create a Checkout Pro payment link

`amount` is in **minor units** (e.g. `100050` = **1000.50** ARS if currency is ARS).

Replace `YOUR_API_KEY` if you use `API_KEY_SECRET`; use a random UUID for `Idempotency-Key`.

```bash
curl -sS -X POST "http://localhost:3000/api/v1/payments/mercadopago/payment-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-MercadoPago-Access-Token: APP_USR-..." \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 100050,
    "currency": "ARS",
    "title": "Test order",
    "description": "Webhook test",
    "notificationUrl": "https://example.com/api/mercadopago?commerce_id=123&order_id=456",
    "backUrls": { "success": "https://example.com/success" }
  }'
```

From the JSON response:

- Open **`init_point`** in the browser when the API returns it

---

## Step 5 — Pay as a test buyer (approved outcome)

1. Open the checkout URL in an **incognito** window (Mercado Pago recommends this for test purchases).
2. Log in with your **test buyer** username/password from **Test accounts** in the Developer Panel when Checkout asks for Mercado Pago login.
3. Pay with a **test card** from the [official test cards table](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/integration-test/test-purchases) (e.g. Visa `4509 9535 6623 3704`, CVV `123`, expiry `11/30`).
4. For **cardholder first and last name**, use **`APRO`** so the payment is **approved** (see “Payment Status” table on the same doc page).

After success, Checkout shows the test success screen.

---

## Step 6 — Confirm the webhook ran

In the **same terminal** as `npm run start`, you should see logs such as:

- `[webhook:mercadopago] received` — notification arrived.
- `[webhook:mercadopago] stored` — includes Mercado Pago `status` (e.g. `approved`) and `externalReference`.
- `[webhook:mercadopago] done` — lists `mpPaymentIds`.

If you see **`no payment id in notification — skipped fetch`**, the body did not look like a payment notification; check that **`MERCADOPAGO_NOTIFICATION_URL`** matches the tunnel and that Dashboard webhooks (if any) point to the same path.

---

## Step 7 — Confirm “paid” is stored (approved)

This app treats Mercado Pago’s API response as source of truth and persists it in **`mercadopago_payment_records`**. For a successful card test with **`APRO`**, **`status`** should be **`approved`**.

List recent rows (requires Bearer if `API_KEY_SECRET` is set):

```bash
curl -sS "http://localhost:3000/api/v1/payments/mercadopago/payment-records?status=approved" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

You can also filter by `externalReference` or `mpPaymentId` query parameters.

**Interpretation**

- **`status: "approved"`** — payment approved; **`dateApproved`** set when MP provides it.
- Full API snapshot is in **`paymentSnapshot`**; webhook payload is in **`notificationJson`** (when present).

---

## Optional — Mercado Pago dashboard webhook simulator

In **Your integrations → Webhooks**, you can send a **test** notification to your tunnel URL. You still need a **real payment id** that belongs to your seller account for `GET /v1/payments/:id` to succeed; the most reliable end-to-end test is **Steps 4–7** above.

---


| Issue | What to check |
|-------|----------------|
| Webhook never hits your machine | `MERCADOPAGO_NOTIFICATION_URL` must be **HTTPS** and reachable; restart server after changing `.env`; tunnel must point to the same **PORT** as PayGate. |
| **401** on webhook | `MERCADOPAGO_WEBHOOK_SECRET` is set but MP did not send a valid signature — clear secret for local tests or fix headers per [Webhook signature](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks). |
| **502** on webhook | Usually Mercado Pago API error when fetching payment (bad `id`, wrong token, or network). Check server logs. |
| No row in DB | DB unreachable from app, or webhook never processed a payment id — see console logs in Step 6. |
| **ERR_NGROK_334** / duplicate tunnel | This project’s `npm run start` stops other ngrok agents first; only one tunnel should own the URL. |

---

## Reference links

- [Test accounts](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/additional-content/your-integrations/test/accounts)
- [Test purchases (cards, `APRO`)](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/integration-test/test-purchases)
- [Webhooks](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks)
