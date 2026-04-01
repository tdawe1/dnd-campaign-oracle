import { redis } from './redis';

const DEFAULT_TTL = 86400; // 24 hours - aggressive caching to reduce LLM costs

/**
 * Tries to get value from cache. If missing, runs fetchFn, caches result, and returns it.
 * @param key Redis cache key
 * @param fetchFn Async function to fetch data if cache miss
/**
 * Tries to get value from cache. If missing, runs fetchFn, caches result (if shouldCache returns true), and returns it.
 * @param key Redis cache key
 * @param fetchFn Async function to fetch data if cache miss
 * @param ttlSeconds TTL in seconds (default 3600)
 * @param shouldCache Optional predicate to determine if result should be cached (default: true)
 */
export async function getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL,
    shouldCache: (result: T) => boolean = () => true
): Promise<T> {
    // If Redis isn't connected or configured, just run the function
    if (!redis) {
        return await fetchFn();
    }

    try {
        const cached = await redis.get(key);
        if (cached) {
            console.log(`[Cache] HIT ${key}`);
            return JSON.parse(cached);
        }
    } catch (err) {
        console.warn(`[Cache] Redis get error for ${key}:`, err);
    }

    console.log(`[Cache] MISS ${key}`);
    const result = await fetchFn();

    try {
        if (result && shouldCache(result)) {
            await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
        }
    } catch (err) {
        console.warn(`[Cache] Redis set error for ${key}:`, err);
    }

    return result;
}
