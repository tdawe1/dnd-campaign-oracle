import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DashboardView } from '../../components/views/DashboardView'
import { CreateQuestModal } from '../../components/modals/CreateQuestModal'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'
import { useCampaignMutations } from '../../app/hooks/useCampaignMutations'
import type { ViewState, Quest } from '../../types'

export const Route = createFileRoute('/')({
    component: DashboardRoute,
})

function DashboardRoute() {
    const { user, isDemo } = useAuth()
    const navigate = useNavigate()
    const [isQuestModalOpen, setIsQuestModalOpen] = useState(false)

    const { data, isLoading, error } = useCampaignData()
    const { addQuest } = useCampaignMutations()

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading campaign data...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading campaign data</div>

    const isDM = isDemo || user?.id === data.dmUserId

    const handleSetActiveView = (view: ViewState) => {
        if (view === 'dashboard') navigate({ to: '/' })
        else navigate({ to: `/${view}` })
    }

    const handleAddQuest = () => {
        if (!isDM) return
        setIsQuestModalOpen(true)
    }

    const handleCreateQuest = (questData: Partial<Quest>) => {
        const newQuest: Quest = {
            id: `q${Date.now()}`, // Temporary ID, backend will generate real one
            title: questData.title || "New Quest",
            desc: questData.desc || "",
            status: "active",
            type: questData.type || "Side",
            source: questData.source || "Manual",
            outcome: questData.outcome
        }
        addQuest.mutate(newQuest)
    }

    return (
        <>
            <DashboardView
                data={data}
                setActiveView={handleSetActiveView}
                isDM={isDM}
                isDemo={isDemo}
                setIsTranscriptModalOpen={() => { }} // TODO: Handle cross-route modal state
                handleAddQuest={handleAddQuest}
            />
            <CreateQuestModal
                isOpen={isQuestModalOpen}
                onClose={() => setIsQuestModalOpen(false)}
                onSubmit={handleCreateQuest}
            />
        </>
    )
}
