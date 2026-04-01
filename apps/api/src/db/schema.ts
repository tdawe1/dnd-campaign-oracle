import {
    pgTable,
    pgEnum,
    uuid,
    text,
    integer,
    boolean,
    timestamp,
    date,
    index,
    jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["dm", "player", "spectator"]);
export const userSystemRoleEnum = pgEnum("user_system_role", ["guest", "player", "dm", "admin"]);
export const questTypeEnum = pgEnum("quest_type", ["Main", "Side", "Rumor"]);
export const questStatusEnum = pgEnum("quest_status", ["active", "completed", "failed"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "success", "warning", "ai"]);
export const characterStatusEnum = pgEnum("character_status", ["active", "inactive", "deceased"]);
export const itemRarityEnum = pgEnum("item_rarity", ["common", "uncommon", "rare", "very_rare", "legendary", "artifact"]);
export const itemCategoryEnum = pgEnum("item_category", ["weapon", "armor", "consumable", "wondrous", "treasure", "misc"]);

// Users table - Extended with Better Auth fields + custom fields
// Note: Better Auth generates string IDs, so we use text instead of uuid
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false),
    name: text("name"),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // Custom fields
    displayName: text("display_name"),
    defaultRole: roleEnum("default_role").default("player"),
    avatarUrl: text("avatar_url"),
    inviteCode: text("invite_code"), // Store used invite code for auditing

    // Subscription & Usage
    role: userSystemRoleEnum("role").default("guest"),
    oracleTokensUsed: integer("oracle_tokens_used").default(0),
    oracleTokensResetAt: timestamp("oracle_tokens_reset_at"),
    apiRequestsToday: integer("api_requests_today").default(0),
    apiRequestsResetAt: timestamp("api_requests_reset_at"),
});

// Better Auth session table
export const sessions = pgTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Better Auth accounts table (OAuth providers)
export const accounts = pgTable("accounts", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Better Auth verification table (required for OAuth/email verification)
export const verifications = pgTable("verifications", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
    id: uuid("id").primaryKey().defaultRandom(),
    dmUserId: text("dm_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    currentSessionDate: date("current_session_date"),
    isActive: boolean("is_active").default(true).notNull(),
    roll20CampaignId: text("roll20_campaign_id"), // External Roll20 campaign ID for linking
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaign Members table
export const campaignMembers = pgTable("campaign_members", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").default("player").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => {
    return {
        campaignIdx: index("idx_campaign_members_campaign").on(table.campaignId),
        userIdx: index("idx_campaign_members_user").on(table.userId),
    }
});

// Characters table
export const characters = pgTable("characters", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    playerName: text("player_name"),
    characterClass: text("character_class"),
    subclass: text("subclass"),
    level: integer("level").default(1).notNull(),
    race: text("race"),
    subrace: text("subrace"),
    background: text("background"),
    alignment: text("alignment"),
    // Combat stats
    hp: integer("hp").default(0).notNull(),
    maxHp: integer("max_hp").default(0).notNull(),
    tempHp: integer("temp_hp").default(0),
    ac: integer("ac").default(10).notNull(),
    initiative: integer("initiative").default(0),
    speed: integer("speed").default(30),
    proficiencyBonus: integer("proficiency_bonus").default(2),
    hitDice: text("hit_dice"),
    // Ability scores
    strength: integer("strength").default(10),
    dexterity: integer("dexterity").default(10),
    constitution: integer("constitution").default(10),
    intelligence: integer("intelligence").default(10),
    wisdom: integer("wisdom").default(10),
    charisma: integer("charisma").default(10),
    // Status and metadata
    status: characterStatusEnum("status").default("active"),
    notes: text("notes"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
    // Extended data as JSONB for skills, spells, inventory, traits, background details
    extendedData: jsonb("extended_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        campaignIdx: index("idx_characters_campaign").on(table.campaignId),
        ownerIdx: index("idx_characters_owner").on(table.ownerId),
    }
});

// Quests table
export const quests = pgTable("quests", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    questType: questTypeEnum("quest_type").default("Side").notNull(),
    title: text("title").notNull(),
    source: text("source"),
    description: text("description"),
    outcome: text("outcome"),
    status: questStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        campaignIdx: index("idx_quests_campaign").on(table.campaignId)
    }
});

// NPCs table
export const npcs = pgTable("npcs", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    notes: text("notes"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session Logs table
export const sessionLogs = pgTable("session_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    sessionNumber: integer("session_number"),
    title: text("title").notNull(),
    sessionDate: date("session_date").notNull(),
    location: text("location"),
    tldr: text("tldr"), // Auto-generated 2-4 sentence summary
    journalEntry: text("journal_entry"),
    keyInteractions: jsonb("key_interactions"), // Array of { npc: string, description: string }
    decisions: jsonb("decisions"), // Array of { description: string, resolved?: boolean }
    plans: jsonb("plans"), // Array of { description: string, completed?: boolean }
    transcript: text("transcript"),
    audioUrl: text("audio_url"),
    isPublic: boolean("is_public").default(false).notNull(), // Whether session is visible in public chronicle
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session Combat table
export const sessionCombat = pgTable("session_combat", {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => sessionLogs.id, { onDelete: "cascade" }),
    enemyName: text("enemy_name").notNull(),
    result: text("result"),
});

// Session Loot table
export const sessionLoot = pgTable("session_loot", {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => sessionLogs.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    effect: text("effect"),
});

// Transcript Versions table - stores AI-refined transcripts with version history
export const transcriptVersions = pgTable("transcript_versions", {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => sessionLogs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    content: text("content").notNull(), // The transcript text
    aiInstructions: text("ai_instructions"), // What user asked AI to focus on
    isActive: boolean("is_active").default(false).notNull(), // Which version is currently displayed
    isAiGenerated: boolean("is_ai_generated").default(false).notNull(), // Whether AI created this version
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    sessionIdx: index("idx_transcript_versions_session").on(table.sessionId),
    userIdx: index("idx_transcript_versions_user").on(table.userId),
}));

// Notifications table
export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    notificationType: notificationTypeEnum("notification_type").default("info").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Items table
export const items = pgTable("items", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: itemCategoryEnum("category").default("misc"),
    rarity: itemRarityEnum("rarity").default("common"),
    quantity: integer("quantity").default(1).notNull(),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "set null" }),
    isEquipped: boolean("is_equipped").default(false),
    notes: text("notes"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        campaignIdx: index("idx_items_campaign").on(table.campaignId),
        characterIdx: index("idx_items_character").on(table.characterId),
    }
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    campaigns: many(campaigns),
    campaignMemberships: many(campaignMembers),
    characters: many(characters),
    notifications: many(notifications),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
    dm: one(users, { fields: [campaigns.dmUserId], references: [users.id] }),
    members: many(campaignMembers),
    characters: many(characters),
    quests: many(quests),
    npcs: many(npcs),
    sessionLogs: many(sessionLogs),
    items: many(items),
}));

export const campaignMembersRelations = relations(campaignMembers, ({ one }) => ({
    campaign: one(campaigns, { fields: [campaignMembers.campaignId], references: [campaigns.id] }),
    user: one(users, { fields: [campaignMembers.userId], references: [users.id] }),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
    campaign: one(campaigns, { fields: [characters.campaignId], references: [campaigns.id] }),
    owner: one(users, { fields: [characters.ownerId], references: [users.id] }),
}));

export const questsRelations = relations(quests, ({ one }) => ({
    campaign: one(campaigns, { fields: [quests.campaignId], references: [campaigns.id] }),
}));

export const npcsRelations = relations(npcs, ({ one }) => ({
    campaign: one(campaigns, { fields: [npcs.campaignId], references: [campaigns.id] }),
}));

export const sessionLogsRelations = relations(sessionLogs, ({ one, many }) => ({
    campaign: one(campaigns, { fields: [sessionLogs.campaignId], references: [campaigns.id] }),
    combat: many(sessionCombat),
    loot: many(sessionLoot),
    transcriptVersions: many(transcriptVersions),
}));

export const sessionCombatRelations = relations(sessionCombat, ({ one }) => ({
    session: one(sessionLogs, { fields: [sessionCombat.sessionId], references: [sessionLogs.id] }),
}));

export const sessionLootRelations = relations(sessionLoot, ({ one }) => ({
    session: one(sessionLogs, { fields: [sessionLoot.sessionId], references: [sessionLogs.id] }),
}));

export const transcriptVersionsRelations = relations(transcriptVersions, ({ one }) => ({
    session: one(sessionLogs, { fields: [transcriptVersions.sessionId], references: [sessionLogs.id] }),
    user: one(users, { fields: [transcriptVersions.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const itemsRelations = relations(items, ({ one }) => ({
    campaign: one(campaigns, { fields: [items.campaignId], references: [campaigns.id] }),
    character: one(characters, { fields: [items.characterId], references: [characters.id] }),
}));

// API Usage tracking for rate limiting and observability
export const apiUsage = pgTable("api_usage", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    statusCode: integer("status_code"),
    responseTimeMs: integer("response_time_ms"),
    tokensUsed: integer("tokens_used").default(0),
    requestIp: text("request_ip"),
    userAgent: text("user_agent"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdx: index("idx_api_usage_user").on(table.userId),
    endpointIdx: index("idx_api_usage_endpoint").on(table.endpoint),
    createdAtIdx: index("idx_api_usage_created_at").on(table.createdAt),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
    user: one(users, { fields: [apiUsage.userId], references: [users.id] }),
}));
