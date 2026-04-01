import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { npcs, campaigns } from "../db/schema";

const app = new Hono();

const createNpcSchema = z.object({
    campaignId: z.string().uuid(),
    name: z.string().min(1),
    location: z.string().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().optional()
});

const updateNpcSchema = z.object({
    name: z.string().min(1).optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().optional()
});

// GET /api/npcs - List NPCs for a campaign
app.get("/", async (c) => {
    const campaignId = c.req.query("campaignId");
    if (!campaignId) return c.json({ error: "campaignId required" }, 400);

    const list = await db.query.npcs.findMany({
        where: eq(npcs.campaignId, campaignId)
    });
    return c.json(list);
});

// GET /api/npcs/:id - Get single NPC
app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const npc = await db.query.npcs.findFirst({
        where: eq(npcs.id, id)
    });
    if (!npc) return c.json({ error: "NPC not found" }, 404);
    return c.json(npc);
});

// POST /api/npcs - Create NPC
app.post("/", zValidator("json", createNpcSchema), async (c) => {
    const data = c.req.valid("json");
    const [npc] = await db.insert(npcs).values(data).returning();
    return c.json(npc, 201);
});

// PATCH /api/npcs/:id - Update NPC
app.patch("/:id", zValidator("json", updateNpcSchema), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const [updated] = await db.update(npcs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(npcs.id, id))
        .returning();

    if (!updated) return c.json({ error: "NPC not found" }, 404);
    return c.json(updated);
});

// DELETE /api/npcs/:id - Delete NPC
app.delete("/:id", async (c) => {
    const id = c.req.param("id");

    const [deleted] = await db.delete(npcs)
        .where(eq(npcs.id, id))
        .returning();

    if (!deleted) return c.json({ error: "NPC not found" }, 404);
    return c.json({ success: true, id });
});

export { app as npcRoutes };

