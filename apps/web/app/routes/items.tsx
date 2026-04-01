import { createFileRoute } from '@tanstack/react-router'
import { ItemsView } from '../../components/views/ItemsView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'
import { client } from '../../app/lib/client'
import { Item } from '../../types'

export const Route = createFileRoute('/items')({
    component: ItemsRoute,
})

function ItemsRoute() {
    const { user, isDemo } = useAuth()
    const { data, isLoading, error, refetch } = useCampaignData()

    const handleAddItem = async (itemData: Omit<Item, 'id'>) => {
        if (!data?.campaignId || isDemo) return;
        
        const res = await (client as any).api.campaigns[':campaignId'].items.$post({
            param: { campaignId: data.campaignId },
            json: {
                name: itemData.name,
                description: itemData.description || undefined,
                category: itemData.category,
                rarity: itemData.rarity,
                quantity: itemData.quantity,
                characterId: itemData.characterId || undefined,
                notes: itemData.notes || undefined,
            }
        });
        
        if (!res.ok) throw new Error('Failed to add item');
        
        refetch();
    }

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading items...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading item data</div>

    const isDM = isDemo || user?.id === data.dmUserId

    return <ItemsView data={data} isDM={isDM} onAddItem={!isDemo ? handleAddItem : undefined} />
}
