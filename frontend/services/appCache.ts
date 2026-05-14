type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function hasCachedValue(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return false;
  }

  return true;
}

export function getCachedValue<T>(key: string): T | null {
  if (!hasCachedValue(key)) {
    return null;
  }

  const entry = cache.get(key)!;
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(...keys: string[]) {
  keys.forEach((key) => cache.delete(key));
}

export function peekCachedValue<T>(key: string): T | null {
  const entry = cache.get(key);
  return entry ? (entry.value as T) : null;
}
