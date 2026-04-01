import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SettingsView } from '../../components/views/SettingsView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'

export const Route = createFileRoute('/settings')({
    component: SettingsRoute,
})

function SettingsRoute() {
    const { user, isDemo, logout } = useAuth()
    const navigate = useNavigate()
    const { data } = useCampaignData()

    const isDM = isDemo || (data && user?.id === data.dmUserId) || false

    const handleLogout = async () => {
        await logout()
        navigate({ to: '/login' })
    }

    return <SettingsView user={user} isDM={isDM} handleLogout={handleLogout} campaignId={data?.campaignId || null} />
}

