import { Outlet, createRootRoute, Link, useNavigate, useLocation } from '@tanstack/react-router'
import { ThemeProvider } from '../../contexts/ThemeContext'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LoginPage } from '../../components/LoginPage'
import { useCampaignData } from '../hooks/useCampaignData'

import { ErrorComponent } from '../components/ErrorComponent'
import { Sidebar } from '../components/layout/Sidebar'
import { Header } from '../components/layout/Header'
import { OraclePanel } from '../components/layout/OraclePanel'

export const Route = createRootRoute({
    component: RootComponent,
    errorComponent: ErrorComponent,
})

function RootComponent() {
    const { user, loading, isDemo, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Campaign data for header
    const { data: campaignData } = useCampaignData()

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isOracleOpen, setIsOracleOpen] = useState(false)
    const [isOracleMinimized, setIsOracleMinimized] = useState(false)
    const [activeCampaignId, setActiveCampaignId] = useState<string | undefined>(campaignData?.campaignId)

    // Derived State
    const isDM = isDemo || user?.id === 'default_dm_id' // Placeholder for dmUserId check

    // Handlers
    const handleLogout = async () => {
        await logout()
        navigate({ to: '/' })
    }

    const handleCampaignChange = (campaignId: string) => {
        setActiveCampaignId(campaignId)
        // In a real implementation, this would trigger data refresh
        // For now, we'll just update the state
    }

    // Effects
    useEffect(() => {
        if (campaignData?.campaignId) {
            setActiveCampaignId(campaignData.campaignId)
        }
    }, [campaignData?.campaignId])

    useEffect(() => {
        // Don't redirect for public routes
        const publicRoutes = ['/login', '/chronicle']
        const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route))

        if (!loading && !user && !isDemo && !isPublicRoute) {
            navigate({ to: '/login' })
        }
    }, [user, isDemo, loading, location.pathname, navigate])

    if (loading) {
        return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading...</div>
    }

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <div className={`flex h-screen bg-neutral-950 bg-dot-grid text-neutral-200 font-sans overflow-hidden selection:bg-indigo-500/30 ${isOracleOpen ? 'mr-0' : ''}`}>
                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    user={user}
                    isDM={isDM}
                />

                <main className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${isOracleOpen ? (isOracleMinimized ? 'mr-0' : 'mr-96') : ''}`}>
                    <Header
                        setIsSidebarOpen={setIsSidebarOpen}
                        campaignTitle={campaignData?.title}
                        campaignId={activeCampaignId}
                        onCampaignChange={handleCampaignChange}
                        isOracleOpen={isOracleOpen}
                        onOracleToggle={() => setIsOracleOpen(!isOracleOpen)}
                    />

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                        <div className="max-w-6xl mx-auto">
                            <Outlet />
                        </div>
                    </div>
                </main>

                {/* Oracle Panel */}
                {campaignData && (
                    <OraclePanel
                        data={campaignData}
                        isDM={isDM}
                        isOpen={isOracleOpen}
                        onClose={() => setIsOracleOpen(false)}
                        isMinimized={isOracleMinimized}
                        onMinimize={setIsOracleMinimized}
                    />
                )}

                <TanStackRouterDevtools />
            </div>
        </ThemeProvider>
    )
}
