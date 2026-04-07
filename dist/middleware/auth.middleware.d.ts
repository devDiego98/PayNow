import type { RequestHandler } from "express";
/**
 * Validates `Authorization: Bearer <token>` when `API_KEY_SECRET` is set.
 * If unset, auth is skipped (local dev only — tighten for production).
 */
export declare const authMiddleware: RequestHandler;
//# sourceMappingURL=auth.middleware.d.ts.map