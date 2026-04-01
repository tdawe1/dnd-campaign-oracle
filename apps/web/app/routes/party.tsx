import { createFileRoute } from '@tanstack/react-router'
import { PartyView } from '../../components/views/PartyView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'
import { useCampaignMutations } from '../../app/hooks/useCampaignMutations'

export const Route = createFileRoute('/party')({
    component: PartyRoute,
})

function PartyRoute() {
    const { user, isDemo } = useAuth()
    const { data, isLoading, error } = useCampaignData()
    const { updateCharacter } = useCampaignMutations(data?.campaignId || 'default')

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading party data...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading party data</div>

    const isDM = isDemo || user?.id === data.dmUserId

    const handleSaveCharacter = async (characterId: string, charData: any) => {
        await updateCharacter.mutateAsync({ characterId, data: charData })
    }

    return <PartyView data={data} isDM={isDM} onSaveCharacter={handleSaveCharacter} />
}
