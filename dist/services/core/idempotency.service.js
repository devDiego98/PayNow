"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
/**
 * In-memory idempotency store (swap for Redis-backed implementation later).
 */
class IdempotencyService {
    store = new Map();
    ttlMs = 24 * 60 * 60 * 1000;
    async get(key) {
        const row = this.store.get(key);
        if (!row)
            return null;
        if (Date.now() > row.expiresAt) {
            this.store.delete(key);
            return null;
        }
        try {
            return JSON.parse(row.value);
        }
        catch {
            return null;
        }
    }
    async set(key, value) {
        const payload = JSON.stringify(value);
        this.store.set(key, { value: payload, expiresAt: Date.now() + this.ttlMs });
    }
}
exports.IdempotencyService = IdempotencyService;
//# sourceMappingURL=idempotency.service.js.map