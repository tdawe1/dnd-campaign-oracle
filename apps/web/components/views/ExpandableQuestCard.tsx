import React, { useState } from 'react';
import { Target, Calendar, MapPin, ChevronRight, CheckCircle2, XCircle, AlertCircle, ScrollText, User, Coins, Crown, Trash2, MoreVertical } from 'lucide-react';
import { Quest } from '../../types';
import { Badge } from '../ui/Badge';

interface ExpandableQuestCardProps {
    quest: Quest;
    isDM: boolean;
    onUpdateStatus: (id: string, status: 'active' | 'completed' | 'failed') => void;
    onDelete: (id: string) => void;
}

const QuestDetailModal: React.FC<{ quest: Quest; onClose: () => void; isDM: boolean }> = ({ quest, onClose, isDM }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div 
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-2xl mx-4 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            >
                {/* Header */}
                <div className="bg-neutral-950/50 border-b border-neutral-800 px-6 py-4 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-white">{quest.title}</h3>
                            <Badge type={quest.type === 'Main' ? 'main' : 'neutral'}>{quest.type}</Badge>
                            {quest.status === 'completed' && <Badge type="success">Completed</Badge>}
                            {quest.status === 'failed' && <Badge type="danger">Failed</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                             {quest.source && (
                                <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{quest.source}</span>
                                </div>
                             )}
                             {quest.location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{quest.location}</span>
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Description */}
                    <section className="space-y-2">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <ScrollText className="w-3.5 h-3.5" /> Description
                        </h4>
                        <p className="text-sm text-neutral-300 leading-relaxed bg-neutral-950/30 p-3 rounded-lg border border-neutral-800/50">
                            {quest.desc}
                        </p>
                    </section>

                    {/* Outcome / Notes (if completed or has extended data) */}
                    {(quest.status === 'completed' || quest.notes) && (
                        <section className="space-y-2">
                             <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Outcome
                            </h4>
                            <div className="text-sm text-neutral-300 bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-lg">
                                {quest.notes || "Quest completed successfully."}
                            </div>
                        </section>
                    )}

                    {/* Rewards (if they exist in our schema? currently 'rewards' isn't explicitly in the Quest type shown in QuestsView, but implied by PDF "Reward" column) 
                        For now, I'll assume we might want to put rewards in the notes or desc if the type doesn't support it, 
                        BUT looking at the Extraction from PDF, there are specific rewards. 
                        I should probably check the Quest type definition first to see if I can add a `reward` field.
                        For now, I'll render it if it fits in notes or if I modify the type.
                        I'll play it safe and check the type definition in a moment, but since I'm writing this file now,
                        I'll include a conditional render for a 'reward' property casting it for now or rely on notes.
                    */}
                </div>
                
                 <div className="bg-neutral-950/50 border-t border-neutral-800 px-6 py-4 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ExpandableQuestCard: React.FC<ExpandableQuestCardProps> = ({ quest, isDM, onUpdateStatus, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div 
                onClick={() => setIsOpen(true)}
                className="group relative bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all cursor-pointer"
            >
                 <div className="flex items-start gap-4">
                    {/* Status Indicator */}
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        quest.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                        quest.status === 'failed' ? 'bg-rose-500' :
                        quest.type === 'Main' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-neutral-500'
                    }`} />

                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium transition-colors ${quest.status === 'completed' ? 'text-neutral-500 line-through decoration-neutral-700' : 'text-neutral-200 group-hover:text-indigo-300'}`}>
                                {quest.title}
                            </span>
                             <Badge type={quest.type === 'Main' ? 'main' : 'neutral'}>{quest.type}</Badge>
                             {quest.status === 'completed' && <Badge type="success">Completed</Badge>}
                        </div>
                        <p className="text-xs text-neutral-500 truncate pr-8">{quest.desc}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span className="group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex items-center gap-1">
                            Details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>

                {/* Quick Actions for DM (prevent bubbling) */}
                {isDM && quest.status === 'active' && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onUpdateStatus(quest.id, 'completed')}
                            className="p-1.5 bg-neutral-800 hover:bg-emerald-900/50 rounded text-neutral-400 hover:text-emerald-400 transition-colors"
                            title="Mark Complete"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onUpdateStatus(quest.id, 'failed')}
                            className="p-1.5 bg-neutral-800 hover:bg-rose-900/50 rounded text-neutral-400 hover:text-rose-400 transition-colors"
                            title="Mark Failed"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this quest?')) {
                                    onDelete(quest.id);
                                }
                            }}
                            className="p-1.5 bg-neutral-800 hover:bg-red-900/50 rounded text-neutral-400 hover:text-red-400 transition-colors"
                            title="Delete Quest"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
                {isDM && quest.status !== 'active' && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onUpdateStatus(quest.id, 'active')}
                            className="p-1.5 bg-neutral-800 hover:bg-indigo-900/50 rounded text-neutral-400 hover:text-indigo-400 transition-colors"
                            title="Reactivate"
                        >
                            <Target className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this quest?')) {
                                    onDelete(quest.id);
                                }
                            }}
                            className="p-1.5 bg-neutral-800 hover:bg-red-900/50 rounded text-neutral-400 hover:text-red-400 transition-colors"
                            title="Delete Quest"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {isOpen && <QuestDetailModal quest={quest} onClose={() => setIsOpen(false)} isDM={isDM} />}
        </>
    );
}
