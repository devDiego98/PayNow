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
const webhookController = __importStar(require("../controllers/webhook.controller"));
const router = (0, express_1.Router)();
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
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map