"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
/**
 * Validates `Authorization: Bearer <token>` when `API_KEY_SECRET` is set.
 * If unset, auth is skipped (local dev only — tighten for production).
 */
const authMiddleware = (req, res, next) => {
    const secret = process.env.API_KEY_SECRET;
    if (!secret) {
        next();
        return;
    }
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const token = auth.slice("Bearer ".length);
    if (token !== secret) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.middleware.js.map