import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { db } from "../db";
import { characters, campaigns, campaignMembers } from "../db/schema";

const app = new Hono();

const createCharacterSchema = z.object({
    campaignId: z.string().uuid(),
    name: z.string().min(1),
    playerName: z.string().optional(),
    characterClass: z.string().optional(),
    subclass: z.string().optional(),
    level: z.number().int().min(1).optional(),
    race: z.string().optional(),
    background: z.string().optional(),
    alignment: z.string().optional(),
    hp: z.number().int().optional(),
    maxHp: z.number().int().optional(),
    ac: z.number().int().optional(),
    speed: z.number().int().optional(),
    initiative: z.number().int().optional(),
    proficiencyBonus: z.number().int().optional(),
    strength: z.number().int().min(1).max(30).optional(),
    dexterity: z.number().int().min(1).max(30).optional(),
    constitution: z.number().int().min(1).max(30).optional(),
    intelligence: z.number().int().min(1).max(30).optional(),
    wisdom: z.number().int().min(1).max(30).optional(),
    charisma: z.number().int().min(1).max(30).optional(),
    notes: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    extendedData: z.any().optional(),
});

const updateCharacterSchema = createCharacterSchema.partial().omit({ campaignId: true }).extend({
    ownerId: z.string().optional(), // Allow linking to a player
});

/**
 * Helper to verify user has access to a campaign
 * Returns the campaign if user is DM or a member, null otherwise
 */
async function verifyCampaignAccess(campaignId: string, userId: string) {
    const campaign = await db.query.campaigns.findFirst({
        where: eq(campaigns.id, campaignId),
    });
    if (!campaign) return null;

    // User is DM
    if (campaign.dmUserId === userId) return campaign;

    // User is a member of the campaign
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
 * Helper to verify user can modify a character
 * User must be either the character owner OR the campaign DM
 */
async function verifyCharacterAccess(characterId: string, userId: string) {
    const character = await db.query.characters.findFirst({
        where: eq(characters.id, characterId),
        with: { campaign: true },
    });
    if (!character) return null;

    // User owns the character
    if (character.ownerId === userId) return character;

    // User is the campaign DM
    if (character.campaign?.dmUserId === userId) return character;

    return null;
}

// GET /api/characters - List characters for a campaign
// User must be DM or a member of the campaign
app.get("/", async (c) => {
    const user = c.get("user");
    const campaignId = c.req.query("campaignId");

    if (!campaignId) return c.json({ error: "campaignId required" }, 400);

    // Verify user has access to this campaign (is DM or member)
    const campaign = await verifyCampaignAccess(campaignId, user.id);
    if (!campaign) {
        return c.json({ error: "Campaign not found or access denied" }, 404);
    }

    const list = await db.query.characters.findMany({
        where: and(
            eq(characters.campaignId, campaignId),
            eq(characters.isActive, true)
        ),
    });

    return c.json(list);
});

// POST /api/characters - Create a new character
// User must be DM or a member of the campaign
app.post("/", zValidator("json", createCharacterSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    // Verify user has access to this campaign (is DM or member)
    const campaign = await verifyCampaignAccess(data.campaignId, user.id);
    if (!campaign) {
        return c.json({ error: "Campaign not found or access denied" }, 404);
    }

    const [char] = await db.insert(characters).values({
        ...data,
        ownerId: user.id
    }).returning();

    return c.json(char, 201);
});

// PATCH /api/characters/:id - Update a character
// User must be character owner OR campaign DM
app.patch("/:id", zValidator("json", updateCharacterSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Verify user can modify this character (is owner or campaign DM)
    const character = await verifyCharacterAccess(id, user.id);
    if (!character) {
        return c.json({ error: "Character not found or access denied" }, 404);
    }

    const [updated] = await db.update(characters)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(characters.id, id))
        .returning();

    return c.json(updated);
});

// DELETE /api/characters/:id - Soft delete a character
// User must be character owner OR campaign DM
app.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    // Verify user can modify this character (is owner or campaign DM)
    const character = await verifyCharacterAccess(id, user.id);
    if (!character) {
        return c.json({ error: "Character not found or access denied" }, 404);
    }

    const [deleted] = await db.update(characters)
        .set({ isActive: false })
        .where(eq(characters.id, id))
        .returning();

    return c.json(deleted);
});

export { app as characterRoutes };
