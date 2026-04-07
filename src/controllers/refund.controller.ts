import type { RequestHandler } from "express";

export const createRefund: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
};

export const getRefundById: RequestHandler = (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
};
