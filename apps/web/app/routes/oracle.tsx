import { createFileRoute } from '@tanstack/react-router'
import { OracleView } from '../../components/views/OracleView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'

export const Route = createFileRoute('/oracle')({
    component: OracleRoute,
})

function OracleRoute() {
    const { user, isDemo } = useAuth()
    const { data, isLoading, error } = useCampaignData()

    if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading oracle...</div>
    if (error || !data) return <div className="p-8 text-center text-red-500">Error loading oracle</div>

    const isDM = isDemo || user?.id === data.dmUserId

    return <OracleView data={data} isDM={isDM} />
}
