/**
 * Search API Routes
 * 
 * Provides search endpoints using Vertex AI Search (Discovery Engine)
 * for campaign data retrieval and RAG-enhanced queries.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { 
    searchCampaign, 
    getVertexOracleContext, 
    createCampaignDataStore, 
    indexCampaignData,
    isVertexAISearchEnabled 
} from "../lib/vertexAISearch";

const app = new Hono();

// Schema for search query
const searchQuerySchema = z.object({
    q: z.string().min(1, "Query is required"),
    campaignId: z.string().uuid("Invalid campaign ID"),
    types: z.array(z.enum(['quest', 'npc', 'session', 'character'])).optional(),
    limit: z.coerce.number().min(1).max(50).optional(),
});

// Schema for Oracle context request
const oracleContextSchema = z.object({
    query: z.string().min(1, "Query is required"),
    campaignId: z.string().uuid("Invalid campaign ID"),
});

// Schema for indexing request
const indexSchema = z.object({
    campaignId: z.string().uuid("Invalid campaign ID"),
});

/**
 * GET /api/search/status
 * Check if Vertex AI Search is configured
 */
app.get("/status", async (c) => {
    return c.json({
        enabled: isVertexAISearchEnabled(),
        provider: "vertex-ai-search"
    });
});

/**
 * GET /api/search
 * Search campaign data using Vertex AI Search
 */
app.get("/", zValidator("query", searchQuerySchema), async (c) => {
    const { q, campaignId, types, limit } = c.req.valid("query");
    
    if (!isVertexAISearchEnabled()) {
        return c.json({ 
            success: false, 
            error: "Vertex AI Search not configured. Set GOOGLE_CLOUD_PROJECT environment variable."
        }, 503);
    }

    try {
        const results = await searchCampaign(q, campaignId, { 
            limit: limit || 10,
            types 
        });
        
        return c.json({
            success: true,
            query: q,
            totalResults: results.totalResults,
            results: results.documents.map(doc => ({
                id: doc.id,
                type: doc.type,
                title: doc.title,
                snippet: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
                relevance: Math.round(doc.relevanceScore * 100) / 100,
                metadata: doc.metadata
            }))
        });
    } catch (error) {
        console.error("Search error:", error);
        return c.json({ 
            success: false, 
            error: "Search failed" 
        }, 500);
    }
});

/**
 * POST /api/search/oracle-context
 * Get RAG context for Oracle chatbot using Vertex AI Search
 */
app.post("/oracle-context", zValidator("json", oracleContextSchema), async (c) => {
    const { query, campaignId } = c.req.valid("json");
    
    if (!isVertexAISearchEnabled()) {
        return c.json({ 
            success: false, 
            error: "Vertex AI Search not configured"
        }, 503);
    }

    try {
        const { ragContext, sources } = await getVertexOracleContext(query, campaignId);
        
        return c.json({
            success: true,
            context: ragContext,
            sources: sources.map(doc => ({
                id: doc.id,
                type: doc.type,
                title: doc.title,
                relevance: Math.round(doc.relevanceScore * 100) / 100
            }))
        });
    } catch (error) {
        console.error("Oracle context error:", error);
        return c.json({ 
            success: false, 
            error: "Failed to retrieve context" 
        }, 500);
    }
});

/**
 * POST /api/search/index
 * Index campaign data into Vertex AI Search
 */
app.post("/index", zValidator("json", indexSchema), async (c) => {
    const { campaignId } = c.req.valid("json");
    
    if (!isVertexAISearchEnabled()) {
        return c.json({ 
            success: false, 
            error: "Vertex AI Search not configured"
        }, 503);
    }

    try {
        // First, ensure the datastore exists
        const datastoreResult = await createCampaignDataStore(campaignId);
        if (!datastoreResult.success) {
            return c.json({ 
                success: false, 
                error: `Failed to create datastore: ${datastoreResult.error}` 
            }, 500);
        }

        // Then index the campaign data
        const indexResult = await indexCampaignData(campaignId);
        if (!indexResult.success) {
            return c.json({ 
                success: false, 
                error: `Failed to index data: ${indexResult.error}` 
            }, 500);
        }

        return c.json({
            success: true,
            dataStoreId: datastoreResult.dataStoreId,
            documentsIndexed: indexResult.documentCount,
            message: `Successfully indexed ${indexResult.documentCount} documents`
        });
    } catch (error) {
        console.error("Indexing error:", error);
        return c.json({ 
            success: false, 
            error: "Indexing failed" 
        }, 500);
    }
});

/**
 * POST /api/search/create-datastore
 * Create a Vertex AI Search datastore for a campaign
 */
app.post("/create-datastore", zValidator("json", indexSchema), async (c) => {
    const { campaignId } = c.req.valid("json");
    
    if (!isVertexAISearchEnabled()) {
        return c.json({ 
            success: false, 
            error: "Vertex AI Search not configured"
        }, 503);
    }

    try {
        const result = await createCampaignDataStore(campaignId);
        
        if (!result.success) {
            return c.json({ 
                success: false, 
                error: result.error 
            }, 500);
        }

        return c.json({
            success: true,
            dataStoreId: result.dataStoreId,
            message: `DataStore created/verified: ${result.dataStoreId}`
        });
    } catch (error) {
        console.error("Create datastore error:", error);
        return c.json({ 
            success: false, 
            error: "Failed to create datastore" 
        }, 500);
    }
});

export { app as searchRoutes };
