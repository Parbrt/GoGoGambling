interface Entry {
  data: unknown;
  at: number;
  ttl: number;
}

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | undefined {
  return (store.get(key) as { data: T } | undefined)?.data;
}

export function cacheSet<T>(key: string, data: T, ttl: number): void {
  store.set(key, { data, at: Date.now(), ttl });
}

export function cacheHas(key: string): boolean {
  return store.has(key);
}

export function cacheIsFresh(key: string): boolean {
  const e = store.get(key);
  return !!e && Date.now() - e.at <= e.ttl;
}
