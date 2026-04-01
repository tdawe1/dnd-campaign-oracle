import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '../lib/client'
import { campaignKeys } from '../utils/queryKeys'
import { CampaignData, Quest, NPC } from '../../types'
import { useAuth } from '../../contexts/AuthContext'

export function useCampaignMutations(campaignId: string = 'default') {
    const queryClient = useQueryClient()
    const { isDemo } = useAuth()

    // Helper to block mutations in demo mode
    const blockInDemoMode = (actionName: string) => {
        if (isDemo) {
            console.warn(`[Demo Mode] ${actionName} is disabled. Sign in to make changes.`);
            throw new Error(`${actionName} is disabled in demo mode. Sign in to make changes.`);
        }
    };

    // --- Campaign Mutations ---
    const updateCampaign = useMutation({
        mutationFn: async (newData: Partial<CampaignData>) => {
            blockInDemoMode('Editing campaign');
            const res = await client.api.campaigns[':id'].$patch({
                param: { id: campaignId },
                json: {
                    title: newData.title,
                }
            });
            if (!res.ok) throw new Error("Failed to update campaign");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    // --- Quest Mutations ---
    const addQuest = useMutation({
        mutationFn: async (quest: Quest) => {
            blockInDemoMode('Adding quest');
            const res = await client.api.quests.$post({
                json: {
                    campaignId,
                    title: quest.title,
                    questType: quest.type,
                    source: quest.source,
                    description: quest.desc,
                    status: quest.status
                }
            });
            if (!res.ok) throw new Error("Failed to add quest");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    const updateQuest = useMutation({
        mutationFn: async ({ questId, data }: { questId: string; data: Partial<Quest> }) => {
            blockInDemoMode('Updating quest');
            const res = await client.api.quests[':id'].$patch({
                param: { id: questId },
                json: {
                    title: data.title,
                    questType: data.type,
                    description: data.desc,
                    source: data.source,
                    status: data.status
                }
            });
            if (!res.ok) throw new Error("Failed to update quest");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    const deleteQuest = useMutation({
        mutationFn: async (questId: string) => {
            blockInDemoMode('Deleting quest');
            const res = await client.api.quests[':id'].$delete({
                param: { id: questId }
            });
            if (!res.ok) throw new Error("Failed to delete quest");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    // --- NPC Mutations ---
    const addNpc = useMutation({
        mutationFn: async (npc: { name: string; location?: string; notes?: string; imageUrl?: string }) => {
            blockInDemoMode('Adding NPC');
            const res = await client.api.npcs.$post({
                json: {
                    campaignId,
                    name: npc.name,
                    location: npc.location,
                    notes: npc.notes,
                    imageUrl: npc.imageUrl
                }
            });
            if (!res.ok) throw new Error("Failed to add NPC");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    const updateNpc = useMutation({
        mutationFn: async ({ npcId, data }: { npcId: string; data: Partial<NPC> }) => {
            blockInDemoMode('Updating NPC');
            const res = await client.api.npcs[':id'].$patch({
                param: { id: npcId },
                json: {
                    name: data.name,
                    location: data.location,
                    notes: data.notes,
                    imageUrl: data.imageUrl
                }
            });
            if (!res.ok) throw new Error("Failed to update NPC");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    const deleteNpc = useMutation({
        mutationFn: async (npcId: string) => {
            blockInDemoMode('Deleting NPC');
            const res = await client.api.npcs[':id'].$delete({
                param: { id: npcId }
            });
            if (!res.ok) throw new Error("Failed to delete NPC");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    // --- Session Mutations ---
    const addSession = useMutation({
        mutationFn: async (session: {
            title: string;
            sessionDate: string;
            location?: string;
            journalEntry?: string;
            transcript?: string;
            combat?: { enemyName: string; result?: string }[];
            loot?: { itemName: string; effect?: string }[];
        }) => {
            blockInDemoMode('Adding session');
            const res = await client.api.sessions.$post({
                json: {
                    campaignId,
                    title: session.title,
                    sessionDate: session.sessionDate,
                    location: session.location,
                    journalEntry: session.journalEntry,
                    transcript: session.transcript,
                    combat: session.combat,
                    loot: session.loot
                }
            });
            if (!res.ok) throw new Error("Failed to add session");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    // --- Character Mutations ---
    const updateCharacter = useMutation({
        mutationFn: async ({ characterId, data }: { characterId: string; data: Record<string, any> }) => {
            blockInDemoMode('Updating character');
            const res = await client.api.characters[':id'].$patch({
                param: { id: characterId },
                json: data
            });
            if (!res.ok) throw new Error("Failed to update character");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) })
        },
    })

    return {
        // Campaign
        updateCampaign,
        // Characters
        updateCharacter,
        // Quests
        addQuest,
        updateQuest,
        deleteQuest,
        // NPCs
        addNpc,
        updateNpc,
        deleteNpc,
        // Sessions
        addSession,
        // Helpers
        isDemo,
    }
}
