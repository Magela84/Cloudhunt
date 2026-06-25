const USER_AGENT =
  "CloudHunt/0.1 (+https://github.com/; job aggregation for personal use)";

interface FetchJsonOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * Fetch JSON with a timeout and a polite User-Agent. Returns null on any
 * failure (network, non-2xx, timeout, parse) so adapters can degrade to [].
 */
export async function fetchJson<T>(
  url: string,
  opts: FetchJsonOptions = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 12_000,
  );
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Simple in-process TTL cache (best-effort; resets on cold start) --------

interface CacheEntry<T> {
  value: T;
  expires: number;
}
const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
