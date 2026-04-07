/**
 * In-memory idempotency store (swap for Redis-backed implementation later).
 */
export class IdempotencyService {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  private readonly ttlMs = 24 * 60 * 60 * 1000;

  async get(key: string): Promise<unknown | null> {
    const row = this.store.get(key);
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(row.value) as unknown;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const payload = JSON.stringify(value);
    this.store.set(key, { value: payload, expiresAt: Date.now() + this.ttlMs });
  }
}
