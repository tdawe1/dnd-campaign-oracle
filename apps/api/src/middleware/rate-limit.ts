import { Context, Next } from "hono";
import { redis } from "../lib/redis";
import { getRequestIp } from "../lib/request-ip";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";

const opts = {
    points: 10, // 10 requests
    duration: 60, // per 60 seconds
};

let rateLimiter: RateLimiterRedis | RateLimiterMemory;

if (redis && redis.status === 'ready') {
    rateLimiter = new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'middleware',
        ...opts,
    });
} else {
    rateLimiter = new RateLimiterMemory(opts);
}

export const rateLimit = async (c: Context, next: Next) => {
    const ip = getRequestIp(c);

    try {
        await rateLimiter.consume(ip);
        await next();
    } catch (rejRes) {
        c.status(429);
        return c.json({ error: "Too Many Requests" });
    }
};
