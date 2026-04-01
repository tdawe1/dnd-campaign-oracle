import { Link, useNavigate } from '@tanstack/react-router'
import { BookOpen, LayoutGrid, Users, Target, ScrollText, Sparkles, Settings, ChevronRight, ChevronLeft, UserCircle, PanelLeftClose, PanelLeft, Package, Plus, UserPlus, Edit3, Activity, StickyNote, Sun, Moon, Search, X, FileText } from 'lucide-react'
import type { User } from '../../../types'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useCampaignData } from '../../hooks/useCampaignData'
import { AddNoteModal } from '../../../components/modals/AddNoteModal'
import { useTheme } from '../../../contexts/ThemeContext'
import { useSearch } from '../../hooks/useSearch'

interface SidebarProps {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    user: User | null
    isDM: boolean
}

export function Sidebar({ isOpen, setIsOpen, user, isDM }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { isDemo } = useAuth()
    const { theme, setTheme } = useTheme()
    const { data: campaignData } = useCampaignData()
    const searchResults = useSearch(searchQuery)
    const navigate = useNavigate()

    const handleQuickAction = (action: string) => {
        if (action === 'add-note') {
            setIsAddNoteOpen(true)
        }
    }

    const handleSearchResultClick = (path: string) => {
        navigate({ to: path })
        setSearchQuery('')
        setIsSearchFocused(false)
        setIsOpen(false)
    }

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
                setIsSearchFocused(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <>
            <aside className={`
            fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-16' : 'w-64'} bg-neutral-950 border-r border-neutral-800 transform transition-all duration-300
            ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:static"}
          `}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0">
                                <img src="/logo_transparent.png" alt="Oracle Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            </div>
                            {!isCollapsed && <span className="font-bold text-sm tracking-tight text-white">Oracle</span>}
                        </div>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden md:flex items-center justify-center w-6 h-6 rounded hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors"
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Search Input */}
                    {!isCollapsed && (
                        <div className="px-3 py-3 relative" ref={searchInputRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-8 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded transition-colors"
                                    >
                                        <X className="w-3 h-3 text-neutral-500" />
                                    </button>
                                )}
                            </div>
                            {/* Search Results Dropdown */}
                            {isSearchFocused && searchQuery && searchResults.length > 0 && (
                                <div className="absolute left-3 right-3 top-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                                    {searchResults.map((result) => (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => handleSearchResultClick(result.path)}
                                            className="w-full px-3 py-2 text-left hover:bg-neutral-800 transition-colors flex items-center gap-3 border-b border-neutral-800/50 last:border-0"
                                        >
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${result.type === 'Quest' ? 'bg-amber-500/20 text-amber-400' :
                                                result.type === 'Session' ? 'bg-indigo-500/20 text-indigo-400' :
                                                    'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {result.type}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{result.title}</p>
                                                <p className="text-xs text-neutral-500 truncate">{result.subtitle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {isSearchFocused && searchQuery && searchResults.length === 0 && (
                                <div className="absolute left-3 right-3 top-full mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 p-3">
                                    <p className="text-xs text-neutral-500 text-center">No results found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation - Main items, don't shrink */}
                    <div className="shrink-0 px-2 py-4 space-y-0.5">
                        {[
                            { to: '/', icon: LayoutGrid, label: 'Overview' },
                            { to: '/party', icon: Users, label: 'Party' },
                            { to: '/quests', icon: Target, label: 'Quests' },
                            { to: '/sessions', icon: ScrollText, label: 'Sessions' },
                            { to: '/npcs', icon: UserCircle, label: 'NPCs' },
                            { to: '/items', icon: Package, label: 'Items' },
                        ].map(item => (
                            <Link
                                key={item.label}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-md text-sm transition-all text-neutral-400 hover:text-white hover:bg-neutral-900/50 border border-transparent`}
                                activeProps={{
                                    className: "bg-neutral-900 text-white font-medium border border-neutral-800"
                                }}
                                activeOptions={{ exact: item.to === '/' }}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className="w-4 h-4 shrink-0" />
                                {!isCollapsed && item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Quick Actions - Scrollable, collapses first */}
                    <div className="flex-1 min-h-0 px-2 pb-2 overflow-y-auto">
                        <div className="h-px bg-neutral-800 mx-1 mb-3 mt-1" />
                        {!isCollapsed && <h3 className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Quick Actions</h3>}
                        <button
                            onClick={() => handleQuickAction('add-note')}
                            disabled={true}
                            className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm transition-all text-neutral-600 cursor-not-allowed border border-transparent`}
                            title={isCollapsed ? "Add Note (Coming Soon)" : undefined}
                        >
                            <StickyNote className="w-4 h-4 shrink-0" />
                            {!isCollapsed && "Add Note"}
                        </button>
                        {[
                            { to: '/quests', icon: Plus, label: 'New Quest', dmOnly: true },
                            { to: '/party', icon: UserPlus, label: 'Add NPC', dmOnly: true },
                            { to: '/sessions', icon: Edit3, label: 'Paste Log', dmOnly: true },
                        ].map(item => (
                            <Link
                                key={item.label}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                disabled={(!isDM && item.dmOnly) || (user && isDemo && item.dmOnly ? true : false)}
                                className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm transition-all
                                    ${(!isDM && item.dmOnly) || (isDemo && item.dmOnly)
                                        ? 'opacity-50 cursor-not-allowed text-neutral-600'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
                                    } border border-transparent`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <item.icon className="w-4 h-4 shrink-0" />
                                {!isCollapsed && item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Settings & Usage */}
                    <div className="px-2 pb-2">
                        <Link
                            to="/usage"
                            onClick={() => setIsOpen(false)}
                            className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm transition-all text-neutral-400 hover:text-white hover:bg-neutral-900/50 border border-transparent`}
                            activeProps={{
                                className: "bg-neutral-900 text-white font-medium border border-neutral-800"
                            }}
                            title={isCollapsed ? "Usage & Plan" : undefined}
                        >
                            <Activity className="w-4 h-4 shrink-0" />
                            {!isCollapsed && "Usage & Plan"}
                        </Link>
                        <Link
                            to="/settings"
                            onClick={() => setIsOpen(false)}
                            className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm transition-all text-neutral-400 hover:text-white hover:bg-neutral-900/50 border border-transparent`}
                            activeProps={{
                                className: "bg-neutral-900 text-white font-medium border border-neutral-800"
                            }}
                            title={isCollapsed ? "Settings" : undefined}
                        >
                            <Settings className="w-4 h-4 shrink-0" />
                            {!isCollapsed && "Settings"}
                        </Link>
                        <Link
                            to="/docs"
                            onClick={() => setIsOpen(false)}
                            className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm transition-all text-neutral-400 hover:text-white hover:bg-neutral-900/50 border border-transparent`}
                            activeProps={{
                                className: "bg-neutral-900 text-white font-medium border border-neutral-800"
                            }}
                            title={isCollapsed ? "Docs" : undefined}
                        >
                            <FileText className="w-4 h-4 shrink-0" />
                            {!isCollapsed && "Docs"}
                        </Link>
                    </div>

                    {/* User Section */}
                    <div className="p-3 border-t border-neutral-800">
                        <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center flex-col' : 'justify-between'}`}>
                            <Link
                                to="/account"
                                className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-1' : 'px-2'} py-2 rounded-lg hover:bg-neutral-900/50 transition-colors cursor-pointer group flex-1 min-w-0`}
                                title={isCollapsed ? user?.name || "Account" : undefined}
                            >
                                <img src={user?.image || undefined} alt="User" className="w-8 h-8 rounded-full bg-neutral-800 ring-2 ring-neutral-900 group-hover:ring-neutral-800 transition-all opacity-80 group-hover:opacity-100 shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{user?.name}</p>
                                            <p className="text-xs text-neutral-500 truncate capitalize">{isDM ? 'Dungeon Master' : 'Player'}</p>
                                        </div>
                                    </>
                                )}
                            </Link>

                            {!isCollapsed && (
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="p-2 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-900/50 transition-colors"
                                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                                >
                                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
            <AddNoteModal
                isOpen={isAddNoteOpen}
                onClose={() => setIsAddNoteOpen(false)}
                campaignId={campaignData?.campaignId || ''}
            />
        </>
    )
}

