import React, { useState, Dispatch, SetStateAction } from 'react';
import { Target, MoreHorizontal, Trash2, Plus } from 'lucide-react';
import { CampaignData, Quest } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ExpandableQuestCard } from './ExpandableQuestCard';

interface QuestsViewProps {
    data: CampaignData;
    isDM: boolean;
    handleAddQuest: () => void;
    onUpdateQuest: (quest: Quest) => void;
    onDeleteQuest: (questId: string) => void;
}

export const QuestsView: React.FC<QuestsViewProps> = ({ data, isDM, handleAddQuest, onUpdateQuest, onDeleteQuest }) => {
    const [questFilter, setQuestFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [activeQuestMenu, setActiveQuestMenu] = useState<string | null>(null);

    const handleUpdateQuestStatus = (questId: string, status: 'active' | 'completed' | 'failed') => {
        if (!isDM) return;
        const quest = data.quests.find(q => q.id === questId);
        if (quest) {
            onUpdateQuest({ ...quest, status });
        }
        setActiveQuestMenu(null);
    };

    const handleDeleteQuest = (questId: string) => {
        if (!isDM) return;
        onDeleteQuest(questId);
        setActiveQuestMenu(null);
    };

    const filteredQuests = data.quests.filter(q =>
        questFilter === 'all' ? true : q.status === questFilter
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex bg-neutral-900/50 p-1 rounded-lg border border-neutral-800 w-fit">
                    {(['all', 'active', 'completed'] as const).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setQuestFilter(filter)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${questFilter === filter
                                ? 'bg-neutral-800 text-white shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
                {isDM && <Button icon={Plus} onClick={handleAddQuest}>New Quest</Button>}
            </div>

            <div className="space-y-3">
                {filteredQuests.length === 0 && (
                    <div className="text-center py-12 text-neutral-500 bg-neutral-900/20 rounded-lg border border-neutral-800/50 border-dashed">
                        <Target className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p>No quests found.</p>
                    </div>
                )}

                {filteredQuests.map(quest => (
                    <ExpandableQuestCard 
                        key={quest.id} 
                        quest={quest} 
                        isDM={isDM} 
                        onUpdateStatus={handleUpdateQuestStatus} 
                        onDelete={handleDeleteQuest} 
                    />
                ))}
            </div>
        </div>
    );
};
