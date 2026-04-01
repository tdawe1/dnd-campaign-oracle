/**
 * Observability Middleware
 * 
 * Logs API requests for monitoring, debugging, and usage analytics.
 */

import { Context, Next } from "hono";
import { getRequestIp } from "../lib/request-ip";
import { logApiUsage } from "./tiered-rate-limit";

/**
 * Request timing and logging middleware
 */
export const observability = async (c: Context, next: Next) => {
    const startTime = Date.now();
    const user = c.get("user");
    
    // Process request
    await next();
    
    // Calculate response time
    const responseTimeMs = Date.now() - startTime;
    
    // Get request metadata
    const endpoint = c.req.path;
    const method = c.req.method;
    const statusCode = c.res.status;
    const requestIp = getRequestIp(c);
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    // Skip logging for health checks and static files
    if (endpoint === '/health' || endpoint.startsWith('/assets') || endpoint.startsWith('/icons')) {
        return;
    }
    
    // Log to database (async, don't block response)
    logApiUsage({
        userId: user?.id,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        requestIp,
        userAgent,
    }).catch(err => console.error('[Observability] Log failed:', err));
    
    // Add timing header
    c.header('X-Response-Time', `${responseTimeMs}ms`);
};

/**
 * Middleware to track token usage for LLM endpoints
 */
export const trackTokenUsage = (tokensUsed: number) => async (c: Context, next: Next) => {
    const startTime = Date.now();
    const user = c.get("user");
    
    await next();
    
    const responseTimeMs = Date.now() - startTime;
    const statusCode = c.res.status;
    
    // Log with token usage
    if (statusCode >= 200 && statusCode < 300) {
        logApiUsage({
            userId: user?.id,
            endpoint: c.req.path,
            method: c.req.method,
            statusCode,
            responseTimeMs,
            tokensUsed,
            requestIp: getRequestIp(c),
            userAgent: c.req.header('user-agent') || 'unknown',
        }).catch(err => console.error('[Observability] Token log failed:', err));
    }
};

export { logApiUsage };
