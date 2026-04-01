import React, { useState, useRef } from 'react';
import { Edit3, Upload, ScrollText, MapPin, BookOpen, Sword, Skull, Trophy, Gem, X, FileText, Settings, ChevronDown } from 'lucide-react';
import { CampaignData, SessionLog, Notification } from '../../types';
import { GeminiService } from '../../services/geminiService';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ExpandableSessionCard } from './ExpandableSessionCard';

interface SessionsViewProps {
    data: CampaignData;
    isDM: boolean;
    onAddSession: (session: SessionLog) => void;
    onAddNotification: (notification: Notification) => void;
    setActiveView: (view: any) => void;
    isTranscriptModalOpen: boolean;
    setIsTranscriptModalOpen: (isOpen: boolean) => void;
}

interface AnalysisOptions {
    extractCombat: boolean;
    extractLoot: boolean;
    detectNPCs: boolean;
    keyMoments: boolean;
    summaryLength: 'brief' | 'standard' | 'detailed';
    focusAreas: string;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
    data, isDM, onAddSession, onAddNotification, setActiveView, isTranscriptModalOpen, setIsTranscriptModalOpen
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState("");
    const [textTranscript, setTextTranscript] = useState("");
    const [uploadedFileName, setUploadedFileName] = useState("");
    const audioInputRef = useRef<HTMLInputElement>(null);
    const textFileInputRef = useRef<HTMLInputElement>(null);
    const [showOptions, setShowOptions] = useState(false);
    const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>({
        extractCombat: true,
        extractLoot: true,
        detectNPCs: true,
        keyMoments: true,
        summaryLength: 'standard',
        focusAreas: 'Sanitize speaker names to character names. Clean up speaker attribution. Party: Erato (Thomas), Arfine (Lucy), Shava (Amanda), Vorth (Kevin). DM is Richard. Magnolius is controlled by Richard.'
    });

    const createSession = (result: any) => {
        const newSession: SessionLog = {
            id: `s${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: result.title || "Untitled Session",
            summary: {
                location: result.location || "Unknown",
                combat: result.combat || [],
                loot: result.loot || []
            },
            journalEntry: result.journalEntry || "No journal entry generated.",
            transcript: result.transcript // Preserve transcript if passed
        };

        onAddSession(newSession);
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isDM) return;

        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProcessingStatus("Analyzing audio waveform...");

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                setProcessingStatus("Summoning Gemini 2.5 Flash...");

                try {
                    const result = await GeminiService.processSessionAudio(
                        base64Data,
                        file.type,
                        "Focus on extracting NPC names, locations, and loot.",
                        false // isDemo - always use real analysis for DMs
                    );

                    createSession(result);
                    setProcessingStatus("Session transcribed successfully.");

                    onAddNotification({
                        id: `n${Date.now()}`,
                        title: 'Audio Processed',
                        message: `Session "${result.title}" is ready.`,
                        date: 'Just now',
                        read: false,
                        type: 'ai'
                    });

                    setTimeout(() => {
                        setIsProcessing(false);
                        setProcessingStatus("");
                    }, 1500);

                } catch (error) {
                    console.error(error);
                    setProcessingStatus("Failed to commune with the Oracle.");
                    setTimeout(() => setIsProcessing(false), 3000);
                }
            };
        } catch (error) {
            setIsProcessing(false);
        }
    };

    const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setTextTranscript(content);
            setUploadedFileName(file.name);
        };
        reader.readAsText(file);
    };

    const handleTextTranscriptSubmit = async () => {
        if (!isDM) return;
        if (!textTranscript.trim()) return;

        setIsProcessing(true);
        setProcessingStatus("Analyzing transcript...");
        setIsTranscriptModalOpen(false);

        try {
            const result = await GeminiService.analyzeTranscript(
                textTranscript,
                analysisOptions,
                false // isDemo
            );

            createSession({ ...result, transcript: textTranscript });

            setProcessingStatus("Transcript analyzed successfully.");
            setTextTranscript("");
            setUploadedFileName("");

            onAddNotification({
                id: `n${Date.now()}`,
                title: 'Transcript Analyzed',
                message: `Session "${result.title}" is ready.`,
                date: 'Just now',
                read: false,
                type: 'ai'
            });

            setTimeout(() => {
                setIsProcessing(false);
                setProcessingStatus("");
            }, 1500);

        } catch (error) {
            console.error(error);
            setProcessingStatus("Analysis failed.");
            setTimeout(() => setIsProcessing(false), 3000);
        }
    };

    return (
        <>
            {/* Transcript Modal */}
            {isTranscriptModalOpen && (
                <div className="fixed inset-0 z-100 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                            <h3 className="font-semibold text-white">Add Session Transcript</h3>
                            <button onClick={() => setIsTranscriptModalOpen(false)}><X className="w-5 h-5 text-neutral-500 hover:text-white" /></button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
                            {/* File Upload or Paste */}
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm flex items-center gap-2 transition-colors border border-neutral-700">
                                    <FileText className="w-4 h-4" />
                                    <span>Upload .txt/.md</span>
                                    <input
                                        ref={textFileInputRef}
                                        type="file"
                                        accept=".txt,.md,.text"
                                        className="hidden"
                                        onChange={handleTextFileUpload}
                                    />
                                </label>
                                {uploadedFileName && (
                                    <span className="text-xs text-indigo-400 flex items-center gap-1">
                                        ✓ {uploadedFileName}
                                    </span>
                                )}
                                <span className="text-xs text-neutral-500">or paste below</span>
                            </div>

                            <textarea
                                value={textTranscript}
                                onChange={(e) => setTextTranscript(e.target.value)}
                                placeholder="Paste transcript text here..."
                                className="flex-1 min-h-[200px] w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-mono text-neutral-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 resize-none"
                            />

                            {/* Analysis Options */}
                            <div className="border-t border-neutral-800 pt-4">
                                <button
                                    onClick={() => setShowOptions(!showOptions)}
                                    className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Analysis Options</span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                                </button>

                                {showOptions && (
                                    <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { key: 'extractCombat', label: 'Extract Combat', icon: '⚔️' },
                                                { key: 'extractLoot', label: 'Extract Loot', icon: '💎' },
                                                { key: 'detectNPCs', label: 'Detect NPCs', icon: '👤' },
                                                { key: 'keyMoments', label: 'Key Moments', icon: '⭐' },
                                            ].map(({ key, label, icon }) => (
                                                <label key={key} className="flex items-center gap-2 px-3 py-2 bg-neutral-950 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={analysisOptions[key as keyof AnalysisOptions] as boolean}
                                                        onChange={(e) => setAnalysisOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-indigo-500 focus:ring-indigo-500/30"
                                                    />
                                                    <span className="text-sm text-neutral-300">{icon} {label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-neutral-400">Summary Length:</label>
                                            <select
                                                value={analysisOptions.summaryLength}
                                                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, summaryLength: e.target.value as 'brief' | 'standard' | 'detailed' }))}
                                                className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-indigo-500/50"
                                            >
                                                <option value="brief">Brief</option>
                                                <option value="standard">Standard</option>
                                                <option value="detailed">Detailed</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-sm text-neutral-400 mb-1 block">Focus Areas (optional):</label>
                                            <input
                                                type="text"
                                                value={analysisOptions.focusAreas}
                                                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, focusAreas: e.target.value }))}
                                                placeholder="e.g., 'Focus on NPC dialogue', 'Emphasize combat tactics'"
                                                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-neutral-800 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setIsTranscriptModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleTextTranscriptSubmit} disabled={!textTranscript.trim() || isProcessing}>
                                {isProcessing ? 'Analyzing...' : 'Analyze Transcript'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-white">Session Logs</h2>
                        <p className="text-sm text-neutral-400 mt-1">Archive of all past adventures.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isProcessing ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold animate-pulse">{processingStatus}</span>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {isDM && (
                                    <>
                                        <button
                                            onClick={() => setIsTranscriptModalOpen(true)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors border border-neutral-700"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            <span>Add Transcript</span>
                                        </button>
                                        <label className="cursor-pointer bg-white hover:bg-neutral-200 text-neutral-950 px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-white/5">
                                            <Upload className="w-4 h-4" />
                                            <span>Upload Audio</span>
                                            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                        </label>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative border-l-2 border-neutral-800/50 ml-3 md:ml-6 space-y-12 pb-12">
                    {data.sessions.map((session, idx) => (
                        <ExpandableSessionCard key={session.id} session={session} index={idx} isDM={isDM} />
                    ))}
                </div>
            </div>
        </>
    );
};
