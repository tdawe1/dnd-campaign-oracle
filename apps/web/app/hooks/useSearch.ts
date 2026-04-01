import { useMemo } from 'react'
import { useCampaignData } from './useCampaignData'
import { useNavigate } from '@tanstack/react-router'

export interface SearchResult {
    type: 'Quest' | 'Session' | 'NPC'
    title: string
    subtitle: string
    id: string
    path: string
}

export function useSearch(query: string) {
    const { data } = useCampaignData()
    const navigate = useNavigate()

    const results = useMemo(() => {
        if (!query.trim() || !data) return []
        const lowerQuery = query.toLowerCase()

        const searchResults: SearchResult[] = []

        // Search Quests
        data.quests.forEach(q => {
            if (q.title.toLowerCase().includes(lowerQuery) || q.desc.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'Quest',
                    title: q.title,
                    subtitle: q.status,
                    id: q.id,
                    path: '/quests'
                })
            }
        })

        // Search Sessions
        data.sessions.forEach(s => {
            if (s.title.toLowerCase().includes(lowerQuery) || s.summary.location.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'Session',
                    title: s.title,
                    subtitle: s.date,
                    id: s.id,
                    path: '/sessions'
                })
            }
        })

        // Search NPCs
        data.npcs.forEach(n => {
            if (n.name.toLowerCase().includes(lowerQuery) || n.location.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    type: 'NPC',
                    title: n.name,
                    subtitle: n.location,
                    id: n.id,
                    path: '/party'
                })
            }
        })

        return searchResults
    }, [query, data])

    return results
}
