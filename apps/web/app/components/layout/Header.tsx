import { Menu, ChevronRight, Search, Bell, Target as QuestIcon, ScrollText, Users, ChevronDown, Sparkles, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useSearch } from '../../hooks/useSearch'
import { useNotifications } from '../../contexts/NotificationContext'
import { useCampaigns } from '../../hooks/useCampaigns'
import { useNavigate, useLocation } from '@tanstack/react-router'

interface HeaderProps {
    setIsSidebarOpen: (isOpen: boolean) => void
    campaignTitle?: string
    campaignId?: string
    onCampaignChange?: (campaignId: string) => void
    isOracleOpen?: boolean
    onOracleToggle?: () => void
}

export function Header({ setIsSidebarOpen, campaignTitle, campaignId, onCampaignChange, isOracleOpen, onOracleToggle }: HeaderProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
    const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false)
    const notificationRef = useRef<HTMLDivElement>(null)
    const campaignDropdownRef = useRef<HTMLDivElement>(null)

    const { notifications, markAllRead, unreadCount } = useNotifications()
    const { campaigns } = useCampaigns()
    const searchResults = useSearch(searchQuery)

    const handleSearchResultClick = (path: string) => {
        navigate({ to: path })
        setSearchQuery("")
        setIsSearchFocused(false)
    }

    const handleCampaignSelect = (id: string) => {
        if (onCampaignChange && id !== campaignId) {
            onCampaignChange(id)
        }
        setIsCampaignDropdownOpen(false)
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false)
            }
            if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
                setIsCampaignDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <header className="h-14 px-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-neutral-400 hover:text-white">
                    <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                    {/* Campaign Selector */}
                    <div className="relative hidden sm:block" ref={campaignDropdownRef}>
                        <button 
                            onClick={() => setIsCampaignDropdownOpen(!isCampaignDropdownOpen)}
                            className="flex items-center gap-1 hover:text-white transition-colors group"
                        >
                            <span className="text-neutral-300">{campaignTitle || 'Campaign'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-400 transition-transform ${isCampaignDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCampaignDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                                <div className="p-2 border-b border-neutral-800 bg-neutral-900/50">
                                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Switch Campaign</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {campaigns.length > 0 ? campaigns.map(campaign => (
                                        <button
                                            key={campaign.id}
                                            onClick={() => handleCampaignSelect(campaign.id)}
                                            className={`w-full px-3 py-2.5 text-left hover:bg-neutral-900 flex items-center justify-between gap-2 ${campaign.id === campaignId ? 'bg-neutral-900' : ''}`}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-neutral-200 truncate">{campaign.title}</p>
                                                {campaign.description && (
                                                    <p className="text-xs text-neutral-500 truncate">{campaign.description}</p>
                                                )}
                                            </div>
                                            {campaign.id === campaignId && (
                                                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                                            )}
                                        </button>
                                    )) : (
                                        <p className="px-3 py-4 text-xs text-neutral-500 text-center">No campaigns found</p>
                                    )}
                                </div>
                                <div className="p-2 border-t border-neutral-800">
                                    <button 
                                        onClick={() => { navigate({ to: '/settings' }); setIsCampaignDropdownOpen(false); }}
                                        className="w-full px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 text-left hover:bg-neutral-900 rounded"
                                    >
                                        + Create New Campaign
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <ChevronRight className="w-4 h-4 hidden sm:inline" />
                    <span className="text-white font-medium capitalize">
                        {location.pathname === '/' ? 'Dashboard' : location.pathname.slice(1)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="relative hidden sm:block group z-50">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${isSearchFocused ? 'text-indigo-400' : 'text-neutral-500'}`} />
                    <input
                        type="text"
                        placeholder="Search campaign..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className="bg-neutral-900/50 border border-neutral-800 rounded-md pl-8 pr-4 py-1.5 text-xs text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none w-48 focus:w-64 transition-all placeholder-neutral-600"
                    />
                    {/* Search Results Dropdown */}
                    {isSearchFocused && searchQuery && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="p-2">
                                {searchResults.length > 0 ? searchResults.map((result) => (
                                    <button key={result.id} onClick={() => handleSearchResultClick(result.path)} className="w-full text-left p-2 hover:bg-neutral-900 rounded flex items-center gap-3 group">
                                        <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 group-hover:border-indigo-500/30 group-hover:text-indigo-400">
                                            {result.type === 'Quest' && <QuestIcon className="w-4 h-4" />}
                                            {result.type === 'Session' && <ScrollText className="w-4 h-4" />}
                                            {result.type === 'NPC' && <Users className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-neutral-200">{result.title}</p>
                                            <p className="text-xs text-neutral-500">{result.type} • {result.subtitle}</p>
                                        </div>
                                    </button>
                                )) : (
                                    <p className="text-xs text-neutral-500 p-2 text-center">No results found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-px h-4 bg-neutral-800 hidden sm:block"></div>

                {/* Oracle Toggle */}
                {onOracleToggle && (
                    <button
                        onClick={onOracleToggle}
                        className={`p-1.5 transition-colors rounded-md ${isOracleOpen ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
                        title="Toggle Oracle"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                )}

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`relative p-1.5 text-neutral-400 hover:text-white transition-colors hover:bg-neutral-900 rounded-md ${isNotificationsOpen ? 'bg-neutral-900 text-white' : ''}`}
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-neutral-950 animate-pulse"></span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
                                <h4 className="text-xs font-semibold text-white">Notifications</h4>
                                {unreadCount > 0 && (
                                    <button onClick={() => markAllRead()} className="text-[10px] text-indigo-400 hover:text-indigo-300">Mark all read</button>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="text-xs text-neutral-500 p-4 text-center">No new notifications.</p>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className={`p-3 border-b border-neutral-900 last:border-0 hover:bg-neutral-900/30 transition-colors ${!n.read ? 'bg-indigo-950/10' : ''}`}>
                                            <div className="flex gap-3">
                                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-indigo-500' : 'bg-neutral-800'}`}></div>
                                                <div>
                                                    <p className={`text-xs ${!n.read ? 'text-white font-medium' : 'text-neutral-400'}`}>{n.title}</p>
                                                    <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">{n.message}</p>
                                                    <p className="text-[10px] text-neutral-600 mt-1.5">{n.date}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

