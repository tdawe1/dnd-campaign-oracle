import { Hono } from "hono";
import { auth } from "../lib/auth";

const app = new Hono();

app.on(["POST", "GET"], "/*", (c) => {
    return auth.handler(c.req.raw);
});

export { app as authRoutes };
