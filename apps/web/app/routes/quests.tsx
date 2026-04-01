import { createFileRoute } from '@tanstack/react-router'
import { QuestsView } from '../../components/views/QuestsView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'
import { useCampaignMutations } from '../../app/hooks/useCampaignMutations'
import { Quest } from '../../types'

export const Route = createFileRoute('/quests')({
    component: QuestsRoute,
})

function QuestsRoute() {
    const { user, isDemo } = useAuth()
    const { data, isLoading, error } = useCampaignData()
    const { addQuest, updateQuest, deleteQuest } = useCampaignMutations(data?.campaignId)

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading quests...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading quests</div>

    const isDM = isDemo || user?.id === data.dmUserId

    const handleAddQuest = () => {
        if (!isDM) return

        const newQuest: Quest = {
            id: `q${Date.now()}`,
            title: "New Quest",
            desc: "Description of the new quest...",
            status: "active",
            type: "Side",
            source: "Manual"
        }
        addQuest.mutate(newQuest)
    }

    const handleUpdateQuest = (quest: Quest) => {
        updateQuest.mutate({ questId: quest.id, data: quest })
    }

    const handleDeleteQuest = (questId: string) => {
        deleteQuest.mutate(questId)
    }

    return (
        <QuestsView
            data={data}
            isDM={isDM}
            handleAddQuest={handleAddQuest}
            onUpdateQuest={handleUpdateQuest}
            onDeleteQuest={handleDeleteQuest}
        />
    )
}

