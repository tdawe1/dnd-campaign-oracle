import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

function getFirstHeaderValue(value: string | undefined): string | null {
    if (!value) return null;

    const first = value.split(",")[0]?.trim();
    return first || null;
}

function normalizeIp(value: string | null | undefined): string | null {
    if (!value) return null;

    if (value.startsWith("::ffff:")) {
        return value.slice(7);
    }

    return value;
}

function getForwardedIp(c: Context): string | null {
    const cfConnectingIp = getFirstHeaderValue(c.req.header("cf-connecting-ip"));
    const forwardedFor = getFirstHeaderValue(c.req.header("x-forwarded-for"));
    const realIp = getFirstHeaderValue(c.req.header("x-real-ip"));

    return normalizeIp(cfConnectingIp || forwardedFor || realIp);
}

export function getRequestIp(c: Context): string {
    const trustProxy = process.env.TRUST_PROXY === "true";
    const socketIp = normalizeIp(getConnInfo(c).remote.address) || "unknown";

    if (!trustProxy) {
        return socketIp;
    }

    return getForwardedIp(c) || socketIp;
}
