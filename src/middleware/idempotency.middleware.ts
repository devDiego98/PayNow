import type { RequestHandler } from "express";

export const requireIdempotencyKey: RequestHandler = (req, res, next) => {
  const raw = req.headers["idempotency-key"];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key || typeof key !== "string" || key.trim() === "") {
    res.status(400).json({ error: "Idempotency-Key header is required" });
    return;
  }
  next();
};
