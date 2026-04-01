import { z } from "zod";

/**
 * @file Shared TypeScript/Zod schemas for Campaign Oracle
 * @description Contains validation schemas and type definitions for all major entities
 * @version 1.0.0
 * @author Campaign Oracle Team
 */

// --- Helpers & Shared Validation ---

/**
 * Sanitizes input string to prevent XSS
 * @param input The string to sanitize
 * @returns Sanitized string
 */
const sanitizeInput = (input: string | undefined): string | undefined => {
    if (!input) return input;
    return input
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
};

/**
 * Validates string format as UUID
 */
const campaignIdSchema = z.string().uuid({
    message: "Invalid campaign ID format. Must be a valid UUID."
});

/**
 * Validates string format as ISO 8601 Date
 */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
    message: "Date must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ)"
});

/**
 * Schema for safe strings with sanitization
 */
const safeStringSchema = z.string()
    .min(1)
    .max(1000)
    .transform(sanitizeInput);

/**
 * Base entity schema for common fields
 */
const baseEntitySchema = z.object({
    id: z.string().uuid().optional(),
    createdAt: isoDateSchema.optional(),
    updatedAt: isoDateSchema.optional(),
    createdBy: z.string().uuid().optional()
});

// --- Enums ---
export const QuestTypeEnum = z.enum(["Main", "Side", "Rumor"]);
export const QuestStatusEnum = z.enum(["active", "completed", "failed"]);
export const RoleEnum = z.enum(["dm", "player", "spectator"]);
export const NotificationTypeEnum = z.enum(["info", "success", "warning", "ai"]);

// --- Zod Schemas ---

// Campaign

/**
 * Campaign Creation Schema
 */
export const createCampaignSchema = z.object({
    title: z.string().min(1, "Campaign title is required").max(100, "Title must be 100 characters or less").transform(sanitizeInput),
    description: z.string().max(5000, "Description must be 5000 characters or less").transform(sanitizeInput).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
    isActive: z.boolean().optional(),
    currentSessionDate: isoDateSchema.optional(),
});

// Character

/**
 * Character Creation Schema
 * Includes derived fields and custom validation logic
 */
const baseCharacterSchema = baseEntitySchema.extend({
    campaignId: campaignIdSchema,
    name: safeStringSchema,
    playerName: safeStringSchema.optional(),
    characterClass: z.string().min(1).max(50).transform(sanitizeInput).optional(),
    level: z.number().int().min(1).max(20).optional(),
    hp: z.number().int().min(0).optional(),
    maxHp: z.number().int().min(1).optional(),
    ac: z.number().int().min(0).max(100).optional(), // Increased max AC to be more realistic for high level/monsters
    notes: z.string().max(2000).transform(sanitizeInput).optional(),
    // Derived fields
    initiativeBonus: z.number().int().min(-20).max(20).optional(),
    passivePerception: z.number().int().min(0).max(50).optional()
});

const characterRefinement = (data: any, ctx: z.RefinementCtx) => {
    // Cross-field validation
    if (data.hp !== undefined && data.maxHp !== undefined && data.hp > data.maxHp) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Current HP cannot exceed maximum HP",
            path: ["hp"]
        });
    }
};

export const createCharacterSchema = baseCharacterSchema.superRefine(characterRefinement);

export const updateCharacterSchema = baseCharacterSchema.partial().omit({ campaignId: true }).superRefine(characterRefinement);

// Session

const combatArraySchema = z.array(z.object({
    enemyName: z.string().min(1, "Enemy name cannot be empty").transform(sanitizeInput),
    result: z.string().optional().transform(sanitizeInput)
})).max(50, "Combat encounters cannot exceed 50 entries").optional();

const lootArraySchema = z.array(z.object({
    itemName: z.string().min(1, "Item name cannot be empty").transform(sanitizeInput),
    effect: z.string().optional().transform(sanitizeInput)
})).max(100, "Loot items cannot exceed 100 entries").optional();

/**
 * Session Creation Schema
 * Includes duration tracking and attendance
 */
export const createSessionSchema = z.object({
    campaignId: campaignIdSchema,
    sessionNumber: z.number().int().min(1).optional(),
    title: safeStringSchema,
    sessionDate: isoDateSchema, // ISO Date string
    location: safeStringSchema.optional(),
    journalEntry: z.string().max(10000).transform(sanitizeInput).optional(),
    transcript: z.string().max(20000).transform(sanitizeInput).optional(),
    combat: combatArraySchema,
    loot: lootArraySchema,
    // New fields
    durationHours: z.number().int().min(1).max(24).optional(),
    playersPresent: z.array(z.string().uuid()).max(20).optional(),
    xpAwarded: z.number().int().min(0).optional()
}).superRefine((data, ctx) => {
    // Validate session date isn't in the future
    if (data.sessionDate) {
        const sessionDate = new Date(data.sessionDate);
        const now = new Date();
        if (sessionDate > now) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Session date cannot be in the future",
                path: ["sessionDate"]
            });
        }
    }
});

export type CreateSessionRequest = z.infer<typeof createSessionSchema>;

// Quest
export const createQuestSchema = z.object({
    campaignId: campaignIdSchema,
    title: safeStringSchema,
    questType: QuestTypeEnum.default("Side"),
    description: z.string().max(5000).transform(sanitizeInput).optional(),
    source: safeStringSchema.optional(),
    status: QuestStatusEnum.default("active")
});

export type CreateQuestRequest = z.infer<typeof createQuestSchema>;

// NPC
export const createNpcSchema = z.object({
    campaignId: campaignIdSchema,
    name: safeStringSchema,
    location: safeStringSchema.optional(),
    notes: z.string().max(2000).transform(sanitizeInput).optional(),
    imageUrl: z.string().url().optional()
});

export type CreateNpcRequest = z.infer<typeof createNpcSchema>;

// LLM
export const chatSchema = z.object({
    model: z.string().default("local/llama3.2"),
    messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().transform(sanitizeInput),
    })),
    stream: z.boolean().default(true),
    campaignContext: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatSchema>;


// --- Inference Types ---
export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignRequest = z.infer<typeof updateCampaignSchema>;

export type CreateCharacterRequest = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterRequest = z.infer<typeof updateCharacterSchema>;
