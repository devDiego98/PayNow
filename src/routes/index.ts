import type { Express } from "express";
import express from "express";
import cardRoutes from "./card.routes";
import paymentRoutes from "./payment.routes";
import refundRoutes from "./refund.routes";
import webhookRoutes from "./webhook.routes";
import healthRoutes from "./health.routes";

export function registerRoutes(app: Express): void {
  app.use("/health", healthRoutes);
  app.use("/api/v1/cards", express.json(), cardRoutes);
  app.use("/api/v1/payments", express.json(), paymentRoutes);
  app.use("/api/v1/refunds", express.json(), refundRoutes);
  app.use("/api/v1/webhooks", express.json(), webhookRoutes);
}
