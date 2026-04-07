/**
 * In-memory idempotency store (swap for Redis-backed implementation later).
 */
export declare class IdempotencyService {
    private readonly store;
    private readonly ttlMs;
    get(key: string): Promise<unknown | null>;
    set(key: string, value: unknown): Promise<void>;
}
//# sourceMappingURL=idempotency.service.d.ts.map