
import 'dotenv/config';
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import path from 'path'

import { auth } from "./lib/auth";
import { db } from "./db";

import { authRoutes } from "./routes/auth";
import { campaignRoutes } from "./routes/campaigns"
import { characterRoutes } from "./routes/characters"
import { sessionRoutes } from "./routes/sessions"
import { questRoutes } from "./routes/quests"
import { npcRoutes } from "./routes/npcs"
import { llmRoutes } from "./routes/llm"
import itemRoutes from "./routes/items"
import { searchRoutes } from "./routes/search"
import { importRoutes } from "./routes/import"
import { chronicleRoutes } from "./routes/chronicle"
import { userRoutes } from "./routes/users"
import { authMiddleware } from "./middleware/auth"
import { tieredRateLimit } from "./middleware/tiered-rate-limit"
import { observability } from "./middleware/observability"

const app = new Hono()

// Public routes (no auth required) - register BEFORE auth middleware
app.route("/api/chronicle", chronicleRoutes)

app.use('*', logger())
app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    await next()
})
app.use('*', cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: Date.now() })
})

// Protected Routes Middleware
app.use('/api/campaigns/*', authMiddleware)
app.use('/api/characters/*', authMiddleware)
app.use('/api/sessions/*', authMiddleware)
app.use('/api/quests/*', authMiddleware)
app.use('/api/npcs/*', authMiddleware)
app.use('/api/llm/*', authMiddleware)
app.use('/api/items/*', authMiddleware)
app.use('/api/search/*', authMiddleware)
app.use('/api/import/*', authMiddleware)
app.use('/api/users/*', authMiddleware)

// Apply observability to all API routes
app.use('/api/*', observability)

// Apply tiered rate limiting to all API routes
app.use('/api/*', tieredRateLimit)

// Auth Handler with error logging
app.on(["POST", "GET"], "/api/auth/**", async (c) => {
    console.log(`[Auth] ${c.req.method} ${c.req.url}`);
    try {
        const response = await auth.handler(c.req.raw);
        console.log(`[Auth] Response status: ${response.status}`);
        return response;
    } catch (error) {
        console.error("[Auth] Handler error:", error);
        return c.json({ error: "Auth handler failed" }, 500);
    }
});

// API Routes
const routes = app
    .route("/api/campaigns", campaignRoutes)
    .route("/api/characters", characterRoutes)
    .route("/api/sessions", sessionRoutes)
    .route("/api/quests", questRoutes)
    .route("/api/npcs", npcRoutes)
    .route("/api/llm", llmRoutes)
    .route("/api", itemRoutes)
    .route("/api/search", searchRoutes)
    .route("/api/import", importRoutes)
    .route("/api/users", userRoutes)

// Protected routes (middleware is already applied via app.use("/api/*", ...))
// But Hono RPC types need the route structure.
// The middleware doesn't change the route type structure much for the client.



export type AppType = typeof routes

// Global error handler - never expose internal errors
app.onError((err, c) => {
    console.error('[Server] Unhandled error:', err);

    // Never expose internal error details in production
    return c.json({ error: 'Internal server error' }, 500);
});

// Static file serving for production (when SERVE_STATIC=true)
if (process.env.SERVE_STATIC === 'true') {
    console.log('[Server] Serving static files from ../web/dist');

    // Serve static assets
    app.use('/*', serveStatic({
        root: '../web/dist',
        rewriteRequestPath: (path) => path,
    }));

    // SPA fallback - serve index.html for non-API routes
    app.get('*', async (c) => {
        const url = new URL(c.req.url);
        // Don't serve index.html for API routes
        if (url.pathname.startsWith('/api')) {
            return c.json({ error: 'Not found' }, 404);
        }

        // Serve index.html for SPA routes
        try {
            const fs = await import('fs/promises');
            const indexPath = path.join(process.cwd(), '../web/dist/index.html');
            const html = await fs.readFile(indexPath, 'utf-8');
            return c.html(html);
        } catch {
            return c.json({ error: 'Not found' }, 404);
        }
    });
} else {
    // 404 handler for API-only mode
    app.notFound((c) => {
        return c.json({ error: 'Not found' }, 404);
    });
}

const port = Number(process.env.PORT) || 3001
console.log(`Server is running on port ${port}`)

serve({
    fetch: app.fetch,
    port
})
