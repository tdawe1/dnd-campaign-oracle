import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { redis } from "../lib/redis"; // Import redis
import { rateLimit } from "../middleware/rate-limit"; // Import rate limit
import crypto from 'crypto';
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";
import { getVertexOracleContext, isVertexAISearchEnabled, type VertexSearchResult } from "../lib/vertexAISearch";
import { checkTokenQuota, incrementTokenUsage } from "../middleware/tiered-rate-limit";
import { getCachedOrFetch } from "../lib/cache-utils";

const app = new Hono();

// Apply rate limit specifically to completion endpoints if needed, or globally
app.use('/chat', rateLimit);

const BACKENDS = {
    ollama: {
        host: process.env.OLLAMA_HOST || "http://localhost:11434",
        chatEndpoint: "/api/chat",
        format: "ollama",
    },
    llamacpp: {
        host: process.env.LLAMACPP_HOST || "http://localhost:8080",
        chatEndpoint: "/v1/chat/completions",
        format: "openai",
    },
};

const LOCAL_BACKEND = process.env.LOCAL_LLM_BACKEND || "ollama";

const CLOUD_PROVIDERS = {
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    gemini: "vertex-ai", // Handled specially via SDK
};

// Initialize Vertex AI client (lazily, only if needed)
let vertexAI: VertexAI | null = null;
function getVertexAI() {
    if (!vertexAI && process.env.GOOGLE_CLOUD_PROJECT) {
        vertexAI = new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.VERTEX_AI_LOCATION || "us-central1",
        });
    }
    return vertexAI;
}

const chatSchema = z.object({
    model: z.string().default("local/llama3.2"),
    messages: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
    })),
    stream: z.boolean().default(true),
    campaignContext: z.string().optional(),
    // RAG options
    enableRAG: z.boolean().default(false),
    campaignId: z.string().uuid().optional(),
});

const analyzeSchema = z.object({
    type: z.enum(["audio", "transcript"]),
    data: z.string(), // Base64 audio or transcript text
    mimeType: z.string().optional(), // Required for audio
    instructions: z.string(),
});

// Health check with fallback detection
app.get("/health", async (c) => {
    const status: Record<string, boolean | string> = {};

    // Check Ollama
    try {
        const response = await fetch(`${BACKENDS.ollama.host}/api/tags`, {
            signal: AbortSignal.timeout(3000),
        });
        status.ollama = response.ok;
    } catch {
        status.ollama = false;
    }

    // Check llama.cpp
    try {
        const response = await fetch(`${BACKENDS.llamacpp.host}/health`, {
            signal: AbortSignal.timeout(3000),
        });
        status.llamacpp = response.ok;
    } catch {
        status.llamacpp = false;
    }

    status.openai = !!process.env.OPENAI_API_KEY;
    status.anthropic = !!process.env.ANTHROPIC_API_KEY;
    status.gemini = !!process.env.GOOGLE_CLOUD_PROJECT;
    status.activeBackend = LOCAL_BACKEND;

    return c.json(status);
});

// Chat completion with fallback
app.post("/chat", zValidator("json", chatSchema), async (c) => {
    try {
        const { model, messages, stream, campaignContext, enableRAG, campaignId } = c.req.valid("json");
        console.log(`[LLM] Request for model: ${model} (Provider: ${model.split("/")[0]})`);
        const [provider, modelName] = model.split("/");

        // Caching strategy (Non-streaming only for simplicity, or complex caching for streams could be done via collecting chunks)
        // For this implementation, we cache full text responses if stream is false.

        const cacheKey = `llm:${model}:${crypto.createHash('md5').update(JSON.stringify({ messages, campaignContext, enableRAG, campaignId })).digest('hex')}`;

        const user = c.get("user");
        const userId = user?.id;

        // Helper: Check Quota
        const ensureQuota = async () => {
            if (userId) {
                const { allowed, remaining, role } = await checkTokenQuota(userId);
                if (!allowed) {
                    return {
                        error: {
                            error: "Monthly token quota exceeded",
                            role,
                            message: "You have used all your Oracle tokens for this month."
                        }
                    };
                }
                console.log(`[LLM] User ${userId} (${role}) quota check passed. Remaining: ${remaining}`);
            }
            return null;
        };

        // Helper: Build Context
        const buildContext = async () => {
            let ragContext = '';
            if (enableRAG && campaignId && messages.length > 0 && isVertexAISearchEnabled()) {
                try {
                    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                    if (lastUserMessage) {
                        const ragResult = await getVertexOracleContext(lastUserMessage.content, campaignId);
                        ragContext = ragResult.ragContext;
                    }
                } catch (error) {
                    console.warn('Vertex AI Search RAG retrieval failed, continuing without context:', error);
                }
            }
            const fullContext = [campaignContext, ragContext].filter(Boolean).join('\n');
            return fullContext ? [{ role: "system" as const, content: fullContext }, ...messages] : messages;
        };

        if (!stream) {
            const result = await getCachedOrFetch(cacheKey, async () => {
                const quotaError = await ensureQuota();
                if (quotaError) return { status: 403, body: quotaError.error };

                const augmentedMessages = await buildContext();
                let response;

                if (provider === "local") {
                    response = await handleLocalChat(c, modelName, augmentedMessages, false);
                } else if (provider === "openai") {
                    response = await handleOpenAIChat(c, modelName, augmentedMessages, false);
                } else if (provider === "anthropic") {
                    response = await handleAnthropicChat(c, modelName, augmentedMessages, false);
                } else if (provider === "gemini") {
                    if (userId) await incrementTokenUsage(userId, 100);
                    response = await handleGeminiChat(c, modelName, augmentedMessages, false);
                } else {
                    return { status: 400, body: { error: "Unknown provider" } };
                }

                if (!response.ok) {
                    return { status: response.status, body: await response.json() };
                }

                return { status: 200, body: await response.json() };
            }, 3600, (res) => res.status === 200);

            return c.json(result.body, result.status as any);
        }

        // Streaming Path
        const quotaError = await ensureQuota();
        if (quotaError) return c.json(quotaError.error, 403);

        const augmentedMessages = await buildContext();

        if (provider === "local") return handleLocalChat(c, modelName, augmentedMessages, true);
        if (provider === "openai") return handleOpenAIChat(c, modelName, augmentedMessages, true);
        if (provider === "anthropic") return handleAnthropicChat(c, modelName, augmentedMessages, true);
        if (provider === "gemini") {
            if (userId) await incrementTokenUsage(userId, 100);
            return handleGeminiChat(c, modelName, augmentedMessages, true);
        }

        return c.json({ error: "Unknown provider" }, 400);
    } catch (criticalError) {
        console.error("[LLM] CRITICAL ERROR IN CHAT ENDPOINT:", criticalError);
        return c.json({
            error: "Internal Server Error during Chat",
            details: String(criticalError)
        }, 500);
    }
});

// Analyze endpoint for structured session data (Audio/Text) -> Converted to Streaming to avoid Cloudflare timeouts
app.post("/analyze", async (c) => {
    // Debug: Log raw body before validation
    let rawBody: any;
    try {
        rawBody = await c.req.json();
        console.log(`[Analyze] Raw body keys:`, Object.keys(rawBody || {}));
        console.log(`[Analyze] type=${rawBody?.type}, data length=${rawBody?.data?.length || 0}, instructions length=${rawBody?.instructions?.length || 0}`);
    } catch (e) {
        console.error(`[Analyze] Failed to parse JSON:`, e);
        return c.json({ error: "Invalid JSON body" }, 400);
    }

    // Validate manually
    const parseResult = analyzeSchema.safeParse(rawBody);
    if (!parseResult.success) {
        console.error(`[Analyze] Validation failed:`, parseResult.error.flatten());
        return c.json({ error: "Validation failed", details: parseResult.error.flatten() }, 400);
    }

    const { type, data, mimeType, instructions } = parseResult.data;
    console.log(`[Analyze] Request received - type: ${type}, mimeType: ${mimeType}, dataSize: ${data?.length || 0} chars`);

    // Only support Gemini for this sophisticated analysis
    const vertexAI = getVertexAI();
    if (!vertexAI) {
        return c.json({ error: "Gemini not configured on server (GOOGLE_CLOUD_PROJECT missing)." }, 503);
    }

    const model = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const sessionSchema = {
        type: "OBJECT",
        properties: {
            title: { type: "STRING", description: "A creative title for the session based on events." },
            location: { type: "STRING", description: "The primary location(s) where the session took place." },
            journalEntry: { type: "STRING", description: "A narrative journal entry summarizing the session from a third-party perspective." },
            combat: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        result: { type: "STRING" }
                    }
                }
            },
            loot: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        effect: { type: "STRING" }
                    }
                }
            }
        },
        required: ["title", "location", "journalEntry", "combat", "loot"]
    };

    const parts: any[] = [];
    if (type === "audio") {
        if (!mimeType) return c.json({ error: "mimeType required for audio" }, 400);
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: data // Base64
            }
        });
    } else {
        parts.push({ text: `TRANSCRIPT:\n${data}` });
    }

    parts.push({ text: `You are an expert D&D scribe. ${instructions}` });

    const cacheKey = `analyze:${crypto.createHash('md5').update(JSON.stringify({ type, data, instructions })).digest('hex')}`;

    // Check Cache First
    const cached = redis ? await redis.get(cacheKey) : null;
    if (cached) {
        // Return cached result in SSE format so frontend can parse it
        return streamSSE(c, async (stream) => {
            await stream.writeSSE({ event: 'done', data: JSON.stringify({ fullText: cached }) });
        });
    }

    // If miss, Stream response
    return streamSSE(c, async (stream) => {
        try {
            console.log(`[Analyze] Starting Vertex AI streaming call...`);
            const result = await model.generateContentStream({
                contents: [{ role: "user", parts }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: sessionSchema as any
                }
            });

            let fullText = "";

            for await (const chunk of result.stream) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                    fullText += text;
                    await stream.writeSSE({ data: JSON.stringify({ chunk: text }) });
                }
            }

            console.log(`[Analyze] Streaming complete, fullText length: ${fullText.length}`);

            // Cache the full result if valid
            try {
                JSON.parse(fullText); // Validate
                if (redis) {
                    await redis.set(cacheKey, fullText, "EX", 3600); // 1 hour text cache
                }
            } catch (e) {
                console.warn("Analysis validation failed, not caching:", e);
            }

            await stream.writeSSE({ event: 'done', data: JSON.stringify({ fullText }) });
        } catch (error) {
            console.error(`[Analyze] Vertex AI Error:`, error);
            await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: String(error) }) });
        }
    });
});

// Combat-specific analysis endpoint for detailed combat log extraction
const combatAnalyzeSchema = z.object({
    transcript: z.string(),
    sessionId: z.string().uuid().optional(),
});

app.post("/analyze-combat", zValidator("json", combatAnalyzeSchema), async (c) => {
    const { transcript, sessionId } = c.req.valid("json");

    const vertexAI = getVertexAI();
    if (!vertexAI) {
        return c.json({ error: "Gemini not configured on server (GOOGLE_CLOUD_PROJECT missing)." }, 503);
    }

    const model = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const combatSchema = {
        type: "OBJECT",
        properties: {
            combatEncounters: {
                type: "ARRAY",
                description: "List of distinct combat encounters in the session",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Name of the encounter (e.g., 'Battle with Ogre Guard')" },
                        result: { type: "STRING", description: "Victory, Defeat, Ongoing, or Fled" },
                        initiativeOrder: {
                            type: "ARRAY",
                            description: "Turn order if mentioned",
                            items: { type: "STRING" }
                        },
                        events: {
                            type: "ARRAY",
                            description: "Combat events in chronological order",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    round: { type: "INTEGER", description: "Combat round number (0 if unknown)" },
                                    actor: { type: "STRING", description: "Who is taking the action" },
                                    action: { type: "STRING", description: "What they did (e.g., 'attacks', 'casts Fireball', 'moves')" },
                                    target: { type: "STRING", description: "Target of the action if any" },
                                    roll: { type: "INTEGER", description: "D20 roll result if mentioned" },
                                    damage: { type: "STRING", description: "Damage dealt (e.g., '14', '3d8=17')" },
                                    effect: { type: "STRING", description: "Special effects (e.g., 'Banished', 'Prone', 'Concentrated')" },
                                    type: { type: "STRING", description: "Event type: attack, spell, ability, damage, heal, status, movement" }
                                },
                                required: ["actor", "action", "type"]
                            }
                        }
                    },
                    required: ["name", "result", "events"]
                }
            }
        },
        required: ["combatEncounters"]
    };

    const prompt = `You are an expert D&D combat log analyzer. Extract detailed combat events from this session transcript.
    
    Focus on:
    - Combat encounters (who fought whom, outcome)
    - Initiative order if mentioned
    - Individual attacks, spells, and abilities used
    - Damage dealt and taken (look for numbers, dice rolls like "3d8", "14 damage")
    - Spell effects (Banishment, Spirit Guardians, etc.)
    - Status effects (prone, unconscious, etc.)
    - Movement and tactical decisions
    
    Parse natural dialogue like:
    - "I attack with my sword" -> attack action
    - "That's 14 damage" -> damage event
    - "He's banished" -> status effect
    - "3d8... he's dead" -> damage leading to death
    
    TRANSCRIPT:
    ${transcript.slice(0, 30000)}
    
    Extract all combat-related events you can find. If unsure about round numbers, use 0.`;

    const cacheKey = `combat:${crypto.createHash('md5').update(JSON.stringify({ transcript, sessionId })).digest('hex')}`;

    // Check Cache
    const cached = redis ? await redis.get(cacheKey) : null;
    if (cached) {
        // Return cached result in SSE format so frontend can parse it
        return streamSSE(c, async (stream) => {
            await stream.writeSSE({ event: 'done', data: JSON.stringify({ fullText: cached }) });
        });
    }

    // Stream Response
    return streamSSE(c, async (stream) => {
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: combatSchema as any,
                temperature: 0.1,
            }
        });

        let fullText = "";

        for await (const chunk of result.stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
                fullText += text;
                await stream.writeSSE({ data: JSON.stringify({ chunk: text }) });
            }
        }

        try {
            JSON.parse(fullText);
            if (redis) {
                await redis.set(cacheKey, fullText, "EX", 3600);
            }
        } catch (e) {
            console.warn("Combat analysis validation failed, not caching:", e);
        }

        await stream.writeSSE({ event: 'done', data: JSON.stringify({ fullText }) });
    });
});

// Transcript refinement endpoint - refines transcript based on user instructions
const refineTranscriptSchema = z.object({
    transcript: z.string(),
    instructions: z.string().describe("What to focus on or change in the transcript"),
    focusAreas: z.array(z.string()).optional().describe("Specific areas to emphasize (e.g., 'combat', 'roleplay', 'NPCs')"),
});

app.post("/refine-transcript", zValidator("json", refineTranscriptSchema), async (c) => {
    const { transcript, instructions, focusAreas } = c.req.valid("json");

    const vertexAI = getVertexAI();
    if (!vertexAI) {
        return c.json({ error: "Gemini not configured on server (GOOGLE_CLOUD_PROJECT missing)." }, 503);
    }

    const generativeModel = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const focusText = focusAreas?.length
        ? `\n\nSpecific areas to focus on: ${focusAreas.join(', ')}`
        : '';

    const prompt = `You are an expert D&D session transcript editor. 
    
Your task is to refine and improve the following session transcript based on these instructions:

USER INSTRUCTIONS: ${instructions}${focusText}

ORIGINAL TRANSCRIPT:
${transcript.slice(0, 50000)}

IMPORTANT: You must output the COMPLETE refined transcript. DO NOT summarize or shorten it. The output should be roughly the same length as the input (${transcript.length} characters). Apply the user's instructions while preserving ALL the original content and events.

Requirements:
1. Follow the user's specific instructions
2. Maintain accuracy to the original events  
3. Improve readability and formatting
4. Preserve important game details (dice rolls, damage, spell effects)
5. Keep the natural conversational flow
6. Output the FULL transcript, not a summary

Return ONLY the refined transcript text, without any explanations or meta-commentary.`;

    console.log(`[Transcript Refine] Processing ${transcript.length} chars (streaming)`);

    // Use native ReadableStream for proper SSE streaming
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Send initial ping to establish connection
                controller.enqueue(encoder.encode(`event: ping\ndata: {"status":"starting"}\n\n`));

                const result = await generativeModel.generateContentStream({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 32000,
                    }
                });

                let fullText = '';
                let chunkCount = 0;

                for await (const chunk of result.stream) {
                    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                        fullText += text;
                        chunkCount++;
                        const data = JSON.stringify({ text, chunkIndex: chunkCount });
                        controller.enqueue(encoder.encode(`event: chunk\ndata: ${data}\n\n`));
                    }
                }

                console.log(`[Transcript Refine] Streamed ${chunkCount} chunks, ${fullText.length} chars`);

                // Send final done event
                const doneData = JSON.stringify({
                    refinedTranscript: fullText,
                    originalLength: transcript.length,
                    refinedLength: fullText.length
                });
                controller.enqueue(encoder.encode(`event: done\ndata: ${doneData}\n\n`));
                controller.close();
            } catch (error: any) {
                console.error("[Transcript Refine] Stream error:", error?.message);
                const errData = JSON.stringify({ error: error?.message || "Refinement failed" });
                controller.enqueue(encoder.encode(`event: error\ndata: ${errData}\n\n`));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

// ============================================================================
// Transcript Transformation Pipeline
// ============================================================================

const transformTypes = [
    'speaker-attribution',
    'timestamp-cleanup',
    'paragraph-format',
    'noise-removal',
    'action-tagging',
    'dialogue-format',
    'full-cleanup'
] as const;

const transformTranscriptSchema = z.object({
    transcript: z.string().min(1),
    transformType: z.enum(transformTypes),
    options: z.object({
        characterMapping: z.array(z.object({
            player: z.string(),
            character: z.string()
        })).optional(),
        dmName: z.string().optional(),
        removeTimestamps: z.boolean().optional(),
    }).optional(),
});

const TRANSFORM_PROMPTS: Record<typeof transformTypes[number], (options?: any) => string> = {
    'speaker-attribution': (options) => {
        const mapping = options?.characterMapping || [
            { player: 'Thomas', character: 'Erato', initial: 'T' },
            { player: 'Lucy', character: 'Arfine', initial: 'L' },
            { player: 'Amanda', character: 'Shava', initial: 'A' },
            { player: 'Kevin', character: 'Vorth', initial: 'K' },
        ];
        const dmName = options?.dmName || 'Richard';
        const mapStr = mapping.map((m: any) => `${m.initial || m.player[0]} / ${m.player} → ${m.character}`).join(', ');
        return `You are a transcript editor. Replace all player names and initials with their character names.
Mapping: ${mapStr}
DM: R / ${dmName} (controls NPCs like Magnolius)

Rules:
- Replace speaker initials like "T:" or "T as" with character names like "Erato:"
- Replace full names like "Thomas:" with "Erato:"
- Keep NPC names when the DM is clearly speaking as an NPC
- Preserve all other content exactly
- Output ONLY the transformed transcript, no explanations`;
    },
    'timestamp-cleanup': () => `You are a transcript editor. Clean up timestamps in this transcript.
Rules:
- Remove timestamps like [00:15:32] or (1:23:45) 
- Keep the content and flow intact
- Output ONLY the cleaned transcript, no explanations`,

    'paragraph-format': () => `You are a transcript editor. Format this transcript into readable paragraphs.
Rules:
- Group related dialogue and actions together
- Add blank lines between scene changes or topic shifts
- Keep speaker attributions on their own lines
- Don't change any words, just add line breaks
- Output ONLY the formatted transcript, no explanations`,

    'noise-removal': () => `You are a transcript editor. Remove noise from this D&D session transcript.
Rules:
- Remove filler words: "um", "uh", "like", "you know"
- Remove false starts and stutters
- Remove off-topic tangents (food orders, bathroom breaks, tech issues)
- Remove crosstalk and interruptions that don't add to the story
- Preserve all game-relevant content
- Output ONLY the cleaned transcript, no explanations`,

    'action-tagging': () => `You are a transcript editor. Add action tags to this D&D session transcript.
Rules:
- Add [COMBAT] before combat sequences
- Add [ROLL: X] or [ROLL: nat 20!] for dice rolls mentioned
- Add [RP] before roleplay-heavy sections
- Add [LOOT] when items are found/distributed
- Add [TRAVEL] for travel montages
- Don't over-tag, only significant moments
- Output ONLY the tagged transcript, no explanations`,

    'dialogue-format': () => `You are a transcript editor. Format dialogue clearly in this D&D transcript.
Rules:
- Put NPC dialogue in quotes with the NPC name
- Use *asterisks* for actions and descriptions
- Use **bold markers** for important game mechanics
- Keep player/character speech clear
- Example: Magnolius: "Welcome, adventurers." *He gestures to the map.*
- Output ONLY the formatted transcript, no explanations`,

    'full-cleanup': () => `You are a master transcript editor. Perform a complete cleanup of this D&D session transcript.

Apply ALL of the following transformations:
1. Replace player initials/names with character names (T/Thomas→Erato, L/Lucy→Arfine, A/Amanda→Shava, K/Kevin→Vorth, R is the DM Richard)
2. Remove timestamps
3. Remove filler words (um, uh, like) and off-topic chatter
4. Format into readable paragraphs
5. Add action tags: [COMBAT], [ROLL: X], [RP], [LOOT]
6. Format dialogue: NPC speech in quotes, actions in *asterisks*

Output ONLY the fully transformed transcript, no explanations.`,
};

app.post("/transform-transcript", zValidator("json", transformTranscriptSchema), async (c) => {
    const { transcript, transformType, options } = c.req.valid("json");

    const vertexAI = getVertexAI();
    if (!vertexAI) {
        return c.json({ error: "Gemini not configured on server (GOOGLE_CLOUD_PROJECT missing)." }, 503);
    }

    const model = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    const promptFn = TRANSFORM_PROMPTS[transformType];
    const systemPrompt = promptFn(options);

    const prompt = `${systemPrompt}

TRANSCRIPT TO TRANSFORM:
${transcript.slice(0, 50000)}`;

    console.log(`[Transform] Starting ${transformType} transformation (${transcript.length} chars)`);

    // Use streaming for real-time updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            let isClosed = false;

            const safeEnqueue = (data: Uint8Array) => {
                if (!isClosed) {
                    try {
                        controller.enqueue(data);
                    } catch (e) {
                        isClosed = true;
                    }
                }
            };

            const safeClose = () => {
                if (!isClosed) {
                    isClosed = true;
                    try {
                        controller.close();
                    } catch (e) {
                        // Already closed
                    }
                }
            };

            try {
                safeEnqueue(encoder.encode(`event: ping\ndata: {}\n\n`));

                console.log(`[Transform] Calling Vertex AI for ${transformType}...`);
                const result = await model.generateContentStream({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 32000,
                    }
                });
                console.log(`[Transform] Got stream, starting iteration...`);
                let fullText = '';
                let chunkCount = 0;

                for await (const chunk of result.stream) {
                    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                        fullText += text;
                        chunkCount++;
                        const chunkData = JSON.stringify({ chunk: text, chunkIndex: chunkCount });
                        safeEnqueue(encoder.encode(`event: chunk\ndata: ${chunkData}\n\n`));
                    }
                }

                console.log(`[Transform] ${transformType}: ${chunkCount} chunks, ${fullText.length} chars output`);

                const doneData = JSON.stringify({
                    transformedTranscript: fullText,
                    transformType,
                    originalLength: transcript.length,
                    transformedLength: fullText.length
                });
                safeEnqueue(encoder.encode(`event: done\ndata: ${doneData}\n\n`));
                safeClose();
            } catch (error: any) {
                console.error(`[Transform] ${transformType} error:`, error?.message);
                const errData = JSON.stringify({ error: error?.message || "Transformation failed" });
                safeEnqueue(encoder.encode(`event: error\ndata: ${errData}\n\n`));
                safeClose();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

async function handleLocalChat(c: any, model: string, messages: any[], stream: boolean) {
    const backend = BACKENDS[LOCAL_BACKEND as keyof typeof BACKENDS];

    if (backend.format === "ollama") {
        const response = await fetch(`${backend.host}${backend.chatEndpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages, stream }),
        });

        if (!response.ok) throw new Error("Ollama request failed");

        if (stream) {
            return streamSSE(c, async (sseStream) => {
                const reader = response.body?.getReader();
                if (!reader) return;
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    await sseStream.writeSSE({ data: decoder.decode(value) });
                }
            });
        }

        return c.json(await response.json());
    }

    // llama.cpp OpenAI-compatible format
    const response = await fetch(`${backend.host}${backend.chatEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream }),
    });

    if (!response.ok) throw new Error("llama.cpp request failed");
    return c.json(await response.json());
}

async function handleOpenAIChat(c: any, model: string, messages: any[], stream: boolean) {
    const response = await fetch(`${CLOUD_PROVIDERS.openai}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model, messages, stream }),
    });

    if (stream) {
        return streamSSE(c, async (sseStream) => {
            const reader = response.body?.getReader();
            if (!reader) return;
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await sseStream.writeSSE({ data: decoder.decode(value) });
            }
        });
    }

    return c.json(await response.json());
}

async function handleAnthropicChat(c: any, model: string, messages: any[], stream: boolean) {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(`${CLOUD_PROVIDERS.anthropic}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemMessage?.content,
            messages: chatMessages,
            stream,
        }),
    });

    return c.json(await response.json());
}

async function handleGeminiChat(c: any, model: string, messages: any[], stream: boolean) {
    const vertexAI = getVertexAI();
    if (!vertexAI) {
        console.error("[Gemini] Not configured. Missing GOOGLE_CLOUD_PROJECT");
        return c.json({ error: "Gemini not configured. Set GOOGLE_CLOUD_PROJECT." }, 503);
    }
    // Map model names to Gemini model names
    const geminiModel = model || "gemini-2.5-flash";

    console.log(`[Gemini] Starting chat with model ${geminiModel}`);

    // Get generative model
    const generativeModel = vertexAI.getGenerativeModel({
        model: geminiModel,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
    });

    // Convert messages to Gemini format
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));

    // Start chat with system instruction
    const chat = generativeModel.startChat({
        history: chatMessages.slice(0, -1),
        systemInstruction: systemMessage?.content,
    });

    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage) {
        return c.json({ error: "No messages provided" }, 400);
    }

    if (stream) {
        return streamSSE(c, async (sseStream) => {
            const result = await chat.sendMessageStream(lastMessage.parts[0].text);
            for await (const chunk of result.stream) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                    await sseStream.writeSSE({ data: JSON.stringify({ content: text }) });
                }
            }
        });
    }

    // Non-streaming response
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return c.json({
        choices: [{
            message: { role: "assistant", content: text }
        }]
    });
}

export { app as llmRoutes };
