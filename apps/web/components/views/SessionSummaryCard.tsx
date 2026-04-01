import React from 'react';
import { Map, Calendar, Sword, Coins, ArrowRight } from 'lucide-react';
import { SessionLog } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface SessionSummaryCardProps {
    session: SessionLog;
    onClick?: () => void;
}

export const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({ session, onClick }) => {
    return (
        <Card className="h-full flex flex-col relative overflow-hidden group border-indigo-500/20 shadow-[0_0_30px_-5px_rgba(79,70,229,0.1)]">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            Last Session Recap
                        </h3>
                        <p className="text-sm text-neutral-400 font-medium">{session.title}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4 text-xs text-neutral-400">
                    <div className="flex items-center gap-1.5 bg-neutral-800/50 px-2.5 py-1 rounded-md border border-neutral-700/50">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{session.date}</span>
                    </div>
                    {session.summary.location && (
                        <div className="flex items-center gap-1.5 bg-neutral-800/50 px-2.5 py-1 rounded-md border border-neutral-700/50">
                            <Map className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{session.summary.location}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 mb-6">
                    <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-800/50 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 rounded-l-lg"></div>
                        <p className="text-sm text-neutral-300 leading-relaxed italic">
                            "{session.journalEntry.length > 200 ? `${session.journalEntry.slice(0, 200)}...` : session.journalEntry}"
                        </p>
                    </div>
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {session.summary.combat.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 flex items-center gap-1.5">
                                <Sword className="w-3 h-3" />
                                Combat Highlights
                            </h4>
                            <div className="space-y-1">
                                {session.summary.combat.slice(0, 2).map((c, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-neutral-800/30 px-2 py-1.5 rounded text-neutral-400">
                                        <span className="truncate max-w-[70%]">{c.name}</span>
                                        <span className={`text-[10px] px-1 rounded ${c.result === 'Victory' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-700/50 text-neutral-500'}`}>
                                            {c.result}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {session.summary.loot.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 flex items-center gap-1.5">
                                <Coins className="w-3 h-3" />
                                Loot Acquired
                            </h4>
                            <div className="space-y-1">
                                {session.summary.loot.slice(0, 2).map((l, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs bg-neutral-800/30 px-2 py-1.5 rounded text-neutral-300">
                                        <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0"></span>
                                        <span className="truncate">{l.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Items & Decisions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     {session.summary.actionItems && session.summary.actionItems.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Action Items</h4>
                            <ul className="space-y-1">
                                {session.summary.actionItems.slice(0, 3).map((item, i) => (
                                    <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                                        <span className="text-indigo-500 mt-0.5">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {session.summary.decisions && session.summary.decisions.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Key Decisions</h4>
                            <ul className="space-y-1">
                                {session.summary.decisions.slice(0, 3).map((item, i) => (
                                    <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                                       <span className="text-amber-500 mt-0.5">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Quest Updates */}
                {session.summary.questUpdates && session.summary.questUpdates.length > 0 && (
                     <div className="mb-6 space-y-2">
                        <h4 className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">Quest Updates</h4>
                        <div className="space-y-1.5">
                            {session.summary.questUpdates.map((update, i) => (
                                <div key={i} className="text-xs bg-neutral-800/20 border border-neutral-800 rounded px-2 py-1.5 text-neutral-400">
                                    {update}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {onClick && (
                    <Button 
                        onClick={onClick}
                        className="w-full mt-auto bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 group-hover:border-neutral-600 transition-all font-medium"
                        icon={ArrowRight}
                    >
                        View Full Log
                    </Button>
                )}
            </div>
        </Card>
    );
};
