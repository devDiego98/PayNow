import { Router } from "express";
import * as refundController from "../controllers/refund.controller";

const router = Router();

router.post("/", refundController.createRefund);
router.get("/:id", refundController.getRefundById);

export default router;
