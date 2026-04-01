import React from 'react';
import { Edit3, ChevronRight, UserCircle, Download } from 'lucide-react';
import { User, CampaignData } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface AccountViewProps {
    user: User | null;
    data: CampaignData | null;
    isDM: boolean;
    onNavigateToSettings: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ user, data, isDM, onNavigateToSettings }) => {
    const handleExportData = () => {
        if (!data) return;
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            campaign: {
                title: data.title,
                partyCount: data.party.length,
                questCount: data.quests.length,
                sessionCount: data.sessions.length,
                npcCount: data.npcs.length,
            },
            party: data.party,
            quests: data.quests,
            sessions: data.sessions,
            npcs: data.npcs,
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.title.replace(/\s+/g, '_')}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 animate-in fade-in duration-500">
            <Card className="text-center p-8 space-y-6">
                <div className="relative mx-auto w-24 h-24">
                    {user?.image ? (
                        <img src={user.image} className="w-full h-full rounded-full object-cover border-4 border-neutral-800 shadow-xl" alt="Profile" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center border-4 border-neutral-700">
                            <UserCircle className="w-12 h-12 text-neutral-500" />
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-white">{user?.name || 'Demo User'}</h2>
                        <Badge type={isDM ? 'main' : 'neutral'}>{isDM ? 'DM' : 'Player'}</Badge>
                    </div>
                    <p className="text-neutral-500">{user?.email || 'demo@example.com'}</p>
                </div>

                <div className="flex justify-center gap-4 py-4 border-y border-neutral-800/50">
                    <div className="text-center px-4">
                        <div className="text-lg font-bold text-white">{data?.sessions.length || 0}</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider">Sessions</div>
                    </div>
                    <div className="w-px bg-neutral-800"></div>
                    <div className="text-center px-4">
                        <div className="text-lg font-bold text-white">{data?.quests.length || 0}</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider">Quests</div>
                    </div>
                    <div className="w-px bg-neutral-800"></div>
                    <div className="text-center px-4">
                        <div className="text-lg font-bold text-white">{data?.party.length || 0}</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider">Party</div>
                    </div>
                    <div className="w-px bg-neutral-800"></div>
                    <div className="text-center px-4">
                        <div className="text-lg font-bold text-white">{data?.npcs.length || 0}</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider">NPCs</div>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <Button className="w-full justify-between group" variant="secondary" onClick={onNavigateToSettings}>
                        <span>Settings & Preferences</span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white" />
                    </Button>
                    <Button 
                        className="w-full justify-between group" 
                        variant="secondary"
                        icon={Download}
                        onClick={handleExportData}
                        disabled={!data}
                    >
                        <span>Export Campaign Data</span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white" />
                    </Button>
                </div>
            </Card>
        </div>
    );
};

