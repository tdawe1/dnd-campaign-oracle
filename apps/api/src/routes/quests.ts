import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { quests } from "../db/schema";

const app = new Hono();

const createQuestSchema = z.object({
    campaignId: z.string().uuid(),
    title: z.string().min(1),
    questType: z.enum(["Main", "Side", "Rumor"]).default("Side"),
    description: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(["active", "completed", "failed"]).default("active")
});

const updateQuestSchema = z.object({
    title: z.string().min(1).optional(),
    questType: z.enum(["Main", "Side", "Rumor"]).optional(),
    description: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(["active", "completed", "failed"]).optional()
});

// GET /api/quests - List quests for a campaign
app.get("/", async (c) => {
    const campaignId = c.req.query("campaignId");
    if (!campaignId) return c.json({ error: "campaignId required" }, 400);

    const list = await db.query.quests.findMany({
        where: eq(quests.campaignId, campaignId)
    });
    return c.json(list);
});

// GET /api/quests/:id - Get single quest
app.get("/:id", async (c) => {
    const id = c.req.param("id");
    const quest = await db.query.quests.findFirst({
        where: eq(quests.id, id)
    });
    if (!quest) return c.json({ error: "Quest not found" }, 404);
    return c.json(quest);
});

// POST /api/quests - Create quest
app.post("/", zValidator("json", createQuestSchema), async (c) => {
    const data = c.req.valid("json");
    const [quest] = await db.insert(quests).values(data).returning();
    return c.json(quest, 201);
});

// PATCH /api/quests/:id - Update quest
app.patch("/:id", zValidator("json", updateQuestSchema), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const [updated] = await db.update(quests)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(quests.id, id))
        .returning();

    if (!updated) return c.json({ error: "Quest not found" }, 404);
    return c.json(updated);
});

// DELETE /api/quests/:id - Delete quest
app.delete("/:id", async (c) => {
    const id = c.req.param("id");

    const [deleted] = await db.delete(quests)
        .where(eq(quests.id, id))
        .returning();

    if (!deleted) return c.json({ error: "Quest not found" }, 404);
    return c.json({ success: true, id });
});

export { app as questRoutes };

