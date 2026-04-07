import { Router } from "express";
import * as cardController from "../controllers/card.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validation.middleware";
import { addCardBodySchema, getCardsQuerySchema } from "../utils/validator";

const router = Router();

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
router.post("/", authMiddleware, validateBody(addCardBodySchema), cardController.addCard);
router.get("/", authMiddleware, validateQuery(getCardsQuerySchema), cardController.getCards);

export default router;
