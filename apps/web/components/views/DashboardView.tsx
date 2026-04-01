import React from 'react';
import { Users, Target, ScrollText, Bell, Map as MapIcon, Eye } from 'lucide-react';
import { CampaignData, ViewState } from '../../types';
import { Card } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { SessionSummaryCard } from './SessionSummaryCard';

interface DashboardViewProps {
    data: CampaignData;
    setActiveView: (view: ViewState) => void;
    isDM: boolean;
    isDemo?: boolean;
    setIsTranscriptModalOpen: (isOpen: boolean) => void;
    handleAddQuest: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, setActiveView, isDM, isDemo = false, setIsTranscriptModalOpen, handleAddQuest }) => (
    <div className="space-y-6 animate-in fade-in duration-500">
        {/* Demo Mode Banner */}
        {isDemo && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-300">Demo Mode</h3>
                    <p className="text-xs text-amber-400/70">You're viewing sample data. Sign in to create your own campaigns and unlock all features.</p>
                </div>
                <Button variant="primary" className="shrink-0 bg-amber-600 hover:bg-amber-500" onClick={() => window.location.reload()}>
                    Sign In
                </Button>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Party Average Level" value={Math.floor(data.party.reduce((acc, p) => acc + p.level, 0) / data.party.length) || 0} trend="Level 5 Reached" />
            <StatCard label="Active Quests" value={data.quests.filter(q => q.status === 'active').length} trend={`${data.quests.filter(q => q.status === 'completed').length} Completed`} trendDirection="neutral" />
            <StatCard label="Sessions Played" value={data.sessions.length} trend="Last: 2 days ago" />
            <StatCard label="Campaign Status" value="Ongoing" trend="Next: Oct 24" trendDirection="neutral" />
        </div>

        {/* Main Content Grid - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

            {/* Column 1: Session Summary */}
            <div className="flex flex-col h-full">
                {data.sessions.length > 0 ? (
                    <SessionSummaryCard
                        session={data.sessions[0]}
                        onClick={() => setActiveView('sessions')}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center p-8 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800 text-neutral-500">
                        No sessions played yet
                    </div>
                )}
            </div>

            {/* Column 2: Campaign Pulse */}
            <div className="flex flex-col h-full">
                <Card className="flex flex-col h-full" title="Campaign Pulse">
                    {/* Logo Section */}
                    <div className="flex justify-center mb-6 -mt-2">
                        <img
                            src="/logo_transparent.png"
                            alt="Campaign Oracle"
                            className="w-48 h-auto opacity-90 drop-shadow-lg mix-blend-lighten"
                            style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.2))' }}
                        />
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
                                <MapIcon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-200">Current Location</h4>
                                <p className="text-lg text-white font-medium">{data.sessions[0]?.summary?.location || "Unknown Location"}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Recent Activity</h4>
                            {data.sessions.slice(0, 3).map(session => (
                                <div key={session.id} className="flex gap-4 items-start group cursor-pointer hover:bg-neutral-800/30 p-2 rounded transition-colors" onClick={() => setActiveView('sessions')}>
                                    <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0 group-hover:bg-indigo-400 transition-colors"></div>
                                    <div>
                                        <p className="text-sm text-neutral-300 font-medium">{session.title}</p>
                                        <p className="text-xs text-neutral-500 line-clamp-1">{session.journalEntry}</p>
                                    </div>
                                    <span className="text-[10px] text-neutral-600 ml-auto whitespace-nowrap font-mono">{session.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    </div>
);

