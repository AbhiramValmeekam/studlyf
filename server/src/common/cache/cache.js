/**
 * Minimal cache contract. The in-memory implementation is enough for a single
 * instance; a Redis-backed class implementing the same interface can be dropped
 * in for horizontal scaling without touching callers.
 */
export class MemoryCache {
  store = new Map();

  async get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  async set(key, value, ttlSeconds) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async deleteByPrefix(prefix) {
    for (const key of this.store.keys()) if (key.startsWith(prefix)) this.store.delete(key);
  }
}

const inflight = new WeakMap();

/** Read-through helper with request coalescing, so a cold cache doesn't stampede the DB. */
export async function cached(cache, key, ttlSeconds, load) {
  if (ttlSeconds <= 0) return load();
  const hit = await cache.get(key);
  if (hit !== undefined) return hit;

  let pending = inflight.get(cache);
  if (!pending) inflight.set(cache, (pending = new Map()));
  const existing = pending.get(key);
  if (existing) return existing;

  const promise = load()
    .then(async (value) => {
      await cache.set(key, value, ttlSeconds);
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

/** All public read models live under this prefix and are dropped on any admin write. */
export const PUBLIC_CACHE_PREFIX = 'public:';
