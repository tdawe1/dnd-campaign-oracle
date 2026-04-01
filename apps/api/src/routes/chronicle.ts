import { Hono } from "hono";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { campaigns, sessionLogs } from "../db/schema";

const app = new Hono();

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// Public Chronicle Routes (no auth required)
// ============================================================================

// GET /api/chronicle/:campaignId - Public chronicle view
app.get("/:campaignId", async (c) => {
    const campaignId = c.req.param("campaignId");

    let campaign = null;

    // Check if it's a valid UUID format first
    if (UUID_REGEX.test(campaignId)) {
        campaign = await db.query.campaigns.findFirst({
            where: eq(campaigns.id, campaignId),
        });
    }

    // If not found (or not a UUID), try Roll20 campaign ID
    if (!campaign) {
        campaign = await db.query.campaigns.findFirst({
            where: eq(campaigns.roll20CampaignId, campaignId),
        });
    }

    if (!campaign) {
        return c.json({ error: "Campaign not found" }, 404);
    }

    // Get only PUBLIC sessions, ordered by date
    const sessions = await db.query.sessionLogs.findMany({
        where: and(
            eq(sessionLogs.campaignId, campaign.id),
            eq(sessionLogs.isPublic, true)
        ),
        orderBy: desc(sessionLogs.sessionDate),
        with: {
            combat: true,
            loot: true,
        },
    });

    // Map sessions - include transcript only for the LATEST session
    const publicSessions = sessions.map((session, index) => ({
        id: session.id,
        sessionNumber: session.sessionNumber,
        title: session.title,
        date: session.sessionDate,
        location: session.location,
        tldr: session.tldr,
        journalEntry: session.journalEntry,
        // Include transcript only for the most recent session (index 0)
        transcript: index === 0 ? session.transcript : undefined,
        combat: session.combat.map(c => ({
            name: c.enemyName,
            result: c.result || ''
        })),
        loot: session.loot.map(l => ({
            name: l.itemName,
            effect: l.effect || ''
        })),
    }));

    return c.json({
        campaign: {
            id: campaign.id,
            title: campaign.title,
            description: campaign.description,
        },
        sessions: publicSessions,
    });
});

export { app as chronicleRoutes };
