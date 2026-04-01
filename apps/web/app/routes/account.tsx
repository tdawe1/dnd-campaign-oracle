import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AccountView } from '../../components/views/AccountView'
import { useAuth } from '../../contexts/AuthContext'
import { useCampaignData } from '../../app/hooks/useCampaignData'

export const Route = createFileRoute('/account')({
    component: AccountRoute,
})

function AccountRoute() {
    const { user, isDemo } = useAuth()
    const navigate = useNavigate()
    const { data } = useCampaignData()

    const isDM = isDemo || (data && user?.id === data.dmUserId) || false

    const handleNavigateToSettings = () => {
        navigate({ to: '/settings' })
    }

    return (
        <AccountView 
            user={user} 
            data={data || null} 
            isDM={isDM}
            onNavigateToSettings={handleNavigateToSettings}
        />
    )
}

