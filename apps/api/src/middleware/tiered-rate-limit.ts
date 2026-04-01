/**
 * Tiered Rate Limiting Middleware
 * 
 * Provides user-tier-aware rate limiting with different limits for
 * Free, Pro, and Enterprise users.
 */

import { Context, Next } from "hono";
import { redis } from "../lib/redis";
import { getRequestIp } from "../lib/request-ip";
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { db } from "../db";
import { users, apiUsage } from "../db/schema";
import { eq, sql } from "drizzle-orm";

// Rate limit configuration per tier
// Rate limit configuration per role
export const ROLE_LIMITS = {
    anonymous: {
        general: { points: 0, duration: 60 },        // 0 req/min
        oracle: { points: 0, duration: 60 },         // 0 req/min
        search: { points: 0, duration: 60 },         // 0 req/min
        monthlyTokens: 0,                            // 0 tokens
    },
    guest: {
        general: { points: 3, duration: 60 },        // 3 req/min (per user feedback)
        oracle: { points: 2, duration: 60 },         // 2 req/min
        search: { points: 5, duration: 60 },         // 5 req/min
        monthlyTokens: 1000,                         // 1k tokens (trial)
    },
    // ... other roles stay same 
    player: {
        general: { points: 60, duration: 60 },
        oracle: { points: 20, duration: 60 },
        search: { points: 40, duration: 60 },
        monthlyTokens: 100000,
    },
    dm: {
        general: { points: 200, duration: 60 },
        oracle: { points: 60, duration: 60 },
        search: { points: 100, duration: 60 },
        monthlyTokens: 200000,
    },
    admin: {
        general: { points: 1000, duration: 60 },
        oracle: { points: 200, duration: 60 },
        search: { points: 500, duration: 60 },
        monthlyTokens: -1,
    },
} as const;

export type UserSystemRole = keyof typeof ROLE_LIMITS;
export type RateLimitType = 'general' | 'oracle' | 'search';

// Create rate limiters for each role and type
const rateLimiters: Record<UserSystemRole, Record<RateLimitType, RateLimiterRedis | RateLimiterMemory>> = {} as any;

function createRateLimiter(role: UserSystemRole, type: RateLimitType): RateLimiterRedis | RateLimiterMemory {
    const opts = ROLE_LIMITS[role][type];
    const keyPrefix = `rate:${role}:${type}`;
    
    if (redis && redis.status === 'ready') {
        return new RateLimiterRedis({
            storeClient: redis,
            keyPrefix,
            ...opts,
        });
    }
    return new RateLimiterMemory({ ...opts, keyPrefix });
}

// Initialize rate limiters
(['anonymous', 'guest', 'player', 'dm', 'admin'] as UserSystemRole[]).forEach(role => {
    rateLimiters[role] = {
        general: createRateLimiter(role, 'general'),
        oracle: createRateLimiter(role, 'oracle'),
        search: createRateLimiter(role, 'search'),
    };
});

/**
 * Determines the rate limit type based on the request path
 */
function getRateLimitType(path: string): RateLimitType {
    if (path.includes('/api/llm') || path.includes('/api/oracle')) {
        return 'oracle';
    }
    if (path.includes('/api/search')) {
        return 'search';
    }
    return 'general';
}

/**
 * Get the user's role from the context or database
 */
async function getUserRole(userId: string | undefined): Promise<UserSystemRole> {
    if (!userId) return 'anonymous';
    
    try {
        const user = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
        return (user[0]?.role as UserSystemRole) || 'guest';
    } catch {
        return 'guest';
    }
}

/**
 * Tiered rate limiting middleware
 */
export const tieredRateLimit = async (c: Context, next: Next) => {
    const user = c.get("user");
    const userId = user?.id;
    const path = c.req.path;
    
    // Exempt auth routes (signin, signup, session, etc.) from rate limiting
    if (path.startsWith('/api/auth')) {
        return next();
    }
    
    const type = getRateLimitType(path);
    
    // Get user role
    const role = await getUserRole(userId);
    
    // Use user ID for authenticated users, IP for anonymous
    const key = userId || getRequestIp(c);
    
    try {
        const limiter = rateLimiters[role][type];
        const result = await limiter.consume(key);
        
        // Add rate limit headers
        c.header('X-RateLimit-Limit', String(ROLE_LIMITS[role][type].points));
        c.header('X-RateLimit-Remaining', String(result.remainingPoints));
        c.header('X-RateLimit-Reset', String(Math.ceil(result.msBeforeNext / 1000)));
        c.header('X-RateLimit-Role', role);
        
        await next();
    } catch (rejRes) {
        const result = rejRes as RateLimiterRes;
        
        c.header('X-RateLimit-Limit', String(ROLE_LIMITS[role][type].points));
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', String(Math.ceil(result.msBeforeNext / 1000)));
        c.header('X-RateLimit-Role', role);
        c.header('Retry-After', String(Math.ceil(result.msBeforeNext / 1000)));
        
        return c.json({ 
            error: "Too Many Requests",
            role,
            retryAfter: Math.ceil(result.msBeforeNext / 1000),
            message: role === 'guest' 
                ? 'Guest limit exceeded. Ask the DM for approval.' 
                : 'Rate limit exceeded.'
        }, 429);
    }
};

/**
 * Check if user has remaining monthly tokens
 */
export async function checkTokenQuota(userId: string): Promise<{ allowed: boolean; remaining: number; role: UserSystemRole }> {
    const user = await db.select({
        role: users.role,
        tokensUsed: users.oracleTokensUsed,
        resetAt: users.oracleTokensResetAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user[0]) {
        return { allowed: false, remaining: 0, role: 'guest' };
    }
    
    const role = (user[0].role as UserSystemRole) || 'guest';
    const limit = ROLE_LIMITS[role].monthlyTokens;
    
    // Unlimited for admin
    if (limit === -1) {
        return { allowed: true, remaining: -1, role };
    }
    
    // Check if we need to reset the monthly counter
    const now = new Date();
    const resetAt = user[0].resetAt;
    let tokensUsed = user[0].tokensUsed || 0;
    
    if (!resetAt || now > resetAt) {
        // Reset counter - first day of next month
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        await db.update(users).set({
            oracleTokensUsed: 0,
            oracleTokensResetAt: nextMonth,
        }).where(eq(users.id, userId));
        tokensUsed = 0;
    }
    
    const remaining = limit - tokensUsed;
    return { allowed: remaining > 0, remaining, role };
}

/**
 * Increment token usage for a user
 */
export async function incrementTokenUsage(userId: string, tokens: number): Promise<void> {
    await db.update(users).set({
        oracleTokensUsed: sql`COALESCE(${users.oracleTokensUsed}, 0) + ${tokens}`,
    }).where(eq(users.id, userId));
}

/**
 * Log API usage for observability
 */
export async function logApiUsage(params: {
    userId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    tokensUsed?: number;
    requestIp?: string;
    userAgent?: string;
    errorMessage?: string;
}): Promise<void> {
    try {
        await db.insert(apiUsage).values({
            userId: params.userId || null,
            endpoint: params.endpoint,
            method: params.method,
            statusCode: params.statusCode,
            responseTimeMs: params.responseTimeMs,
            tokensUsed: params.tokensUsed || 0,
            requestIp: params.requestIp || null,
            userAgent: params.userAgent || null,
            errorMessage: params.errorMessage || null,
        });
    } catch (error) {
        console.error('[API Usage] Failed to log:', error);
    }
}

// Re-export legacy rate limiter for backwards compatibility
export { rateLimit } from "./rate-limit";
