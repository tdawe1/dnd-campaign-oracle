import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { items, campaigns } from "../db/schema";

const app = new Hono();

const createItemSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    category: z.enum(["weapon", "armor", "consumable", "wondrous", "treasure", "misc"]).optional(),
    rarity: z.enum(["common", "uncommon", "rare", "very_rare", "legendary", "artifact"]).optional(),
    quantity: z.number().int().positive().optional(),
    characterId: z.string().uuid().nullable().optional(),
    isEquipped: z.boolean().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().url().optional(),
});

const updateItemSchema = createItemSchema.partial();

// GET /api/campaigns/:campaignId/items - List items for a campaign
app.get("/campaigns/:campaignId/items", async (c) => {
    const campaignId = c.req.param("campaignId");
    const user = c.get("user");

    // Verify user owns the campaign
    const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, user.id)),
    });

    if (!campaign) {
        return c.json({ error: "Campaign not found" }, 404);
    }

    const campaignItems = await db.query.items.findMany({
        where: eq(items.campaignId, campaignId),
        with: {
            character: true,
        },
    });

    return c.json(campaignItems);
});

// POST /api/campaigns/:campaignId/items - Create a new item
app.post("/campaigns/:campaignId/items", zValidator("json", createItemSchema), async (c) => {
    const campaignId = c.req.param("campaignId");
    const user = c.get("user");
    const body = c.req.valid("json");

    // Verify user owns the campaign
    const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, user.id)),
    });

    if (!campaign) {
        return c.json({ error: "Campaign not found" }, 404);
    }

    const [newItem] = await db.insert(items).values({
        campaignId,
        name: body.name,
        description: body.description,
        category: body.category,
        rarity: body.rarity,
        quantity: body.quantity ?? 1,
        characterId: body.characterId,
        isEquipped: body.isEquipped ?? false,
        notes: body.notes,
        imageUrl: body.imageUrl,
    }).returning();

    return c.json(newItem, 201);
});

// PATCH /api/items/:id - Update an item
app.patch("/items/:id", zValidator("json", updateItemSchema), async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");
    const body = c.req.valid("json");

    // Verify user owns the campaign that contains this item
    const item = await db.query.items.findFirst({
        where: eq(items.id, id),
        with: {
            campaign: true,
        },
    });

    if (!item || item.campaign.dmUserId !== user.id) {
        return c.json({ error: "Item not found" }, 404);
    }

    const [updatedItem] = await db.update(items)
        .set({
            ...body,
            updatedAt: new Date(),
        })
        .where(eq(items.id, id))
        .returning();

    return c.json(updatedItem);
});

// DELETE /api/items/:id - Delete an item
app.delete("/items/:id", async (c) => {
    const id = c.req.param("id");
    const user = c.get("user");

    // Verify user owns the campaign that contains this item
    const item = await db.query.items.findFirst({
        where: eq(items.id, id),
        with: {
            campaign: true,
        },
    });

    if (!item || item.campaign.dmUserId !== user.id) {
        return c.json({ error: "Item not found" }, 404);
    }

    await db.delete(items).where(eq(items.id, id));

    return c.json({ success: true });
});

export default app;
