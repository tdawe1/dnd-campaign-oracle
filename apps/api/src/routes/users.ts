import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { getRequestIp } from "../lib/request-ip";
import { users, campaigns, campaignMembers, apiUsage } from "../db/schema";

const app = new Hono();

// Simple in-memory rate limiting for invite code attempts (per IP)
const inviteCodeAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    const record = inviteCodeAttempts.get(ip);

    if (!record || now > record.resetAt) {
        inviteCodeAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_DURATION });
        return { allowed: true };
    }

    if (record.count >= MAX_ATTEMPTS) {
        const remainingTime = Math.ceil((record.resetAt - now) / 1000 / 60);
        return { allowed: false, remainingTime };
    }

    record.count++;
    return { allowed: true };
}

// POST /api/users/apply-invite-code - Apply invite code to current user
app.post("/apply-invite-code",
    zValidator('json', z.object({
        inviteCode: z.string().min(1).max(20)
    })),
    async (c) => {
        const clientIP = getRequestIp(c);
        const user = c.get("user") as any;

        if (!user) {
            return c.json({ error: "Not authenticated" }, 401);
        }

        // Rate limiting check
        const rateLimitCheck = checkRateLimit(clientIP);
        if (!rateLimitCheck.allowed) {
            console.warn(`[Security] Rate limited invite code attempt from IP: ${clientIP}, User: ${user.email}`);
            return c.json({
                error: "Too many attempts. Try again later.",
                retryAfterMinutes: rateLimitCheck.remainingTime
            }, 429);
        }

        const { inviteCode } = c.req.valid('json');

        // Use ONLY environment variables - no hardcoded fallbacks
        const validCode = process.env.REGISTRATION_INVITE_CODE;
        const dmCode = process.env.DM_INVITE_CODE;

        if (!validCode && !dmCode) {
            console.error("[Security] No invite codes configured in environment!");
            return c.json({ error: "Invite system not configured" }, 500);
        }

        // Determine new role based on invite code
        let newRole: string | null = null;
        if (dmCode && inviteCode === dmCode) {
            newRole = "dm";
        } else if (validCode && inviteCode === validCode) {
            newRole = "player";
        }

        // Log all attempts (success and failure)
        const isSuccess = !!newRole;
        console.log(`[Invite Code] ${isSuccess ? 'SUCCESS' : 'FAILED'} - IP: ${clientIP}, User: ${user.email}, Code: ${inviteCode.substring(0, 2)}***`);

        if (!newRole) {
            return c.json({ error: "Invalid invite code" }, 400);
        }

        // Clear rate limit on success
        inviteCodeAttempts.delete(clientIP);

        // Check if user already has this role or higher
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, user.id)
        });

        if (!currentUser) {
            return c.json({ error: "User not found" }, 404);
        }

        // Don't downgrade dm to player
        if (currentUser.role === "dm" && newRole === "player") {
            return c.json({ message: "Already have DM access", role: currentUser.role });
        }

        // Update user role and store invite code (masked)
        await db.update(users)
            .set({
                role: newRole as any,
                inviteCode: `${inviteCode.substring(0, 2)}***` // Store masked for auditing
            })
            .where(eq(users.id, user.id));

        // Auto-join campaign if not already a member
        const campaign = await db.query.campaigns.findFirst({
            where: eq(campaigns.isActive, true)
        });

        if (campaign) {
            const existingMember = await db.query.campaignMembers.findFirst({
                where: (cm, { and, eq: eqFn }) => and(
                    eqFn(cm.campaignId, campaign.id),
                    eqFn(cm.userId, user.id)
                )
            });

            if (!existingMember) {
                await db.insert(campaignMembers).values({
                    campaignId: campaign.id,
                    userId: user.id,
                    role: newRole === "dm" ? "dm" : "player"
                });
                console.log(`[Invite Code] Added user ${user.email} to campaign ${campaign.title} as ${newRole}`);
            }
        }

        return c.json({
            success: true,
            role: newRole,
            message: `Upgraded to ${newRole}!`
        });
    }
);

export { app as userRoutes };
