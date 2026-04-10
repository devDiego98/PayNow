import { Router } from "express";
import * as refundController from "../controllers/refund.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/refunds:
 *   post:
 *     tags: [Refunds]
 *     summary: Create a refund
 *     description: Not implemented yet — returns 501. (No auth middleware on this route yet.)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRefundRequest'
 *     responses:
 *       501:
 *         description: Not implemented
 */
router.post("/", refundController.createRefund);

/**
 * @openapi
 * /api/v1/refunds/{id}:
 *   get:
 *     tags: [Refunds]
 *     summary: Get refund by id
 *     description: Not implemented yet — returns 501. (No auth middleware on this route yet.)
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
router.get("/:id", refundController.getRefundById);

export default router;
