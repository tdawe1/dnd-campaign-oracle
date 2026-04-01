import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { campaigns, campaignMembers, characters, sessionLogs, items } from "../db/schema";

const app = new Hono();

const createCampaignSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().extend({
    isActive: z.boolean().optional(),
    currentSessionDate: z.string().optional(),
});

// GET /api/campaigns - List user's campaigns
app.get("/", async (c) => {
    const user = c.get("user");

    const userCampaigns = await db.query.campaigns.findMany({
        where: eq(campaigns.dmUserId, user.id),
        with: {
            characters: { where: eq(characters.isActive, true) },
            sessionLogs: { limit: 5, orderBy: desc(sessionLogs.sessionDate) },
        },
        orderBy: desc(campaigns.updatedAt),
    });

    return c.json(userCampaigns);
});

// GET /api/campaigns/:id - Get specific campaign
app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");

    const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, id), eq(campaigns.dmUserId, user.id)),
        with: {
            characters: true,
            sessionLogs: { orderBy: desc(sessionLogs.sessionDate) },
            quests: true,
            npcs: true,
            members: true,
            items: { with: { character: true } },
        }
    });

    if (!campaign) return c.json({ error: "Campaign not found" }, 404);
    return c.json(campaign);
});

// GET /api/campaigns/:id/members - Get campaign members with user info
app.get("/:id/members", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");

    // Verify user has access to this campaign
    const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, id),
    });
    if (!campaign) return c.json({ error: "Campaign not found" }, 404);

    const members = await db.query.campaignMembers.findMany({
        where: eq(campaignMembers.campaignId, id),
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                }
            }
        }
    });

    return c.json(members);
});

// POST /api/campaigns - Create campaign
app.post("/", zValidator("json", createCampaignSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    const [newCampaign] = await db.insert(campaigns).values({
        ...data,
        dmUserId: user.id,
    }).returning();

    await db.insert(campaignMembers).values({
        campaignId: newCampaign.id,
        userId: user.id,
        role: "dm",
    });

    return c.json(newCampaign, 201);
});

// PATCH /api/campaigns/:id - Update campaign
app.patch("/:id", zValidator("json", updateCampaignSchema), async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const data = c.req.valid("json");

    const [updated] = await db.update(campaigns)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, user.id)))
        .returning();

    if (!updated) return c.json({ error: "Campaign not found" }, 404);
    return c.json(updated);
});

// DELETE /api/campaigns/:id
app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");

    const [deleted] = await db.delete(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, user.id)))
        .returning();

    if (!deleted) return c.json({ error: "Campaign not found" }, 404);
    return c.json({ success: true, id });
});

export { app as campaignRoutes };
