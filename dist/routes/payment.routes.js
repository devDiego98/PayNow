"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController = __importStar(require("../controllers/payment.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const idempotency_middleware_1 = require("../middleware/idempotency.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const validator_1 = require("../utils/validator");
const router = (0, express_1.Router)();
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
router.post("/", auth_middleware_1.authMiddleware, idempotency_middleware_1.requireIdempotencyKey, (0, validation_middleware_1.validateBody)(validator_1.createPaymentBodySchema), paymentController.createPayment);
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
router.post("/mercadopago/payment-link", auth_middleware_1.authMiddleware, idempotency_middleware_1.requireIdempotencyKey, (0, validation_middleware_1.validateBody)(validator_1.createMercadoPagoPaymentLinkBodySchema), paymentController.createMercadoPagoPaymentLink);
router.get("/", auth_middleware_1.authMiddleware, paymentController.listPayments);
router.get("/mercadopago/payment-records", auth_middleware_1.authMiddleware, paymentController.listMercadoPagoPaymentRecords);
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
exports.default = router;
//# sourceMappingURL=payment.routes.js.map