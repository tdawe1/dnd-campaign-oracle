import { createFileRoute } from '@tanstack/react-router'
import { NPCsView } from '../../components/views/NPCsView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'
import { useCampaignMutations } from '../../app/hooks/useCampaignMutations'
import { NPC } from '../../types'

export const Route = createFileRoute('/npcs')({
    component: NPCsRoute,
})

function NPCsRoute() {
    const { user, isDemo } = useAuth()
    const { data, isLoading, error } = useCampaignData()
    const { addNpc, updateNpc, deleteNpc } = useCampaignMutations(data?.campaignId)

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading NPCs...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading NPC data</div>

    // Use 'id' from Better Auth user type
    const isDM = isDemo || user?.id === data.dmUserId

    const handleAddNPC = async (npcData: { name: string; location?: string; notes?: string }) => {
        addNpc.mutate(npcData)
    }

    const handleUpdateNPC = async (npcId: string, npcData: Partial<NPC>) => {
        updateNpc.mutate({ npcId, data: npcData })
    }

    const handleDeleteNPC = async (npcId: string) => {
        deleteNpc.mutate(npcId)
    }

    return (
        <NPCsView 
            data={data} 
            isDM={isDM} 
            onAddNPC={handleAddNPC}
            onUpdateNPC={handleUpdateNPC}
            onDeleteNPC={handleDeleteNPC}
        />
    )
}

