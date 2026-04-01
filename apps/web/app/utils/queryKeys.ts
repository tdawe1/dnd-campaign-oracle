export const campaignKeys = {
    all: ['campaigns'] as const,
    detail: (id: string) => [...campaignKeys.all, id] as const,
    party: (campaignId: string) => [...campaignKeys.detail(campaignId), 'party'] as const,
    quests: (campaignId: string) => [...campaignKeys.detail(campaignId), 'quests'] as const,
    sessions: (campaignId: string) => [...campaignKeys.detail(campaignId), 'sessions'] as const,
    npcs: (campaignId: string) => [...campaignKeys.detail(campaignId), 'npcs'] as const,
}
