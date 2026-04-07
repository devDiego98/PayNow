"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const errors_1 = require("../utils/errors");
const errorMiddleware = (err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        res.status(err.status).json({ error: err.message, code: err.code });
        return;
    }
    if (err instanceof errors_1.ProviderError) {
        res.status(502).json({
            error: err.message,
            code: err.code,
            provider: err.provider,
        });
        return;
    }
    const status = typeof err === "object" && err !== null && "status" in err
        ? Number(err.status)
        : 500;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(Number.isFinite(status) ? status : 500).json({ error: message });
};
exports.errorMiddleware = errorMiddleware;
//# sourceMappingURL=error.middleware.js.map