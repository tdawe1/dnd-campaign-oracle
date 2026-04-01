import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { campaigns, characters, sessionLogs, npcs, items } from "../db/schema";

const app = new Hono();

// ============================================================================
// Roll20 Attribute Parsing Helpers
// ============================================================================

/**
 * Roll20 exports attributes as an array of {name, current, max} objects.
 * This helper extracts a specific attribute value.
 */
function getAttr(attributes: any[] | undefined, name: string): string | null {
    if (!Array.isArray(attributes)) return null;
    const attr = attributes.find((a: any) => a?.name === name);
    return attr?.current ?? null;
}

/**
 * Parse a numeric attribute, returning a default if not found or invalid
 */
function getNumAttr(attributes: any[] | undefined, name: string, defaultVal: number = 0): number {
    const val = getAttr(attributes, name);
    if (val === null) return defaultVal;
    const num = parseInt(val, 10);
    return isNaN(num) ? defaultVal : num;
}

/**
 * Extract D&D 5e character stats from Roll20 attributes array
 * Handles the official "D&D 5e by Roll20" sheet attribute names
 */
function parseD5eAttributes(attributes: any[] | undefined) {
    return {
        // Basic info
        characterClass: getAttr(attributes, "class") || getAttr(attributes, "base_level"),
        subclass: getAttr(attributes, "subclass"),
        level: getNumAttr(attributes, "level", 1) || getNumAttr(attributes, "base_level", 1),
        race: getAttr(attributes, "race"),
        subrace: getAttr(attributes, "subrace"),
        background: getAttr(attributes, "background"),
        alignment: getAttr(attributes, "alignment"),

        // Combat stats
        hp: getNumAttr(attributes, "hp", 0),
        maxHp: getNumAttr(attributes, "hp", 0), // Roll20 uses hp for both current/max with "max" field
        ac: getNumAttr(attributes, "ac", 10) || getNumAttr(attributes, "armor_class", 10),
        initiative: getNumAttr(attributes, "initiative_bonus", 0),
        speed: getNumAttr(attributes, "speed", 30),
        proficiencyBonus: getNumAttr(attributes, "pb", 2) || getNumAttr(attributes, "proficiency_bonus", 2),
        hitDice: getAttr(attributes, "hit_dice"),

        // Ability scores
        strength: getNumAttr(attributes, "strength", 10),
        dexterity: getNumAttr(attributes, "dexterity", 10),
        constitution: getNumAttr(attributes, "constitution", 10),
        intelligence: getNumAttr(attributes, "intelligence", 10),
        wisdom: getNumAttr(attributes, "wisdom", 10),
        charisma: getNumAttr(attributes, "charisma", 10),

        // Extended data for skills, saving throws, etc.
        extendedData: {
            // Saving throws proficiency
            savingThrows: {
                strength: getAttr(attributes, "strength_save_prof") === "1",
                dexterity: getAttr(attributes, "dexterity_save_prof") === "1",
                constitution: getAttr(attributes, "constitution_save_prof") === "1",
                intelligence: getAttr(attributes, "intelligence_save_prof") === "1",
                wisdom: getAttr(attributes, "wisdom_save_prof") === "1",
                charisma: getAttr(attributes, "charisma_save_prof") === "1",
            },
            // Skills - check for proficiency markers
            skills: {
                acrobatics: getNumAttr(attributes, "acrobatics_prof", 0),
                animalHandling: getNumAttr(attributes, "animal_handling_prof", 0),
                arcana: getNumAttr(attributes, "arcana_prof", 0),
                athletics: getNumAttr(attributes, "athletics_prof", 0),
                deception: getNumAttr(attributes, "deception_prof", 0),
                history: getNumAttr(attributes, "history_prof", 0),
                insight: getNumAttr(attributes, "insight_prof", 0),
                intimidation: getNumAttr(attributes, "intimidation_prof", 0),
                investigation: getNumAttr(attributes, "investigation_prof", 0),
                medicine: getNumAttr(attributes, "medicine_prof", 0),
                nature: getNumAttr(attributes, "nature_prof", 0),
                perception: getNumAttr(attributes, "perception_prof", 0),
                performance: getNumAttr(attributes, "performance_prof", 0),
                persuasion: getNumAttr(attributes, "persuasion_prof", 0),
                religion: getNumAttr(attributes, "religion_prof", 0),
                sleightOfHand: getNumAttr(attributes, "sleight_of_hand_prof", 0),
                stealth: getNumAttr(attributes, "stealth_prof", 0),
                survival: getNumAttr(attributes, "survival_prof", 0),
            },
            // Currency
            currency: {
                cp: getNumAttr(attributes, "cp", 0),
                sp: getNumAttr(attributes, "sp", 0),
                ep: getNumAttr(attributes, "ep", 0),
                gp: getNumAttr(attributes, "gp", 0),
                pp: getNumAttr(attributes, "pp", 0),
            },
            // Other fields
            experience: getNumAttr(attributes, "experience", 0),
            inspiration: getAttr(attributes, "inspiration") === "1",
            deathSaves: {
                successes: getNumAttr(attributes, "deathsave_succ1", 0) + 
                          getNumAttr(attributes, "deathsave_succ2", 0) + 
                          getNumAttr(attributes, "deathsave_succ3", 0),
                failures: getNumAttr(attributes, "deathsave_fail1", 0) + 
                         getNumAttr(attributes, "deathsave_fail2", 0) + 
                         getNumAttr(attributes, "deathsave_fail3", 0),
            },
        },
    };
}

// ============================================================================
// Zod Schemas for Roll20 Import
// ============================================================================

// Roll20 character attribute schema
const roll20AttributeSchema = z.object({
    name: z.string(),
    current: z.union([z.string(), z.number()]).optional().nullable(),
    max: z.union([z.string(), z.number()]).optional().nullable(),
}).passthrough();

// Roll20 character schema
const roll20CharacterSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    playerName: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    bio: z.string().optional().nullable(),
    gmnotes: z.string().optional().nullable(),
    attributes: z.array(roll20AttributeSchema).optional(),
    abilities: z.array(z.object({
        name: z.string(),
        action: z.string().optional(),
        istokenaction: z.boolean().optional(),
    })).optional(),
    controlledBy: z.string().optional().nullable(), // Player ID if controlled by a player
}).passthrough();

// Roll20 handout schema
const roll20HandoutSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    notes: z.string().optional().nullable(),
    gmnotes: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    inplayerjournals: z.string().optional().nullable(),
}).passthrough();

// Roll20 rollable table schema
const roll20TableSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    showplayers: z.boolean().optional(),
    items: z.array(z.object({
        id: z.string().optional(),
        name: z.string(),
        weight: z.number().optional(),
        avatar: z.string().optional().nullable(),
    })).optional(),
}).passthrough();

// Roll20 macro schema
const roll20MacroSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    action: z.string().optional(),
    visibleto: z.string().optional(),
    istokenaction: z.boolean().optional(),
}).passthrough();

// Roll20 chat message schema
const roll20ChatSchema = z.object({
    who: z.string().optional(),
    type: z.string().optional(),
    content: z.string().optional(),
    playerid: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
    rolltemplate: z.string().optional(),
    inlinerolls: z.array(z.any()).optional(),
    origRoll: z.string().optional(),
}).passthrough();

// Roll20 player schema
const roll20PlayerSchema = z.object({
    id: z.string().optional(),
    displayname: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    online: z.boolean().optional(),
    lastpage: z.string().optional(),
    color: z.string().optional(),
    speakingas: z.string().optional(),
}).passthrough();

// Roll20 token/graphic schema
const roll20TokenSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    represents: z.string().optional(), // Character ID
    left: z.number().optional(),
    top: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    rotation: z.number().optional(),
    layer: z.string().optional(),
    imgsrc: z.string().optional(),
    bar1_value: z.union([z.string(), z.number()]).optional(),
    bar1_max: z.union([z.string(), z.number()]).optional(),
    bar2_value: z.union([z.string(), z.number()]).optional(),
    bar2_max: z.union([z.string(), z.number()]).optional(),
    bar3_value: z.union([z.string(), z.number()]).optional(),
    bar3_max: z.union([z.string(), z.number()]).optional(),
    aura1_radius: z.string().optional(),
    aura1_color: z.string().optional(),
    aura2_radius: z.string().optional(),
    aura2_color: z.string().optional(),
    statusmarkers: z.string().optional(),
    light_radius: z.string().optional(),
    light_dimradius: z.string().optional(),
    light_hassight: z.boolean().optional(),
}).passthrough();

// Roll20 page/map schema
const roll20PageSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    background_color: z.string().optional(),
    grid_opacity: z.number().optional(),
    grid_type: z.string().optional(),
    scale_number: z.number().optional(),
    scale_units: z.string().optional(),
    fog_opacity: z.number().optional(),
    dynamic_lighting_enabled: z.boolean().optional(),
    daylight_mode_enabled: z.boolean().optional(),
    explorer_mode: z.string().optional(),
    // Paths for dynamic lighting walls
    paths: z.array(z.object({
        id: z.string().optional(),
        path: z.string().optional(), // SVG path data
        stroke: z.string().optional(),
        stroke_width: z.number().optional(),
        layer: z.string().optional(),
    })).optional(),
    // Graphics/tokens on this page
    graphics: z.array(roll20TokenSchema).optional(),
}).passthrough();

// Roll20 jukebox track schema
const roll20JukeboxSchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    playing: z.boolean().optional(),
    softstop: z.boolean().optional(),
    loop: z.boolean().optional(),
    volume: z.number().optional(),
    track_id: z.string().optional(),
    source: z.string().optional(), // "My Audio" or marketplace
}).passthrough();

// Roll20 deck schema (detailed)
const roll20DeckSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    showplayers: z.boolean().optional(),
    playerscandraw: z.boolean().optional(),
    avatar: z.string().optional().nullable(),
    shown: z.boolean().optional(),
    currentDeck: z.array(z.string()).optional(), // Array of card IDs in deck
    currentHand: z.string().optional(), // Player ID holding cards
    discardPile: z.array(z.string()).optional(),
    cards: z.array(z.object({
        id: z.string().optional(),
        name: z.string(),
        avatar: z.string().optional().nullable(),
        tooltip: z.string().optional(),
    })).optional(),
}).passthrough();

// Roll20 card schema (for cards in hand)
const roll20CardSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    avatar: z.string().optional().nullable(),
    deck_id: z.string().optional(),
    currentHand: z.string().optional(), // Player ID
}).passthrough();

// Import flags schema - controls which data types to import
const importFlagsSchema = z.object({
    characters: z.boolean().optional().default(true),
    npcs: z.boolean().optional().default(true),
    handouts: z.boolean().optional().default(true),
    chat: z.boolean().optional().default(true),
    tables: z.boolean().optional().default(true),
    macros: z.boolean().optional().default(true),
    pages: z.boolean().optional().default(true),
    decks: z.boolean().optional().default(true),
    jukebox: z.boolean().optional().default(true),
});

// Full Roll20 import schema - includes ALL exportable data types
const roll20ImportSchema = z.object({
    campaignId: z.string().uuid(),
    flags: importFlagsSchema,
    data: z.object({
        // Campaign info
        campaignName: z.string().optional(),
        campaignId: z.string().optional(), // Roll20 campaign ID
        
        // Core data
        characters: z.array(roll20CharacterSchema).optional(),
        handouts: z.array(roll20HandoutSchema).optional(),
        players: z.array(roll20PlayerSchema).optional(),
        
        // Tables and macros
        rollabletables: z.array(roll20TableSchema).optional(),
        macros: z.array(roll20MacroSchema).optional(),
        
        // Chat history
        chat: z.array(roll20ChatSchema).optional(),
        
        // Maps and visual elements
        pages: z.array(roll20PageSchema).optional(),
        tokens: z.array(roll20TokenSchema).optional(), // Standalone tokens
        
        // Card decks
        decks: z.array(roll20DeckSchema).optional(),
        cards: z.array(roll20CardSchema).optional(),
        
        // Audio
        jukeboxtrack: z.array(roll20JukeboxSchema).optional(),
        jukebox: z.array(roll20JukeboxSchema).optional(), // Alternative key name
        
        // Turn order / initiative tracker
        turnorder: z.union([
            z.string(), // Sometimes stored as JSON string
            z.array(z.object({
                id: z.string().optional(),
                pr: z.union([z.string(), z.number()]).optional(),
                custom: z.string().optional(),
                formula: z.string().optional(),
            })),
        ]).optional(),
        
        // Campaign settings
        campaign_settings: z.object({
            playerpageid: z.string().optional(),
            playerspecificpages: z.any().optional(),
            initiativepage: z.string().optional(),
            daylightmodeopacity: z.number().optional(),
        }).optional(),
    }).passthrough(), // Allow additional unknown fields
});

// ============================================================================
// Import Route Handler
// ============================================================================


// POST /api/import/roll20 - Import Roll20 JSON data into a campaign
app.post("/roll20", zValidator("json", roll20ImportSchema), async (c) => {
    const user = c.get("user");
    const { campaignId, flags: rawFlags, data } = c.req.valid("json");
    
    // Merge with defaults - all flags default to true if not provided
    const flags = {
        characters: rawFlags?.characters ?? true,
        npcs: rawFlags?.npcs ?? true,
        handouts: rawFlags?.handouts ?? true,
        chat: rawFlags?.chat ?? true,
        tables: rawFlags?.tables ?? true,
        macros: rawFlags?.macros ?? true,
        pages: rawFlags?.pages ?? true,
        decks: rawFlags?.decks ?? true,
        jukebox: rawFlags?.jukebox ?? true,
    };

    // Verify user owns this campaign
    const campaign = await db.query.campaigns.findFirst({
        where: and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, user.id)),
    });

    if (!campaign) {
        return c.json({ error: "Campaign not found or access denied" }, 404);
    }

    const results = {
        characters: 0,
        npcs: 0,
        sessions: 0,
        items: 0,
        tables: 0,
        macros: 0,
        pages: 0,
        decks: 0,
        jukebox: 0,
        chatMessages: 0,
        skipped: [] as string[],
        errors: [] as string[],
    };

    try {
        // ================================================================
        // Import Characters from Roll20
        // ================================================================
        if (data.characters && data.characters.length > 0) {
            for (const char of data.characters) {
                try {
                    // Determine if this is a PC or NPC
                    // PC if: has playerName, or is controlled by a player
                    const isPC = !!char.playerName || !!char.controlledBy;
                    
                    // Check flags
                    if (isPC && !flags.characters) {
                        results.skipped.push(`Character: ${char.name}`);
                        continue;
                    }
                    if (!isPC && !flags.npcs) {
                        results.skipped.push(`NPC: ${char.name}`);
                        continue;
                    }
                    
                    if (isPC) {
                        // Parse D&D 5e attributes
                        const stats = parseD5eAttributes(char.attributes);
                        
                        await db.insert(characters).values({
                            campaignId,
                            ownerId: user.id, // DM owns imported characters by default
                            name: char.name,
                            playerName: char.playerName || null,
                            avatarUrl: char.avatar || null,
                            notes: char.bio || null,
                            // Parsed stats
                            characterClass: stats.characterClass,
                            subclass: stats.subclass,
                            level: stats.level,
                            race: stats.race,
                            subrace: stats.subrace,
                            background: stats.background,
                            alignment: stats.alignment,
                            hp: stats.hp,
                            maxHp: stats.maxHp,
                            ac: stats.ac,
                            initiative: stats.initiative,
                            speed: stats.speed,
                            proficiencyBonus: stats.proficiencyBonus,
                            hitDice: stats.hitDice,
                            strength: stats.strength,
                            dexterity: stats.dexterity,
                            constitution: stats.constitution,
                            intelligence: stats.intelligence,
                            wisdom: stats.wisdom,
                            charisma: stats.charisma,
                            // Store extended data (skills, abilities, etc.)
                            extendedData: {
                                ...stats.extendedData,
                                roll20Import: {
                                    originalId: char.id,
                                    abilities: char.abilities,
                                    gmNotes: char.gmnotes,
                                },
                            },
                            isActive: true,
                        });
                        results.characters++;
                    } else {
                        // Insert as NPC - also try to parse some basic stats
                        const stats = parseD5eAttributes(char.attributes);
                        
                        await db.insert(npcs).values({
                            campaignId,
                            name: char.name,
                            notes: [
                                char.bio,
                                char.gmnotes,
                                stats.characterClass ? `Class: ${stats.characterClass}` : null,
                                stats.race ? `Race: ${stats.race}` : null,
                                stats.ac ? `AC: ${stats.ac}` : null,
                                stats.hp ? `HP: ${stats.hp}` : null,
                            ].filter(Boolean).join("\n\n") || null,
                            location: null,
                            imageUrl: char.avatar || null,
                            isActive: true,
                        });
                        results.npcs++;
                    }
                } catch (err) {
                    console.error(`Failed to import character ${char.name}:`, err);
                    results.errors.push(`Failed to import character: ${char.name}`);
                }
            }
        }

        // ================================================================
        // Import Handouts as Session Logs
        // ================================================================
        if (flags.handouts && data.handouts && data.handouts.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            
            for (let i = 0; i < data.handouts.length; i++) {
                const handout = data.handouts[i];
                try {
                    await db.insert(sessionLogs).values({
                        campaignId,
                        title: handout.name || `Handout ${i + 1}`,
                        journalEntry: handout.notes || handout.gmnotes || "",
                        sessionDate: today,
                        location: "Imported from Roll20",
                        tldr: handout.notes ? handout.notes.substring(0, 200) : null,
                    });
                    results.sessions++;
                } catch (err) {
                    console.error(`Failed to import handout ${handout.name}:`, err);
                    results.errors.push(`Failed to import handout: ${handout.name}`);
                }
            }
        }

        // ================================================================
        // Import Chat Archive as Session Transcript
        // ================================================================
        if (!flags.chat && data.chat?.length) {
            results.skipped.push(`Chat archive (${data.chat.length} messages)`);
        }
        if (flags.chat && data.chat && data.chat.length > 0) {
            try {
                // Group chat messages by date (if timestamps available)
                const chatContent = data.chat
                    .filter(msg => msg.content && msg.type !== "api") // Skip API messages
                    .map(msg => {
                        const who = msg.who || "Unknown";
                        const content = msg.content || "";
                        const timestamp = msg.timestamp 
                            ? new Date(Number(msg.timestamp)).toLocaleTimeString() 
                            : "";
                        return `[${timestamp}] ${who}: ${content}`;
                    })
                    .join("\n");

                if (chatContent.length > 0) {
                    const today = new Date().toISOString().split('T')[0];
                    await db.insert(sessionLogs).values({
                        campaignId,
                        title: "Roll20 Chat Archive",
                        journalEntry: "Imported chat log from Roll20 campaign.",
                        transcript: chatContent,
                        sessionDate: today,
                        location: "Imported from Roll20",
                    });
                    results.chatMessages = data.chat.length;
                }
            } catch (err) {
                console.error("Failed to import chat archive:", err);
                results.errors.push("Failed to import chat archive");
            }
        }

        // ================================================================
        // Import Rollable Tables (stored in campaign metadata)
        // ================================================================
        if (!flags.tables && data.rollabletables?.length) {
            results.skipped.push(`Rollable tables (${data.rollabletables.length})`);
        }
        if (flags.tables && data.rollabletables && data.rollabletables.length > 0) {
            // Store tables as items with category "misc" for now
            // This preserves the data even without a dedicated tables schema
            for (const table of data.rollabletables) {
                try {
                    await db.insert(items).values({
                        campaignId,
                        name: `[Table] ${table.name}`,
                        description: `Rollable table with ${table.items?.length || 0} entries`,
                        category: "misc",
                        notes: JSON.stringify({
                            type: "rollable_table",
                            showplayers: table.showplayers,
                            items: table.items?.map(item => ({
                                name: item.name,
                                weight: item.weight || 1,
                            })),
                        }),
                    });
                    results.tables++;
                } catch (err) {
                    console.error(`Failed to import table ${table.name}:`, err);
                    results.errors.push(`Failed to import table: ${table.name}`);
                }
            }
        }

        // ================================================================
        // Import Macros (stored as campaign items for reference)
        // ================================================================
        if (!flags.macros && data.macros?.length) {
            results.skipped.push(`Macros (${data.macros.length})`);
        }
        if (flags.macros && data.macros && data.macros.length > 0) {
            for (const macro of data.macros) {
                try {
                    await db.insert(items).values({
                        campaignId,
                        name: `[Macro] ${macro.name}`,
                        description: macro.action || "No action defined",
                        category: "misc",
                        notes: JSON.stringify({
                            type: "macro",
                            action: macro.action,
                            istokenaction: macro.istokenaction,
                            visibleto: macro.visibleto,
                        }),
                    });
                    results.macros++;
                } catch (err) {
                    console.error(`Failed to import macro ${macro.name}:`, err);
                    results.errors.push(`Failed to import macro: ${macro.name}`);
                }
            }
        }

        // ================================================================
        // Import Pages/Maps (stored as items with full metadata)
        // ================================================================
        if (!flags.pages && data.pages?.length) {
            results.skipped.push(`Pages/Maps (${data.pages.length})`);
        }
        if (flags.pages && data.pages && data.pages.length > 0) {
            for (const page of data.pages) {
                try {
                    await db.insert(items).values({
                        campaignId,
                        name: `[Map] ${page.name}`,
                        description: `Map: ${page.width || 0}x${page.height || 0} units, Scale: ${page.scale_number || 5} ${page.scale_units || 'ft'}`,
                        category: "misc",
                        notes: JSON.stringify({
                            type: "map",
                            roll20Id: page.id,
                            dimensions: { width: page.width, height: page.height },
                            scale: { number: page.scale_number, units: page.scale_units },
                            background_color: page.background_color,
                            grid: { opacity: page.grid_opacity, type: page.grid_type },
                            lighting: {
                                dynamic_lighting_enabled: page.dynamic_lighting_enabled,
                                daylight_mode_enabled: page.daylight_mode_enabled,
                                explorer_mode: page.explorer_mode,
                                fog_opacity: page.fog_opacity,
                            },
                            paths_count: page.paths?.length || 0,
                            tokens_count: page.graphics?.length || 0,
                            // Store simplified path/token data
                            paths: page.paths?.slice(0, 100), // Limit to first 100
                            tokens: page.graphics?.map(t => ({
                                name: t.name,
                                represents: t.represents,
                                layer: t.layer,
                            })),
                        }),
                    });
                    results.pages++;
                } catch (err) {
                    console.error(`Failed to import page ${page.name}:`, err);
                    results.errors.push(`Failed to import page: ${page.name}`);
                }
            }
        }

        // ================================================================
        // Import Decks (stored as items with card details)
        // ================================================================
        if (!flags.decks && data.decks?.length) {
            results.skipped.push(`Card decks (${data.decks.length})`);
        }
        if (flags.decks && data.decks && data.decks.length > 0) {
            for (const deck of data.decks) {
                try {
                    await db.insert(items).values({
                        campaignId,
                        name: `[Deck] ${deck.name}`,
                        description: `Card deck with ${deck.cards?.length || 0} cards`,
                        category: "misc",
                        imageUrl: deck.avatar || null,
                        notes: JSON.stringify({
                            type: "deck",
                            roll20Id: deck.id,
                            showplayers: deck.showplayers,
                            playerscandraw: deck.playerscandraw,
                            cards: deck.cards?.map(card => ({
                                name: card.name,
                                avatar: card.avatar,
                                tooltip: card.tooltip,
                            })),
                            currentDeck: deck.currentDeck,
                            discardPile: deck.discardPile,
                        }),
                    });
                    results.decks++;
                } catch (err) {
                    console.error(`Failed to import deck ${deck.name}:`, err);
                    results.errors.push(`Failed to import deck: ${deck.name}`);
                }
            }
        }

        // ================================================================
        // Import Jukebox Tracks (stored as items for reference)
        // ================================================================
        const jukeboxTracks = data.jukebox || data.jukeboxtrack;
        if (!flags.jukebox && jukeboxTracks?.length) {
            results.skipped.push(`Jukebox tracks (${jukeboxTracks.length})`);
        }
        if (flags.jukebox && jukeboxTracks && jukeboxTracks.length > 0) {
            for (const track of jukeboxTracks) {
                try {
                    await db.insert(items).values({
                        campaignId,
                        name: `[Audio] ${track.title}`,
                        description: `Jukebox track${track.loop ? ' (loops)' : ''}${track.source ? ` - ${track.source}` : ''}`,
                        category: "misc",
                        notes: JSON.stringify({
                            type: "jukebox_track",
                            roll20Id: track.id,
                            track_id: track.track_id,
                            volume: track.volume,
                            loop: track.loop,
                            softstop: track.softstop,
                            source: track.source,
                        }),
                    });
                    results.jukebox++;
                } catch (err) {
                    console.error(`Failed to import jukebox track ${track.title}:`, err);
                    results.errors.push(`Failed to import jukebox track: ${track.title}`);
                }
            }
        }

        // ================================================================
        // Build Response
        // ================================================================
        const summary = [
            results.characters > 0 ? `${results.characters} characters` : null,
            results.npcs > 0 ? `${results.npcs} NPCs` : null,
            results.sessions > 0 ? `${results.sessions} sessions/handouts` : null,
            results.chatMessages > 0 ? `${results.chatMessages} chat messages` : null,
            results.tables > 0 ? `${results.tables} rollable tables` : null,
            results.macros > 0 ? `${results.macros} macros` : null,
            results.pages > 0 ? `${results.pages} maps/pages` : null,
            results.decks > 0 ? `${results.decks} decks` : null,
            results.jukebox > 0 ? `${results.jukebox} jukebox tracks` : null,
            results.items > 0 ? `${results.items} items` : null,
        ].filter(Boolean).join(", ");

        return c.json({
            success: true,
            imported: results,
            message: `Imported ${summary || "nothing"}`,
            skipped: results.skipped.length > 0 ? results.skipped : undefined,
            errors: results.errors.length > 0 ? results.errors : undefined,
        });

    } catch (error) {
        console.error("Roll20 import error:", error);
        return c.json({ 
            error: "Import failed", 
            details: error instanceof Error ? error.message : "Unknown error",
            partial: results,
        }, 500);
    }
});

// ============================================================================
// Export
// ============================================================================

export { app as importRoutes };
