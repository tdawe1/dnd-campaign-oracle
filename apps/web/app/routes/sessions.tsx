import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SessionsView } from '../../components/views/SessionsView'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'
import { useCampaignData } from '../../app/hooks/useCampaignData'
import { useCampaignMutations } from '../../app/hooks/useCampaignMutations'
import { useNotifications } from '../../app/contexts/NotificationContext'
import type { ViewState } from '../../types'

export const Route = createFileRoute('/sessions')({
    component: SessionsRoute,
})

function SessionsRoute() {
    const { user, isDemo } = useAuth()
    const navigate = useNavigate()
    const { data, isLoading, error } = useCampaignData()
    const { addSession } = useCampaignMutations(data?.campaignId)
    const { addNotification } = useNotifications()
    const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false)

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading sessions...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading sessions</div>

    const isDM = isDemo || user?.id === data.dmUserId

    const handleSetActiveView = (view: ViewState) => {
        if (view === 'dashboard') navigate({ to: '/' })
        else navigate({ to: `/${view}` })
    }

    return (
        <SessionsView
            data={data}
            isDM={isDM}
            onAddSession={(session) => addSession.mutate({
                title: session.title,
                sessionDate: session.date,
                location: session.summary?.location,
                journalEntry: session.journalEntry,
                transcript: session.transcript,
                combat: session.summary?.combat?.map((c: any) => ({
                    enemyName: c.name,
                    result: c.result
                })),
                loot: session.summary?.loot?.map((l: any) => ({
                    itemName: l.name,
                    effect: l.effect
                }))
            })}
            onAddNotification={addNotification}
            setActiveView={handleSetActiveView}
            isTranscriptModalOpen={isTranscriptModalOpen}
            setIsTranscriptModalOpen={setIsTranscriptModalOpen}
        />
    )
}
