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
const cardController = __importStar(require("../controllers/card.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const validator_1 = require("../utils/validator");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/cards:
 *   post:
 *     tags: [Payments]
 *     summary: Save a card for repeat payments (Stripe)
 *     description: |
 *       Sends a Stripe **PaymentMethod** id (`pm_...`) from [Stripe.js / Elements](https://stripe.com/docs/payments/accept-a-payment).
 *       Creates a Stripe Customer and stores the card. Use the returned `id` as `savedCardId` on `POST /api/v1/payments`.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, paymentMethodId]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe PaymentMethod id (pm_...)
 *     responses:
 *       201:
 *         description: Card saved
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   get:
 *     tags: [Payments]
 *     summary: List saved cards for an email
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: List of saved cards (ids to use as savedCardId)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(validator_1.addCardBodySchema), cardController.addCard);
router.get("/", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateQuery)(validator_1.getCardsQuerySchema), cardController.getCards);
exports.default = router;
//# sourceMappingURL=card.routes.js.map