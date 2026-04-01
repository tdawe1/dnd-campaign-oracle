/**
 * RAG (Retrieval Augmented Generation) Service
 * 
 * Provides intelligent context retrieval from campaign data
 * to enhance Oracle chatbot responses.
 */

import { db } from "../db";
import { quests, npcs, sessionLogs, characters, campaigns, sessionCombat, sessionLoot } from "../db/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";

// Types for RAG context
export interface RAGDocument {
    type: 'quest' | 'npc' | 'session' | 'character';
    id: string;
    title: string;
    content: string;
    relevanceScore: number;
    metadata: Record<string, unknown>;
}

export interface RAGContext {
    documents: RAGDocument[];
    totalResults: number;
    query: string;
}

export interface SearchOptions {
    types?: ('quest' | 'npc' | 'session' | 'character')[];
    limit?: number;
    minRelevance?: number;
}

/**
 * Calculate simple relevance score based on keyword matching
 */
function calculateRelevance(text: string, query: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const textLower = text.toLowerCase();
    
    if (queryTerms.length === 0) return 0;
    
    let matches = 0;
    let exactMatches = 0;
    
    for (const term of queryTerms) {
        if (textLower.includes(term)) {
            matches++;
            // Bonus for word boundary matches
            const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
            if (wordBoundaryRegex.test(text)) {
                exactMatches++;
            }
        }
    }
    
    // Base score from term coverage + bonus for exact matches
    const coverage = matches / queryTerms.length;
    const exactBonus = exactMatches / queryTerms.length * 0.3;
    
    return Math.min(1, coverage + exactBonus);
}

/**
 * Search campaign data and retrieve relevant documents
 */
export async function searchCampaignData(
    query: string,
    campaignId: string,
    options: SearchOptions = {}
): Promise<RAGContext> {
    const { 
        types = ['quest', 'npc', 'session', 'character'],
        limit = 10,
        minRelevance = 0.2
    } = options;
    
    const documents: RAGDocument[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    // Build search patterns for ILIKE
    const searchPatterns = queryTerms.map(term => `%${term}%`);
    
    // Search Quests
    if (types.includes('quest')) {
        const questResults = await db.select()
            .from(quests)
            .where(eq(quests.campaignId, campaignId))
            .limit(limit * 2); // Get more, then filter by relevance
        
        for (const quest of questResults) {
            const searchableText = `${quest.title} ${quest.description || ''} ${quest.source || ''} ${quest.outcome || ''}`;
            const relevance = calculateRelevance(searchableText, query);
            
            if (relevance >= minRelevance) {
                documents.push({
                    type: 'quest',
                    id: quest.id,
                    title: quest.title,
                    content: `Quest: ${quest.title}\nType: ${quest.questType}\nStatus: ${quest.status}\nDescription: ${quest.description || 'No description'}\n${quest.outcome ? `Outcome: ${quest.outcome}` : ''}`,
                    relevanceScore: relevance,
                    metadata: {
                        questType: quest.questType,
                        status: quest.status,
                        source: quest.source
                    }
                });
            }
        }
    }
    
    // Search NPCs
    if (types.includes('npc')) {
        const npcResults = await db.select()
            .from(npcs)
            .where(eq(npcs.campaignId, campaignId))
            .limit(limit * 2);
        
        for (const npc of npcResults) {
            const searchableText = `${npc.name} ${npc.location || ''} ${npc.notes || ''}`;
            const relevance = calculateRelevance(searchableText, query);
            
            if (relevance >= minRelevance) {
                documents.push({
                    type: 'npc',
                    id: npc.id,
                    title: npc.name,
                    content: `NPC: ${npc.name}\nLocation: ${npc.location || 'Unknown'}\nNotes: ${npc.notes || 'No notes'}`,
                    relevanceScore: relevance,
                    metadata: {
                        location: npc.location
                    }
                });
            }
        }
    }
    
    // Search Sessions
    if (types.includes('session')) {
        const sessionResults = await db.select()
            .from(sessionLogs)
            .where(eq(sessionLogs.campaignId, campaignId))
            .orderBy(desc(sessionLogs.sessionDate))
            .limit(limit * 2);
        
        for (const session of sessionResults) {
            const searchableText = `${session.title} ${session.location || ''} ${session.journalEntry || ''} ${session.transcript || ''}`;
            const relevance = calculateRelevance(searchableText, query);
            
            if (relevance >= minRelevance) {
                // Fetch combat and loot for this session
                const [combat, loot] = await Promise.all([
                    db.select().from(sessionCombat).where(eq(sessionCombat.sessionId, session.id)),
                    db.select().from(sessionLoot).where(eq(sessionLoot.sessionId, session.id))
                ]);
                
                let content = `Session: ${session.title}\nDate: ${session.sessionDate}\nLocation: ${session.location || 'Unknown'}\n`;
                if (session.journalEntry) {
                    // Truncate long journal entries
                    const journal = session.journalEntry.length > 500 
                        ? session.journalEntry.substring(0, 500) + '...'
                        : session.journalEntry;
                    content += `Journal: ${journal}\n`;
                }
                if (combat.length > 0) {
                    content += `Combat: ${combat.map(c => `${c.enemyName} (${c.result})`).join(', ')}\n`;
                }
                if (loot.length > 0) {
                    content += `Loot: ${loot.map(l => `${l.itemName}${l.effect ? ` - ${l.effect}` : ''}`).join(', ')}`;
                }
                
                documents.push({
                    type: 'session',
                    id: session.id,
                    title: session.title,
                    content,
                    relevanceScore: relevance,
                    metadata: {
                        date: session.sessionDate,
                        location: session.location,
                        sessionNumber: session.sessionNumber
                    }
                });
            }
        }
    }
    
    // Search Characters
    if (types.includes('character')) {
        const characterResults = await db.select()
            .from(characters)
            .where(eq(characters.campaignId, campaignId))
            .limit(limit * 2);
        
        for (const char of characterResults) {
            const searchableText = `${char.name} ${char.playerName || ''} ${char.characterClass || ''} ${char.race || ''} ${char.background || ''} ${char.notes || ''}`;
            const relevance = calculateRelevance(searchableText, query);
            
            if (relevance >= minRelevance) {
                documents.push({
                    type: 'character',
                    id: char.id,
                    title: char.name,
                    content: `Character: ${char.name}\nPlayer: ${char.playerName || 'Unknown'}\nClass: ${char.characterClass || 'Unknown'} (Level ${char.level})\nRace: ${char.race || 'Unknown'}\nBackground: ${char.background || 'Unknown'}\nHP: ${char.hp}/${char.maxHp}\nAC: ${char.ac}\nStatus: ${char.status}\n${char.notes ? `Notes: ${char.notes}` : ''}`,
                    relevanceScore: relevance,
                    metadata: {
                        class: char.characterClass,
                        level: char.level,
                        race: char.race,
                        status: char.status
                    }
                });
            }
        }
    }
    
    // Sort by relevance and limit
    documents.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const limitedDocs = documents.slice(0, limit);
    
    return {
        documents: limitedDocs,
        totalResults: documents.length,
        query
    };
}

/**
 * Format RAG context into a prompt-friendly string
 */
export function formatContextForPrompt(context: RAGContext): string {
    if (context.documents.length === 0) {
        return '';
    }
    
    let formatted = `\n\n--- CAMPAIGN KNOWLEDGE ---\n`;
    formatted += `The following information from the campaign may be relevant to the user's question:\n\n`;
    
    for (const doc of context.documents) {
        formatted += `[${doc.type.toUpperCase()}] ${doc.title}\n`;
        formatted += `${doc.content}\n\n`;
    }
    
    formatted += `--- END CAMPAIGN KNOWLEDGE ---\n`;
    formatted += `Use this information to provide accurate, contextual responses about the campaign. If the information doesn't directly answer the question, you may still reference relevant details.\n`;
    
    return formatted;
}

/**
 * Get recent campaign activity for general context
 */
export async function getRecentCampaignContext(campaignId: string): Promise<string> {
    // Get campaign info
    const campaign = await db.select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);
    
    if (campaign.length === 0) {
        return '';
    }
    
    // Get most recent session
    const recentSession = await db.select()
        .from(sessionLogs)
        .where(eq(sessionLogs.campaignId, campaignId))
        .orderBy(desc(sessionLogs.sessionDate))
        .limit(1);
    
    // Get active quests count
    const activeQuestsResult = await db.select({ count: sql<number>`count(*)` })
        .from(quests)
        .where(eq(quests.campaignId, campaignId));
    
    // Get party members
    const party = await db.select()
        .from(characters)
        .where(eq(characters.campaignId, campaignId));
    
    let context = `Campaign: ${campaign[0].title}\n`;
    
    if (recentSession.length > 0) {
        context += `Last Session: ${recentSession[0].title} (${recentSession[0].sessionDate})\n`;
        if (recentSession[0].location) {
            context += `Current Location: ${recentSession[0].location}\n`;
        }
    }
    
    if (party.length > 0) {
        context += `Party: ${party.map(c => `${c.name} (${c.characterClass} ${c.level})`).join(', ')}\n`;
    }
    
    return context;
}

/**
 * Enhanced search for Oracle - combines RAG retrieval with recent context
 */
export async function getOracleContext(
    query: string,
    campaignId: string
): Promise<{ ragContext: string; sources: RAGDocument[] }> {
    // Get relevant documents based on query
    const ragResult = await searchCampaignData(query, campaignId, {
        limit: 5,
        minRelevance: 0.15
    });
    
    // Get general campaign context
    const generalContext = await getRecentCampaignContext(campaignId);
    
    // Combine contexts
    let fullContext = '';
    
    if (generalContext) {
        fullContext += `\n--- CAMPAIGN OVERVIEW ---\n${generalContext}\n`;
    }
    
    fullContext += formatContextForPrompt(ragResult);
    
    return {
        ragContext: fullContext,
        sources: ragResult.documents
    };
}
