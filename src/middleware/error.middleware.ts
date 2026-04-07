import type { ErrorRequestHandler } from "express";
import { AppError, ProviderError } from "../utils/errors";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ProviderError) {
    res.status(502).json({
      error: err.message,
      code: err.code,
      provider: err.provider,
    });
    return;
  }
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: number }).status)
      : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(Number.isFinite(status) ? status : 500).json({ error: message });
};
