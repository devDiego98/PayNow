"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireIdempotencyKey = void 0;
const requireIdempotencyKey = (req, res, next) => {
    const raw = req.headers["idempotency-key"];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || typeof key !== "string" || key.trim() === "") {
        res.status(400).json({ error: "Idempotency-Key header is required" });
        return;
    }
    next();
};
exports.requireIdempotencyKey = requireIdempotencyKey;
//# sourceMappingURL=idempotency.middleware.js.map