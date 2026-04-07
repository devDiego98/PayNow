import { Router } from "express";
import * as webhookController from "../controllers/webhook.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/webhooks/{provider}:
 *   post:
 *     tags: [Webhooks]
 *     summary: Provider webhook (Mercado Pago)
 *     description: |
 *       **Mercado Pago** sends JSON notifications here when `MERCADOPAGO_NOTIFICATION_URL` points to this path
 *       (or when configured in the Mercado Pago Developer Dashboard). The server validates `x-signature` when
 *       `MERCADOPAGO_WEBHOOK_SECRET` is set, then loads the payment from the Mercado Pago API and stores it in
 *       `mercadopago_payment_records`. Treat **`status: approved`** (and `dateApproved`) as proof of payment.
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [mercadopago]
 *     responses:
 *       200:
 *         description: Notification accepted
 *       401:
 *         description: Invalid or missing webhook signature
 *       501:
 *         description: Provider not implemented
 *       503:
 *         description: Mercado Pago token not configured
 */
router.post("/:provider", webhookController.receiveWebhook);

export default router;
