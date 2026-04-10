import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireIdempotencyKey } from "../middleware/idempotency.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  createMercadoPagoPaymentLinkBodySchema,
  createMercadoPagoSubscriptionLinkBodySchema,
  createPaymentBodySchema,
} from "../utils/validator";

const router = Router();

/**
 * @openapi
 * /api/v1/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment
 *     description: |
 *       Charges the selected provider. When `API_KEY_SECRET` is set on the server, send it as a Bearer token.
 *
 *       **Stripe test mode:** use `paymentMethod.token` = `tok_visa` (or other [test tokens](https://stripe.com/docs/testing#cards)) with `sk_test_...` keys,
 *       or omit `paymentMethod` and pass `savedCardId` from `POST /api/v1/cards` (same `customer.email` as when the card was saved).
 *       Set `STRIPE_PAYMENT_RETURN_URL` in `.env` if Stripe requires a return URL.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique per logical payment; repeats within 24h return the same response. Swagger UI fills a new random UUID on each docs page load.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *           examples:
 *             stripeTestTokVisa:
 *               summary: Stripe — test token (sk_test)
 *               value:
 *                 provider: stripe
 *                 amount: 2000
 *                 currency: usd
 *                 description: Swagger test payment
 *                 customer:
 *                   email: test@example.com
 *                   name: Test User
 *                 paymentMethod:
 *                   type: card
 *                   token: tok_visa
 *             stripeSavedCard:
 *               summary: Stripe — saved card id from GET /cards
 *               value:
 *                 provider: stripe
 *                 amount: 2000
 *                 currency: usd
 *                 description: Pay with saved card
 *                 customer:
 *                   email: test@example.com
 *                   name: Test User
 *                 savedCardId: REPLACE_WITH_ID_FROM_GET_CARDS
 *     responses:
 *       201:
 *         description: Payment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       502:
 *         $ref: '#/components/responses/ProviderError'
 *   get:
 *     tags: [Payments]
 *     summary: List payments
 *     description: |
 *       Returns persisted **Mercado Pago** payments (from webhooks). Stripe/PayPal charges are not stored in this table yet.
 *       Query: `status`, `externalReference`, `mpPaymentId`, `limit` (default 100, max 500), `offset`.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         example: approved
 *       - in: query
 *         name: externalReference
 *         schema: { type: string }
 *       - in: query
 *         name: mpPaymentId
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  "/",
  authMiddleware,
  requireIdempotencyKey,
  validateBody(createPaymentBodySchema),
  paymentController.createPayment
);

/**
 * @openapi
 * /api/v1/payments/mercadopago/payment-link:
 *   post:
 *     tags: [Payments]
 *     summary: Create Mercado Pago Checkout Pro payment link
 *     description: |
 *       Creates a [preference](https://www.mercadopago.com.ar/developers/en/reference/preferences/_checkout_preferences/post)
 *       and returns `initPoint` — the URL to open Checkout (web or Mercado Pago app on mobile).
 *
 *       **Funds** are collected by the Mercado Pago account linked to `MERCADOPAGO_ACCESS_TOKEN`.
 *       To create a link for a specific commerce, send `X-MercadoPago-Access-Token` with that commerce's access token.
 *       Optional `alias` / `cbu` are stored in preference metadata for reconciliation; they do not redirect settlement to a third-party bank account.
 *       Optional `maxInstallments` (1–36) sets Checkout Pro card installments via `payment_methods.installments`.
 *       To restrict which alias/CBU clients may request, set `MERCADOPAGO_RECIPIENT_ALIAS` and/or `MERCADOPAGO_RECIPIENT_CBU` in the server environment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: X-MercadoPago-Access-Token
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional per-request Mercado Pago Access Token (to generate links under the commerce that owns the token).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MercadoPagoPaymentLinkRequest'
 *           example:
 *             amount: 100050
 *             currency: ARS
 *             title: Invoice 42
 *             alias: mi.alias.mp
 *             cbu: "0000003100000000000000"
 *     responses:
 *       201:
 *         description: Preference created; open `initPoint` to pay
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MercadoPagoPaymentLinkResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       502:
 *         $ref: '#/components/responses/ProviderError'
 *       503:
 *         description: Mercado Pago not configured
 */
router.post(
  "/mercadopago/payment-link",
  authMiddleware,
  requireIdempotencyKey,
  validateBody(createMercadoPagoPaymentLinkBodySchema),
  paymentController.createMercadoPagoPaymentLink
);

/**
 * @openapi
 * /api/v1/payments/mercadopago/subscription-link:
 *   post:
 *     tags: [Payments]
 *     summary: Create Mercado Pago PreApproval subscription checkout link
 *     description: |
 *       Creates a [preapproval](https://www.mercadopago.com.ar/developers/en/reference/subscriptions/_preapproval/post)
 *       and returns `initPoint` for the subscription checkout. Webhooks for `payment` and `subscription_preapproval`
 *       hit `POST /api/v1/webhooks/mercadopago` on this server (or your `notificationUrl`); when `PONETEWEB_MP_WEBHOOK_FORWARD_URL`
 *       is set, they are forwarded to Poneteweb like Checkout Pro payments.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: X-MercadoPago-Access-Token
 *         required: false
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MercadoPagoSubscriptionLinkRequest'
 *     responses:
 *       201:
 *         description: Preapproval created; open `initPoint` to authorize the subscription
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MercadoPagoSubscriptionLinkResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       502:
 *         $ref: '#/components/responses/ProviderError'
 *       503:
 *         description: Mercado Pago not configured
 */
router.post(
  "/mercadopago/subscription-link",
  authMiddleware,
  requireIdempotencyKey,
  validateBody(createMercadoPagoSubscriptionLinkBodySchema),
  paymentController.createMercadoPagoSubscriptionLink
);

router.get("/", authMiddleware, paymentController.listPayments);

router.get(
  "/mercadopago/payment-records",
  authMiddleware,
  paymentController.listMercadoPagoPaymentRecords
);

/**
 * @openapi
 * /api/v1/payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment by id
 *     description: Not implemented yet — returns 501.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       501:
 *         description: Not implemented
 */
router.get("/:id", paymentController.getPaymentById);

export default router;
