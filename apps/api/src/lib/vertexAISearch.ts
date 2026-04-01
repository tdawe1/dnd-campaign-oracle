/**
 * Vertex AI Search Service
 * 
 * Integrates with Google Cloud Discovery Engine (Vertex AI Search)
 * for semantic search and RAG capabilities.
 */

import { v1 as discoveryengine } from "@google-cloud/discoveryengine";
import { db } from "../db";
import { quests, npcs, sessionLogs, characters, campaigns, sessionCombat, sessionLoot } from "../db/schema";
import { eq, desc } from "drizzle-orm";

const { SearchServiceClient, DataStoreServiceClient, DocumentServiceClient } = discoveryengine;

// Configuration from environment
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.VERTEX_AI_SEARCH_LOCATION || "global";
const COLLECTION_ID = "default_collection";
const SERVING_CONFIG_ID = "default_config";

// Types for search results
export interface VertexSearchResult {
    id: string;
    type: 'quest' | 'npc' | 'session' | 'character';
    title: string;
    content: string;
    relevanceScore: number;
    metadata: Record<string, unknown>;
}

export interface VertexSearchContext {
    documents: VertexSearchResult[];
    totalResults: number;
    query: string;
}

// Get API endpoint based on location
function getApiEndpoint(): string {
    return LOCATION === 'global' 
        ? 'discoveryengine.googleapis.com' 
        : `${LOCATION}-discoveryengine.googleapis.com`;
}

// Lazy-initialized clients
let searchClient: InstanceType<typeof SearchServiceClient> | null = null;
let dataStoreClient: InstanceType<typeof DataStoreServiceClient> | null = null;
let documentClient: InstanceType<typeof DocumentServiceClient> | null = null;

function getSearchClient(): InstanceType<typeof SearchServiceClient> {
    if (!searchClient) {
        searchClient = new SearchServiceClient({
            apiEndpoint: getApiEndpoint()
        });
    }
    return searchClient;
}

function getDataStoreClient(): InstanceType<typeof DataStoreServiceClient> {
    if (!dataStoreClient) {
        dataStoreClient = new DataStoreServiceClient({
            apiEndpoint: getApiEndpoint()
        });
    }
    return dataStoreClient;
}

function getDocumentClient(): InstanceType<typeof DocumentServiceClient> {
    if (!documentClient) {
        documentClient = new DocumentServiceClient({
            apiEndpoint: getApiEndpoint()
        });
    }
    return documentClient;
}

/**
 * Get the datastore ID for a campaign
 */
function getCampaignDataStoreId(campaignId: string): string {
    // Conform to RFC-1034: lowercase, alphanumeric, hyphens, max 63 chars
    return `campaign-${campaignId.replace(/-/g, '').substring(0, 40)}`;
}

/**
 * Check if Vertex AI Search is configured
 */
export function isVertexAISearchEnabled(): boolean {
    return !!PROJECT_ID;
}

/**
 * Create a datastore for a campaign if it doesn't exist
 */
export async function createCampaignDataStore(campaignId: string): Promise<{ success: boolean; dataStoreId: string; error?: string }> {
    if (!PROJECT_ID) {
        return { success: false, dataStoreId: '', error: 'GOOGLE_CLOUD_PROJECT not configured' };
    }

    const client = getDataStoreClient();
    const dataStoreId = getCampaignDataStoreId(campaignId);
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION_ID}`;
    const dataStorePath = `${parent}/dataStores/${dataStoreId}`;

    try {
        // Check if datastore already exists
        try {
            await client.getDataStore({ name: dataStorePath });
            console.log(`DataStore ${dataStoreId} already exists`);
            return { success: true, dataStoreId };
        } catch {
            // DataStore doesn't exist, create it
        }

        // Create the datastore
        const createOperation = await client.createDataStore({
            parent,
            dataStoreId,
            dataStore: {
                displayName: `Campaign Oracle - ${campaignId}`,
                industryVertical: 'GENERIC',
                contentConfig: 'CONTENT_REQUIRED',
                solutionTypes: [1], // 1 = SOLUTION_TYPE_SEARCH
            } as any
        });

        // Wait for operation to complete
        const operation = createOperation[0];
        const [response] = await operation.promise();
        console.log(`Created DataStore: ${response.name}`);
        
        return { success: true, dataStoreId };
    } catch (error) {
        console.error('Failed to create DataStore:', error);
        return { success: false, dataStoreId, error: String(error) };
    }
}

/**
 * Index campaign documents into Vertex AI Search
 */
export async function indexCampaignData(campaignId: string): Promise<{ success: boolean; documentCount: number; error?: string }> {
    if (!PROJECT_ID) {
        return { success: false, documentCount: 0, error: 'GOOGLE_CLOUD_PROJECT not configured' };
    }

    const client = getDocumentClient();
    const dataStoreId = getCampaignDataStoreId(campaignId);
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION_ID}/dataStores/${dataStoreId}/branches/default_branch`;

    try {
        // Fetch all campaign data
        const [questData, npcData, sessionData, characterData] = await Promise.all([
            db.select().from(quests).where(eq(quests.campaignId, campaignId)),
            db.select().from(npcs).where(eq(npcs.campaignId, campaignId)),
            db.select().from(sessionLogs).where(eq(sessionLogs.campaignId, campaignId)).orderBy(desc(sessionLogs.sessionDate)),
            db.select().from(characters).where(eq(characters.campaignId, campaignId))
        ]);

        // Prepare documents for indexing
        const documents: Array<{
            id: string;
            jsonData: string;
        }> = [];

        // Add quests
        for (const quest of questData) {
            const content = `Quest: ${quest.title}\nType: ${quest.questType}\nStatus: ${quest.status}\nDescription: ${quest.description || 'No description'}\nSource: ${quest.source || 'Unknown'}\n${quest.outcome ? `Outcome: ${quest.outcome}` : ''}`;
            documents.push({
                id: `quest-${quest.id}`,
                jsonData: JSON.stringify({
                    type: 'quest',
                    title: quest.title,
                    questType: quest.questType,
                    status: quest.status,
                    description: quest.description,
                    source: quest.source,
                    outcome: quest.outcome,
                    content
                })
            });
        }

        // Add NPCs
        for (const npc of npcData) {
            const content = `NPC: ${npc.name}\nLocation: ${npc.location || 'Unknown'}\nNotes: ${npc.notes || 'No notes'}`;
            documents.push({
                id: `npc-${npc.id}`,
                jsonData: JSON.stringify({
                    type: 'npc',
                    title: npc.name,
                    location: npc.location,
                    notes: npc.notes,
                    content
                })
            });
        }

        // Add sessions
        for (const session of sessionData) {
            // Fetch combat and loot for this session
            const [combat, loot] = await Promise.all([
                db.select().from(sessionCombat).where(eq(sessionCombat.sessionId, session.id)),
                db.select().from(sessionLoot).where(eq(sessionLoot.sessionId, session.id))
            ]);

            let content = `Session: ${session.title}\nDate: ${session.sessionDate}\nLocation: ${session.location || 'Unknown'}\n`;
            if (session.journalEntry) {
                content += `Journal: ${session.journalEntry}\n`;
            }
            if (session.transcript) {
                content += `Transcript: ${session.transcript.substring(0, 5000)}\n`; // Limit transcript length
            }
            if (combat.length > 0) {
                content += `Combat: ${combat.map(c => `${c.enemyName} (${c.result})`).join(', ')}\n`;
            }
            if (loot.length > 0) {
                content += `Loot: ${loot.map(l => `${l.itemName}${l.effect ? ` - ${l.effect}` : ''}`).join(', ')}`;
            }

            documents.push({
                id: `session-${session.id}`,
                jsonData: JSON.stringify({
                    type: 'session',
                    title: session.title,
                    date: session.sessionDate,
                    location: session.location,
                    sessionNumber: session.sessionNumber,
                    content
                })
            });
        }

        // Add characters
        for (const char of characterData) {
            const content = `Character: ${char.name}\nPlayer: ${char.playerName || 'Unknown'}\nClass: ${char.characterClass || 'Unknown'} (Level ${char.level})\nRace: ${char.race || 'Unknown'}\nBackground: ${char.background || 'Unknown'}\nHP: ${char.hp}/${char.maxHp}\nAC: ${char.ac}\nStatus: ${char.status}\n${char.notes ? `Notes: ${char.notes}` : ''}`;
            documents.push({
                id: `character-${char.id}`,
                jsonData: JSON.stringify({
                    type: 'character',
                    title: char.name,
                    playerName: char.playerName,
                    class: char.characterClass,
                    level: char.level,
                    race: char.race,
                    status: char.status,
                    content
                })
            });
        }

        if (documents.length === 0) {
            return { success: true, documentCount: 0 };
        }

        // Import documents using inline source
        const [operation] = await client.importDocuments({
            parent,
            inlineSource: {
                documents: documents.map(doc => ({
                    id: doc.id,
                    jsonData: doc.jsonData,
                }))
            },
            reconciliationMode: 'INCREMENTAL' as any,
            autoGenerateIds: false,
        });

        // Wait for operation to complete
        const [response] = await operation.promise();
        console.log(`Indexed ${documents.length} documents:`, response);

        return { success: true, documentCount: documents.length };
    } catch (error) {
        console.error('Failed to index documents:', error);
        return { success: false, documentCount: 0, error: String(error) };
    }
}

/**
 * Search campaign data using Vertex AI Search
 */
export async function searchCampaign(
    query: string,
    campaignId: string,
    options: { limit?: number; types?: string[] } = {}
): Promise<VertexSearchContext> {
    const { limit = 10 } = options;

    if (!PROJECT_ID) {
        console.warn('Vertex AI Search not configured, returning empty results');
        return { documents: [], totalResults: 0, query };
    }

    const client = getSearchClient();
    const dataStoreId = getCampaignDataStoreId(campaignId);
    
    const servingConfig = `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION_ID}/dataStores/${dataStoreId}/servingConfigs/${SERVING_CONFIG_ID}`;

    try {
        const response = await client.search({
            servingConfig,
            query,
            pageSize: limit,
        }, {
            autoPaginate: false
        });

        const documents: VertexSearchResult[] = [];
        
        // The response is an array where first element contains results
        const searchResponse = response[0] as any;
        const results = Array.isArray(searchResponse) ? searchResponse : (searchResponse?.results || []);
        
        for (const result of results) {
            const doc = result.document;
            if (!doc) continue;

            // Parse the struct data - handle both protobuf and plain object
            let structData: Record<string, any> = {};
            if (doc.structData) {
                if (doc.structData.fields) {
                    // Protobuf struct format
                    structData = Object.fromEntries(
                        Object.entries(doc.structData.fields).map(([k, v]: [string, any]) => [
                            k, 
                            v?.stringValue || v?.numberValue || v?.boolValue || ''
                        ])
                    );
                } else {
                    // Plain object format
                    structData = doc.structData as Record<string, any>;
                }
            }
            
            const type = (structData.type as VertexSearchResult['type']) || 'quest';
            const title = structData.title || 'Unknown';
            const content = structData.content || '';

            documents.push({
                id: doc.id || '',
                type,
                title,
                content,
                relevanceScore: result.relevanceScore || 0,
                metadata: structData
            });
        }

        // Get total size from response
        const totalSize = searchResponse?.totalSize || documents.length;

        return {
            documents,
            totalResults: Number(totalSize),
            query
        };
    } catch (error: any) {
        // Suppress NOT_FOUND errors (code 5) as they are expected for new campaigns
        if (error.code === 5 || (error.message && error.message.includes('NOT_FOUND'))) {
             console.warn(`[Vertex AI Search] DataStore for campaign ${campaignId} not found. Skipping RAG.`);
        } else {
             console.error('Vertex AI Search error:', error);
        }
        return { documents: [], totalResults: 0, query };
    }
}

/**
 * Format search results into context for LLM
 */
export function formatVertexContextForPrompt(context: VertexSearchContext): string {
    if (context.documents.length === 0) {
        return '';
    }

    let formatted = `\n\n--- CAMPAIGN KNOWLEDGE (via Vertex AI Search) ---\n`;
    formatted += `The following information from the campaign is relevant to your question:\n\n`;

    for (const doc of context.documents) {
        formatted += `[${doc.type.toUpperCase()}] ${doc.title} (relevance: ${Math.round(doc.relevanceScore * 100)}%)\n`;
        formatted += `${doc.content}\n\n`;
    }

    formatted += `--- END CAMPAIGN KNOWLEDGE ---\n`;
    formatted += `Use this information to provide accurate, contextual responses about the campaign.\n`;

    return formatted;
}

/**
 * Get search context for Oracle (combines search + formatting)
 */
export async function getVertexOracleContext(
    query: string,
    campaignId: string
): Promise<{ ragContext: string; sources: VertexSearchResult[] }> {
    const searchResults = await searchCampaign(query, campaignId, { limit: 5 });
    
    return {
        ragContext: formatVertexContextForPrompt(searchResults),
        sources: searchResults.documents
    };
}
