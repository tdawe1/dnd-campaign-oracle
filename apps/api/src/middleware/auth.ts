import { Context, Next } from "hono";
import { auth } from "../lib/auth";

export async function authMiddleware(c: Context, next: Next) {
    console.log(`[AuthMiddleware] Checking session for ${c.req.method} ${c.req.url}`);
    
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        console.log(`[AuthMiddleware] Session result:`, session ? `User: ${session.user?.email}` : 'null');

        if (!session) {
            console.log(`[AuthMiddleware] No session - returning 401`);
            return c.json({ error: "Unauthorized" }, 401);
        }

        c.set("session", session.session);
        c.set("user", session.user);

        return next();
    } catch (error) {
        console.error("[AuthMiddleware] Error checking session:", error);
        // Return 401 on auth errors, not 500
        return c.json({ error: "Unauthorized" }, 401);
    }
}

declare module "hono" {
    interface ContextVariableMap {
        session: any;
        user: any;
    }
}
