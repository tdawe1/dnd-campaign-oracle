import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { sessionLogs, sessionCombat, sessionLoot, transcriptVersions, campaigns, campaignMembers } from "../db/schema";

const app = new Hono();

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Verify user has access to a campaign (is DM or member)
 */
async function verifyCampaignAccess(campaignId: string, userId: string) {
    const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, campaignId),
    });
    if (!campaign) return null;

    // User is DM
    if (campaign.dmUserId === userId) return campaign;

    // User is a member
    const membership = await db.query.campaignMembers.findFirst({
        where: and(
            eq(campaignMembers.campaignId, campaignId),
            eq(campaignMembers.userId, userId)
        ),
    });
    if (membership) return campaign;

    return null;
}

/**
 * Verify user can access a session (is DM or member of the session's campaign)
 */
async function verifySessionAccess(sessionId: string, userId: string) {
    const session = await db.query.sessionLogs.findFirst({
        where: eq(sessionLogs.id, sessionId),
        with: { campaign: true },
    });
    if (!session) return null;

    // User is DM of the campaign
    if (session.campaign?.dmUserId === userId) return session;

    // User is a member of the campaign
    const membership = await db.query.campaignMembers.findFirst({
        where: and(
            eq(campaignMembers.campaignId, session.campaignId),
            eq(campaignMembers.userId, userId)
        ),
    });
    if (membership) return session;

    return null;
}

// ============================================================================
// Schemas
// ============================================================================

const createSessionSchema = z.object({
    campaignId: z.string().uuid(),
    sessionNumber: z.number().int().optional(),
    title: z.string().min(1),
    sessionDate: z.string(), // Date string
    location: z.string().optional(),
    tldr: z.string().optional(),
    journalEntry: z.string().optional(),
    transcript: z.string().optional(),
    combat: z.array(z.object({
        enemyName: z.string(),
        result: z.string().optional()
    })).optional(),
    loot: z.array(z.object({
        itemName: z.string(),
        effect: z.string().optional()
    })).optional()
});

const updateSessionSchema = z.object({
    title: z.string().min(1).optional(),
    sessionDate: z.string().optional(),
    location: z.string().optional(),
    tldr: z.string().optional(),
    journalEntry: z.string().optional(),
    transcript: z.string().optional(),
});

// ============================================================================
// Session CRUD Routes
// ============================================================================

// GET /api/sessions - List sessions for a campaign
app.get("/", async (c) => {
    const user = c.get("user");
    const campaignId = c.req.query("campaignId");
    if (!campaignId) return c.json({ error: "campaignId required" }, 400);

    // Verify user has access to this campaign
    const campaign = await verifyCampaignAccess(campaignId, user.id);
    if (!campaign) {
        return c.json({ error: "Campaign not found or access denied" }, 404);
    }

    const logs = await db.query.sessionLogs.findMany({
        where: eq(sessionLogs.campaignId, campaignId),
        orderBy: desc(sessionLogs.sessionDate),
        with: {
            combat: true,
            loot: true
        }
    });
    return c.json(logs);
});

// GET /api/sessions/:id - Get a specific session
app.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    // Verify user has access to this session's campaign
    const session = await verifySessionAccess(id, user.id);
    if (!session) {
        return c.json({ error: "Session not found or access denied" }, 404);
    }

    const log = await db.query.sessionLogs.findFirst({
        where: eq(sessionLogs.id, id),
        with: { combat: true, loot: true }
    });
    return c.json(log);
});

// POST /api/sessions - Create a new session
app.post("/", zValidator("json", createSessionSchema), async (c) => {
    const user = c.get("user");
    const { combat, loot, ...data } = c.req.valid("json");

    // Verify user has access to this campaign
    const campaign = await verifyCampaignAccess(data.campaignId, user.id);
    if (!campaign) {
        return c.json({ error: "Campaign not found or access denied" }, 404);
    }

    return await db.transaction(async (tx) => {
        const [session] = await tx.insert(sessionLogs).values(data).returning();

        if (combat && combat.length > 0) {
            await tx.insert(sessionCombat).values(combat.map(c => ({
                sessionId: session.id,
                ...c
            })));
        }

        if (loot && loot.length > 0) {
            await tx.insert(sessionLoot).values(loot.map(l => ({
                sessionId: session.id,
                ...l
            })));
        }

        return session;
    }).then(async (session) => {
        const full = await db.query.sessionLogs.findFirst({
            where: eq(sessionLogs.id, session.id),
            with: { combat: true, loot: true }
        });
        return c.json(full, 201);
    });
});

// PATCH /api/sessions/:id - Update session
app.patch("/:id", zValidator("json", updateSessionSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Verify user has access to this session's campaign
    const session = await verifySessionAccess(id, user.id);
    if (!session) {
        return c.json({ error: "Session not found or access denied" }, 404);
    }

    const [updated] = await db.update(sessionLogs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sessionLogs.id, id))
        .returning();

    if (!updated) return c.json({ error: "Session not found" }, 404);

    const full = await db.query.sessionLogs.findFirst({
        where: eq(sessionLogs.id, id),
        with: { combat: true, loot: true }
    });
    return c.json(full);
});

// ============ TRANSCRIPT VERSION ENDPOINTS ============

// GET /api/sessions/:id/transcript-versions - List all versions
app.get("/:id/transcript-versions", async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");

    // Verify user has access to this session's campaign
    const session = await verifySessionAccess(sessionId, user.id);
    if (!session) {
        return c.json({ error: "Session not found or access denied" }, 404);
    }

    const versions = await db.query.transcriptVersions.findMany({
        where: eq(transcriptVersions.sessionId, sessionId),
        orderBy: desc(transcriptVersions.version),
    });
    return c.json(versions);
});

// POST /api/sessions/:id/transcript-versions - Create new version
const createVersionSchema = z.object({
    content: z.string(),
    aiInstructions: z.string().optional(),
    isAiGenerated: z.boolean().default(false),
});

app.post("/:id/transcript-versions", zValidator("json", createVersionSchema), async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");

    // Verify user has access to this session's campaign
    const session = await verifySessionAccess(sessionId, user.id);
    if (!session) {
        return c.json({ error: "Session not found or access denied" }, 404);
    }

    const data = c.req.valid("json");

    // Get current max version
    const existing = await db.query.transcriptVersions.findMany({
        where: eq(transcriptVersions.sessionId, sessionId),
    });

    // Check version limits (unlimited for DMs, 3 for players)
    const aiVersions = existing.filter(v => v.isAiGenerated);
    const campaign = await db.query.sessionLogs.findFirst({
        where: eq(sessionLogs.id, sessionId),
        with: { campaign: { with: { members: true } } }
    });

    const isDM = campaign?.campaign?.dmUserId === user.id ||
        campaign?.campaign?.members?.find(m => m.userId === user.id)?.role === 'dm';
    const playerLimit = 3;

    // Only enforce limit for non-DMs
    if (data.isAiGenerated && !isDM && aiVersions.length >= playerLimit) {
        return c.json({
            error: `AI version limit reached. Players can create up to ${playerLimit} AI versions.`,
            limit: playerLimit,
            used: aiVersions.length
        }, 400);
    }

    const newVersion = existing.length + 1;

    // Create new version and set as active
    await db.transaction(async (tx) => {
        // Deactivate all existing versions
        await tx.update(transcriptVersions)
            .set({ isActive: false })
            .where(eq(transcriptVersions.sessionId, sessionId));

        // Insert new version as active
        await tx.insert(transcriptVersions).values({
            sessionId,
            userId: user.id,
            version: newVersion,
            content: data.content,
            aiInstructions: data.aiInstructions,
            isAiGenerated: data.isAiGenerated,
            isActive: true,
        });

        // Update main session transcript to active version
        await tx.update(sessionLogs)
            .set({ transcript: data.content, updatedAt: new Date() })
            .where(eq(sessionLogs.id, sessionId));
    });

    return c.json({
        success: true,
        version: newVersion,
        remaining: isDM ? -1 : playerLimit - aiVersions.length - (data.isAiGenerated ? 1 : 0) // -1 means unlimited
    }, 201);
});

// PATCH /api/sessions/:id/transcript-versions/:versionId/activate - Set version as active
app.patch("/:id/transcript-versions/:versionId/activate", async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");
    const versionId = c.req.param("versionId");

    // Verify user has access to this session's campaign
    const sessionAccess = await verifySessionAccess(sessionId, user.id);
    if (!sessionAccess) {
        return c.json({ error: "Session not found or access denied" }, 404);
    }

    const version = await db.query.transcriptVersions.findFirst({
        where: and(
            eq(transcriptVersions.id, versionId),
            eq(transcriptVersions.sessionId, sessionId)
        )
    });

    if (!version) return c.json({ error: "Version not found" }, 404);

    await db.transaction(async (tx) => {
        // Deactivate all
        await tx.update(transcriptVersions)
            .set({ isActive: false })
            .where(eq(transcriptVersions.sessionId, sessionId));

        // Activate selected
        await tx.update(transcriptVersions)
            .set({ isActive: true })
            .where(eq(transcriptVersions.id, versionId));

        // Update main session transcript
        await tx.update(sessionLogs)
            .set({ transcript: version.content, updatedAt: new Date() })
            .where(eq(sessionLogs.id, sessionId));
    });

    return c.json({ success: true, activeVersion: version.version });
});

// GET /api/sessions/:id/transcript-limit - Check remaining AI versions
app.get("/:id/transcript-limit", async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");

    // Verify user has access to this session's campaign
    const sessionAccess = await verifySessionAccess(sessionId, user.id);
    if (!sessionAccess) {
        return c.json({ error: "Session not found or access denied" }, 404);
    }

    const existing = await db.query.transcriptVersions.findMany({
        where: eq(transcriptVersions.sessionId, sessionId),
    });

    const campaign = await db.query.sessionLogs.findFirst({
        where: eq(sessionLogs.id, sessionId),
        with: { campaign: { with: { members: true } } }
    });

    const isDM = campaign?.campaign?.dmUserId === user.id ||
        campaign?.campaign?.members?.find(m => m.userId === user.id)?.role === 'dm';
    const playerLimit = 3;
    const aiVersions = existing.filter(v => v.isAiGenerated).length;

    return c.json({
        limit: isDM ? -1 : playerLimit, // -1 means unlimited
        used: aiVersions,
        remaining: isDM ? -1 : playerLimit - aiVersions, // -1 means unlimited
        isDM
    });
});

// PATCH /:sessionId/visibility - Toggle session public visibility
app.patch("/:sessionId/visibility",
    zValidator('json', z.object({
        isPublic: z.boolean()
    })),
    async (c) => {
        const sessionId = c.req.param("sessionId");
        const user = c.get("user") as any;
        const { isPublic } = c.req.valid('json');

        // Verify session access and get campaign for DM check
        const session = await db.query.sessionLogs.findFirst({
            where: eq(sessionLogs.id, sessionId),
            with: {
                campaign: {
                    with: { members: true }
                }
            }
        });

        if (!session) {
            return c.json({ error: "Session not found" }, 404);
        }

        // Only DMs can toggle visibility
        const isDM = session.campaign?.dmUserId === user.id ||
            session.campaign?.members?.find(m => m.userId === user.id)?.role === 'dm';

        if (!isDM) {
            return c.json({ error: "Only DMs can change session visibility" }, 403);
        }

        // Update visibility
        await db.update(sessionLogs)
            .set({ isPublic })
            .where(eq(sessionLogs.id, sessionId));

        return c.json({ success: true, isPublic });
    }
);

export { app as sessionRoutes };
