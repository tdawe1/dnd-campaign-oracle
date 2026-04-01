import React, { useState, useEffect } from 'react';
import { X, Wand2, Save, RotateCcw, History, ChevronRight, Sparkles, FileText, Users, Clock, AlignLeft, VolumeX, Tag, MessageSquare, Zap } from 'lucide-react';

interface TranscriptVersion {
    id: string;
    version: number;
    content: string;
    aiInstructions: string | null;
    isActive: boolean;
    isAiGenerated: boolean;
    createdAt: string;
}

interface TranscriptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    initialTranscript: string;
    onSave: (newTranscript: string) => void;
}

export const TranscriptEditorModal: React.FC<TranscriptEditorModalProps> = ({
    isOpen,
    onClose,
    sessionId,
    initialTranscript,
    onSave
}) => {
    const [transcript, setTranscript] = useState(initialTranscript);
    const [versions, setVersions] = useState<TranscriptVersion[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [instructions, setInstructions] = useState('');
    const [limit, setLimit] = useState({ limit: 3, used: 0, remaining: 3, isDM: false });
    const [error, setError] = useState<string | null>(null);
    const [isTransforming, setIsTransforming] = useState(false);
    const [activeTransform, setActiveTransform] = useState<string | null>(null);

    // Fetch versions and limits on mount
    useEffect(() => {
        if (isOpen && sessionId) {
            fetchVersions();
            fetchLimit();
        }
    }, [isOpen, sessionId]);

    const fetchVersions = async () => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/transcript-versions`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setVersions(data);
            }
        } catch (err) {
            console.error('Failed to fetch versions:', err);
        }
    };

    const fetchLimit = async () => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/transcript-limit`, {
                credentials: 'include'
            });
            if (res.ok) {
                setLimit(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch limit:', err);
        }
    };

    const handleRefine = async () => {
        if (!instructions.trim()) {
            setError('Please enter instructions for the AI');
            return;
        }
        if (limit.remaining <= 0) {
            setError(`AI version limit reached (${limit.limit})`);
            return;
        }

        setIsRefining(true);
        setError(null);

        try {
            // Use streaming fetch for long-running refinement
            const response = await fetch('/api/llm/refine-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    transcript,
                    instructions,
                    focusAreas: []
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || 'Refinement failed');
            }

            // Handle SSE streaming response
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            const decoder = new TextDecoder();
            let refinedTranscript = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events from buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const data = JSON.parse(line.slice(5).trim());
                            if (data.text) {
                                refinedTranscript += data.text;
                            }
                            if (data.refinedTranscript) {
                                refinedTranscript = data.refinedTranscript;
                            }
                            if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (parseErr) {
                            // Ignore parse errors for non-JSON lines
                        }
                    }
                }
            }

            if (!refinedTranscript) {
                throw new Error('No refined transcript received');
            }

            // Save as new version
            const saveRes = await fetch(`/api/sessions/${sessionId}/transcript-versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    content: refinedTranscript,
                    aiInstructions: instructions,
                    isAiGenerated: true
                })
            });

            if (!saveRes.ok) {
                const err = await saveRes.json();
                throw new Error(err.error || 'Save failed');
            }

            setTranscript(refinedTranscript);
            setInstructions('');
            fetchVersions();
            fetchLimit();
        } catch (err: any) {
            setError(err.message || 'Failed to refine transcript');
        } finally {
            setIsRefining(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save as manual version
            await fetch(`/api/sessions/${sessionId}/transcript-versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    content: transcript,
                    isAiGenerated: false
                })
            });

            onSave(transcript);
            fetchVersions();
        } catch (err) {
            setError('Failed to save transcript');
        } finally {
            setIsSaving(false);
        }
    };

    const handleActivateVersion = async (version: TranscriptVersion) => {
        try {
            await fetch(`/api/sessions/${sessionId}/transcript-versions/${version.id}/activate`, {
                method: 'PATCH',
                credentials: 'include'
            });
            setTranscript(version.content);
            fetchVersions();
        } catch (err) {
            setError('Failed to activate version');
        }
    };

    const handleTransform = async (transformType: string) => {
        if (isTransforming || isRefining) return;
        setIsTransforming(true);
        setActiveTransform(transformType);
        setError(null);

        try {
            const response = await fetch('/api/llm/transform-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ transcript, transformType }),
            });

            if (!response.ok) throw new Error('Transform request failed');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let transformedText = '';

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk) {
                                transformedText += data.chunk;
                                setTranscript(transformedText);
                            }
                            if (data.transformedTranscript) {
                                transformedText = data.transformedTranscript;
                                setTranscript(transformedText);
                            }
                            if (data.error) throw new Error(data.error);
                        } catch (parseErr) { }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || 'Transformation failed');
        } finally {
            setIsTransforming(false);
            setActiveTransform(null);
        }
    };

    const TRANSFORMS = [
        { type: 'speaker-attribution', label: 'Names', icon: Users, desc: 'Player → Character' },
        { type: 'timestamp-cleanup', label: 'Times', icon: Clock, desc: 'Remove timestamps' },
        { type: 'paragraph-format', label: 'Format', icon: AlignLeft, desc: 'Paragraphs' },
        { type: 'noise-removal', label: 'Clean', icon: VolumeX, desc: 'Remove noise' },
        { type: 'action-tagging', label: 'Tags', icon: Tag, desc: 'Add action tags' },
        { type: 'dialogue-format', label: 'Dialog', icon: MessageSquare, desc: 'Format speech' },
        { type: 'full-cleanup', label: 'Full', icon: Zap, desc: 'All transforms' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal - fills available height */}
            <div className="relative w-full max-w-6xl h-[calc(100vh-2rem)] m-4 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex">
                {/* Main Editor */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-lg font-bold text-white">Edit Transcript</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
                                title="Version History"
                            >
                                <History className="w-5 h-5" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>
                    </div>

                    {/* AI Refine Section */}
                    <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-neutral-400 mb-2 block">
                                    AI Instructions - What should the AI focus on or change?
                                </label>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="e.g., 'Focus on combat details', 'Clean up speaker attribution', 'Highlight NPC dialogue'"
                                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={handleRefine}
                                    disabled={isRefining || (limit.remaining !== -1 && limit.remaining <= 0)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    {isRefining ? (
                                        <><Sparkles className="w-4 h-4 animate-spin" /> Refining...</>
                                    ) : (
                                        <><Wand2 className="w-4 h-4" /> Refine with AI</>
                                    )}
                                </button>
                                <span className="text-xs text-neutral-500">
                                    {limit.remaining === -1 ? 'Unlimited AI refinements' : `${limit.remaining}/${limit.limit} AI refinements left`}
                                </span>
                            </div>
                        </div>
                        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                    </div>

                    {/* Quick Transforms Toolbar */}
                    <div className="px-6 py-3 border-b border-neutral-800 bg-neutral-900/30">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 mr-2">Quick Transforms:</span>
                            {TRANSFORMS.map(({ type, label, icon: Icon, desc }) => (
                                <button
                                    key={type}
                                    onClick={() => handleTransform(type)}
                                    disabled={isTransforming || isRefining}
                                    title={desc}
                                    className={`px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-all ${activeTransform === type
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${activeTransform === type ? 'animate-pulse' : ''}`} />
                                    {label}
                                </button>
                            ))}
                        </div>
                        {isTransforming && (
                            <p className="text-xs text-indigo-400 mt-2 flex items-center gap-2">
                                <Sparkles className="w-3 h-3 animate-spin" />
                                Applying {activeTransform?.replace('-', ' ')}...
                            </p>
                        )}
                    </div>

                    {/* Editor */}
                    <div className="flex-1 min-h-0 overflow-hidden p-4">
                        <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            className="w-full h-full bg-neutral-950/50 border border-neutral-800 rounded-lg p-4 text-sm text-neutral-300 font-mono resize-none focus:outline-none focus:border-indigo-500/50 custom-scrollbar overflow-y-auto"
                            placeholder="Paste or edit your session transcript here..."
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
                        <button
                            onClick={() => setTranscript(initialTranscript)}
                            className="px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" /> Revert
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || transcript === initialTranscript}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                        >
                            {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </div>
                </div>

                {/* Version History Sidebar */}
                {showHistory && (
                    <div className="w-72 border-l border-neutral-800 bg-neutral-950/50 flex flex-col">
                        <div className="px-4 py-3 border-b border-neutral-800">
                            <h3 className="text-sm font-bold text-neutral-300">Version History</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {versions.length > 0 ? versions.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => handleActivateVersion(v)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${v.isActive
                                        ? 'bg-indigo-600/20 border border-indigo-500/30'
                                        : 'hover:bg-neutral-800/50 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-neutral-200">
                                            Version {v.version}
                                        </span>
                                        {v.isAiGenerated && (
                                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">AI</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1 truncate">
                                        {v.aiInstructions || 'Manual edit'}
                                    </p>
                                    <p className="text-[10px] text-neutral-600 mt-1">
                                        {new Date(v.createdAt).toLocaleDateString()}
                                    </p>
                                </button>
                            )) : (
                                <p className="text-xs text-neutral-500 text-center py-4">No versions yet</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
