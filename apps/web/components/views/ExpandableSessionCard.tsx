import React, { useState } from 'react';
import { ScrollText, MapPin, BookOpen, Sword, Skull, Trophy, Gem, Calendar, X, ChevronRight, ChevronDown, ChevronUp, FileText, Zap, Edit3, Shield, Target, Heart, Wand2, Pencil, Globe } from 'lucide-react';
import { SessionLog } from '../../types';
import { Badge } from '../ui/Badge';

import { useAuth } from '../../contexts/AuthContext';
import { TranscriptEditorModal } from '../modals/TranscriptEditorModal';

// Combat event types for detailed log
interface CombatEvent {
    round?: number;
    actor: string;
    action: string;
    target?: string;
    roll?: number;
    damage?: string;
    effect?: string;
    type: 'attack' | 'spell' | 'ability' | 'damage' | 'heal' | 'status';
}

interface CombatLogPanelProps {
    combatSummary: Array<{ name: string; result: string }>;
    combatDetails?: CombatEvent[];
    transcript?: string;
}

// Collapsible Combat Log Panel
const CombatLogPanel: React.FC<CombatLogPanelProps> = ({ combatSummary, combatDetails, transcript }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedEvents, setAnalyzedEvents] = useState<CombatEvent[]>([]);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);

    const handleAnalyzeCombat = async () => {
        if (!transcript) return;
        setIsAnalyzing(true);
        setAnalyzeError(null);

        try {
            const response = await fetch('/api/llm/analyze-combat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ transcript }),
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();

            // Flatten all events from all encounters
            const events: CombatEvent[] = [];
            for (const encounter of data.combatEncounters || []) {
                for (const event of encounter.events || []) {
                    events.push({
                        round: event.round || 0,
                        actor: event.actor,
                        action: event.action,
                        target: event.target,
                        roll: event.roll,
                        damage: event.damage,
                        effect: event.effect,
                        type: (event.type || 'status') as CombatEvent['type'],
                    });
                }
            }
            setAnalyzedEvents(events);
        } catch (err) {
            console.error('Combat analysis error:', err);
            setAnalyzeError('Failed to analyze combat. Try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getEventIcon = (type: CombatEvent['type']) => {
        switch (type) {
            case 'attack': return <Sword className="w-3.5 h-3.5 text-rose-400" />;
            case 'spell': return <Wand2 className="w-3.5 h-3.5 text-purple-400" />;
            case 'damage': return <Target className="w-3.5 h-3.5 text-orange-400" />;
            case 'heal': return <Heart className="w-3.5 h-3.5 text-green-400" />;
            case 'ability': return <Shield className="w-3.5 h-3.5 text-blue-400" />;
            default: return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
        }
    };

    // Use analyzed events if available, otherwise generate placeholders
    const events: CombatEvent[] = analyzedEvents.length > 0
        ? analyzedEvents
        : (combatDetails || combatSummary.flatMap((c, i) => [
            { round: i + 1, actor: 'Party', action: `Engaged ${c.name}`, type: 'status' as const },
            { round: i + 1, actor: 'Party', action: c.result === 'Victory' ? `Defeated ${c.name}` : `Battle with ${c.name} - ${c.result}`, type: 'attack' as const },
        ]));

    return (
        <div className={`transition-all duration-300 ${isExpanded ? 'bg-neutral-950/50 rounded-xl border border-rose-500/30' : ''}`}>
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/30 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-950/50 border border-rose-500/30 flex items-center justify-center">
                        <Sword className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                            Combat Log
                            <Badge type="neutral">{combatSummary.length} encounter{combatSummary.length !== 1 ? 's' : ''}</Badge>
                        </h4>
                        <p className="text-xs text-neutral-500">
                            {combatSummary.map(c => c.name).join(', ') || 'No combat recorded'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {combatSummary.length > 0 && (
                        <span className="text-xs text-neutral-500">
                            {isExpanded ? 'Collapse' : 'Expand details'}
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-neutral-500" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-500" />
                    )}
                </div>
            </button>

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="border-t border-neutral-800 pt-4 space-y-4">
                        {/* Initiative Order */}
                        {combatSummary.length > 0 && (
                            <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                                <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Encounters</h5>
                                <div className="flex flex-wrap gap-2">
                                    {combatSummary.map((c, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-neutral-800/50 px-3 py-1.5 rounded-lg">
                                            <Skull className="w-3.5 h-3.5 text-rose-500" />
                                            <span className="text-sm text-neutral-200">{c.name}</span>
                                            <Badge type={c.result === 'Victory' ? 'success' : c.result === 'Defeat' ? 'danger' : 'neutral'}>
                                                {c.result}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Combat Timeline */}
                        <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                            <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Combat Timeline</h5>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {events.length > 0 ? events.map((event, i) => (
                                    <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-neutral-800/30 transition-colors">
                                        <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                                            {getEventIcon(event.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {event.round && (
                                                    <span className="text-xs font-mono text-neutral-600">R{event.round}</span>
                                                )}
                                                <span className="text-sm font-medium text-neutral-200">{event.actor}</span>
                                                <span className="text-xs text-neutral-500">{event.action}</span>
                                            </div>
                                            {(event.target || event.damage || event.effect) && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    {event.target && (
                                                        <span className="text-xs text-rose-400">→ {event.target}</span>
                                                    )}
                                                    {event.roll && (
                                                        <span className="text-xs font-mono text-neutral-500">d20: {event.roll}</span>
                                                    )}
                                                    {event.damage && (
                                                        <span className="text-xs font-mono text-orange-400">{event.damage} dmg</span>
                                                    )}
                                                    {event.effect && (
                                                        <span className="text-xs text-blue-400">{event.effect}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-neutral-500 italic py-2">
                                        Detailed combat events will be extracted from session transcripts.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Analyze button or status */}
                        <div className="flex items-center justify-center gap-2">
                            {transcript && analyzedEvents.length === 0 && (
                                <button
                                    onClick={handleAnalyzeCombat}
                                    disabled={isAnalyzing}
                                    className="px-4 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <span className="animate-spin">⚔️</span>
                                            Analyzing transcript...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            Analyze Combat from Transcript
                                        </>
                                    )}
                                </button>
                            )}
                            {analyzeError && (
                                <span className="text-xs text-red-400">{analyzeError}</span>
                            )}
                            {analyzedEvents.length > 0 && (
                                <span className="text-xs text-green-400">✓ {analyzedEvents.length} events extracted</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ExpandableSessionCardProps {
    session: SessionLog;
    index: number;
    isDM: boolean;
}

// Full Screen Modal for Session Details
const SessionDetailModal: React.FC<{ session: SessionLog; onClose: () => void; isDM: boolean }> = ({ session, onClose, isDM }) => {
    const { isDemo } = useAuth();
    const [showTranscript, setShowTranscript] = useState(false);
    const [isEditingJournal, setIsEditingJournal] = useState(false);
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [editedJournal, setEditedJournal] = useState(session.journalEntry);
    const [currentTranscript, setCurrentTranscript] = useState(session.transcript || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(session.isPublic || false);
    const [isTogglingPublic, setIsTogglingPublic] = useState(false);

    const handleSaveJournal = async () => {
        if (isDemo) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/sessions/${session.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ journalEntry: editedJournal }),
            });
            if (res.ok) {
                setIsEditingJournal(false);
                // Note: Parent component should refresh data
            }
        } catch (error) {
            console.error('Failed to save journal:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTogglePublic = async () => {
        if (isDemo || isTogglingPublic) return;
        setIsTogglingPublic(true);
        try {
            const res = await fetch(`/api/sessions/${session.id}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isPublic: !isPublic }),
            });
            if (res.ok) {
                setIsPublic(!isPublic);
            }
        } catch (error) {
            console.error('Failed to toggle visibility:', error);
        } finally {
            setIsTogglingPublic(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] m-4 mt-8 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-6 py-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center">
                                <ScrollText className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{session.title}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        {session.date}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-neutral-400">
                                        <MapPin className="w-3 h-3" />
                                        {session.summary.location}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isDM && !isDemo && session.transcript && (
                                <button
                                    onClick={() => setShowTranscript(!showTranscript)}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${showTranscript
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                        }`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                                </button>
                            )}
                            {isDM && !isDemo && (
                                <button
                                    onClick={() => setIsEditingTranscript(true)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-1.5"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit Transcript
                                </button>
                            )}
                            {isDM && !isDemo && (
                                <button
                                    onClick={handleTogglePublic}
                                    disabled={isTogglingPublic}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 ${isPublic
                                            ? 'bg-green-600 hover:bg-green-500 text-white'
                                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                                        } ${isTogglingPublic ? 'opacity-50' : ''}`}
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    {isTogglingPublic ? 'Saving...' : (isPublic ? 'Public' : 'Private')}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 space-y-6 custom-scrollbar">
                    {/* TLDR - Quick Summary */}
                    {session.tldr && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" /> Quick Summary
                            </h4>
                            <div className="bg-amber-950/20 rounded-lg p-4 border border-amber-500/20">
                                <p className="text-sm text-amber-100/90 leading-relaxed">
                                    {session.tldr}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Journal Entry */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Chronicle
                            </h4>
                            {isDM && !isDemo && (
                                <button
                                    onClick={() => {
                                        if (isEditingJournal) {
                                            handleSaveJournal();
                                        } else {
                                            setIsEditingJournal(true);
                                        }
                                    }}
                                    disabled={isSaving}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    {isSaving ? 'Saving...' : isEditingJournal ? 'Save' : 'Edit'}
                                </button>
                            )}
                        </div>
                        <div className="bg-neutral-950/30 rounded-lg p-5 border border-neutral-800/30">
                            {isEditingJournal ? (
                                <textarea
                                    value={editedJournal}
                                    onChange={(e) => setEditedJournal(e.target.value)}
                                    className="w-full min-h-[200px] bg-transparent text-base leading-8 text-neutral-300 font-serif italic resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded p-2"
                                    placeholder="Write the chronicle of this session..."
                                />
                            ) : (
                                <p className="text-base leading-8 text-neutral-300 font-serif italic">
                                    "{session.journalEntry}"
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Combat Log - Collapsible Panel */}
                    <section>
                        <CombatLogPanel
                            combatSummary={session.summary.combat}
                            transcript={session.transcript}
                        />
                    </section>

                    {/* Loot Section */}
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* Loot */}
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" /> Loot & Rewards
                            </h4>
                            <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 space-y-2">
                                {session.summary.loot.length > 0 ? session.summary.loot.map((l, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-neutral-800/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center border border-neutral-800">
                                                <Gem className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <span className="text-sm font-medium text-neutral-200">{l.name}</span>
                                        </div>
                                        <span className="text-xs text-neutral-500 font-mono bg-neutral-900/50 px-2 py-1 rounded border border-neutral-800/30">
                                            {l.effect}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-xs text-neutral-500 italic">No loot found.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Key Interactions & Decisions Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Key Interactions */}
                        {session.keyInteractions && session.keyInteractions.length > 0 && (
                            <section>
                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Key Interactions</h4>
                                <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 space-y-3">
                                    {session.keyInteractions.map((interaction: { npc: string; description: string }, i: number) => (
                                        <div key={i} className="p-2 rounded hover:bg-neutral-800/30 transition-colors">
                                            <div className="text-sm font-medium text-purple-300">{interaction.npc}</div>
                                            <div className="text-xs text-neutral-400 mt-1">{interaction.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Decisions To Make */}
                        {session.decisions && session.decisions.length > 0 && (
                            <section>
                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Decisions To Make</h4>
                                <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 space-y-2">
                                    {session.decisions.map((d: { description: string; resolved: boolean }, i: number) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded hover:bg-neutral-800/30 transition-colors">
                                            <span className={`text-sm ${d.resolved ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {d.resolved ? '✓' : '○'}
                                            </span>
                                            <span className={`text-sm ${d.resolved ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
                                                {d.description}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Plans / Next Steps */}
                    {session.plans && session.plans.length > 0 && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-4 h-4 text-emerald-400">📋</span> Plans & Next Steps
                            </h4>
                            <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 space-y-2">
                                {session.plans.map((p: { description: string; completed: boolean }, i: number) => (
                                    <div key={i} className="flex items-start gap-2 p-2 rounded hover:bg-neutral-800/30 transition-colors">
                                        <span className={`text-sm ${p.completed ? 'text-green-400' : 'text-emerald-400'}`}>
                                            {p.completed ? '✓' : '→'}
                                        </span>
                                        <span className={`text-sm ${p.completed ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
                                            {p.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Transcript (Hidden by default) */}
                    {showTranscript && !isDemo && session.transcript && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Full Transcript
                            </h4>
                            <div className="bg-neutral-950/50 rounded-lg p-4 border border-neutral-800/30 max-h-96 overflow-y-auto custom-scrollbar">
                                <pre className="text-xs text-neutral-400 font-mono whitespace-pre-wrap leading-relaxed">
                                    {session.transcript}
                                </pre>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Transcript Editor Modal */}
            <TranscriptEditorModal
                isOpen={isEditingTranscript}
                onClose={() => setIsEditingTranscript(false)}
                sessionId={session.id}
                initialTranscript={currentTranscript}
                onSave={(newTranscript) => {
                    setCurrentTranscript(newTranscript);
                    setIsEditingTranscript(false);
                }}
            />
        </div>
    );
};

// Compact Timeline Card
export const ExpandableSessionCard: React.FC<ExpandableSessionCardProps> = ({ session, index, isDM }) => {
    const { isDemo } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div
                className="relative pl-8 md:pl-12 animate-in fade-in slide-in-from-left-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
            >
                {/* Timeline Node */}
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-neutral-900 border border-neutral-700 ring-4 ring-neutral-950 flex items-center justify-center z-10 shadow-lg">
                    <ScrollText className="w-3 h-3 text-indigo-400" />
                </div>

                {/* Date Marker */}
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-indigo-400 font-medium tracking-tight bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {session.date}
                    </span>
                    <div className="h-px w-12 bg-linear-to-r from-neutral-800 to-transparent"></div>
                </div>

                {/* Card */}
                <div
                    onClick={() => setIsOpen(true)}
                    className="group relative bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all cursor-pointer"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                            {session.title}
                        </h3>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-950/50 rounded border border-neutral-800 text-xs text-neutral-400 self-start sm:self-auto">
                            <MapPin className="w-3 h-3 text-neutral-500" />
                            {session.summary.location}
                        </div>
                    </div>

                    {/* Summary Preview - show TLDR if available, otherwise journal */}
                    <p className="text-sm text-neutral-400 leading-relaxed line-clamp-2 font-serif italic mb-4">
                        {session.tldr ? session.tldr : `"${session.journalEntry}"`}
                    </p>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                        {session.summary.combat.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Sword className="w-3.5 h-3.5 text-rose-400" />
                                <span>{session.summary.combat.length} combat{session.summary.combat.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {session.summary.loot.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Gem className="w-3.5 h-3.5 text-amber-400" />
                                <span>{session.summary.loot.length} loot</span>
                            </div>
                        )}
                        {isDM && !isDemo && session.transcript && (
                            <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-400" />
                                <span>Transcript</span>
                            </div>
                        )}
                        <span className="ml-auto text-indigo-400 group-hover:text-white flex items-center gap-1 transition-colors">
                            View Details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isOpen && <SessionDetailModal session={session} onClose={() => setIsOpen(false)} isDM={isDM} />}
        </>
    );
};
