import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, BookOpen, ChevronRight, ChevronDown, Settings, Database, Loader2 } from 'lucide-react';
import { CampaignData } from '../../types';
import { Badge } from '../ui/Badge';
import { client } from '../../app/lib/client';

interface OracleViewProps {
    data: CampaignData;
    isDM: boolean;
}

type ModelProvider = 'local' | 'gemini' | 'openai' | 'anthropic';

interface ModelOption {
    provider: ModelProvider;
    model: string;
    label: string;
    description: string;
}

const MODEL_OPTIONS: ModelOption[] = [
    { provider: 'local', model: 'local/llama3.2', label: 'Local (Ollama)', description: 'Free, privacy-focused' },
    { provider: 'gemini', model: 'gemini/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast, efficient' },
    { provider: 'gemini', model: 'gemini/gemini-3.0-pro', label: 'Gemini 3.0 Pro', description: 'Most capable' },
    { provider: 'openai', model: 'openai/gpt-5.1', label: 'GPT-5.1', description: 'BYOK - Your API key' },
    { provider: 'anthropic', model: 'anthropic/claude-4.5-sonnet', label: 'Claude 4.5 Sonnet', description: 'BYOK - Your API key' },
];

export const OracleView: React.FC<OracleViewProps> = ({ data, isDM }) => {
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[1]); // Default to Gemini Flash
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [enableRAG, setEnableRAG] = useState(true); // RAG enabled by default
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isChatLoading]);

    // Load saved model preference
    useEffect(() => {
        const savedModel = localStorage.getItem('oracle-model');
        if (savedModel) {
            const found = MODEL_OPTIONS.find(m => m.model === savedModel);
            if (found) setSelectedModel(found);
        }
        // Load RAG preference
        const savedRAG = localStorage.getItem('oracle-rag');
        if (savedRAG !== null) {
            setEnableRAG(savedRAG === 'true');
        }
    }, []);

    const handleModelChange = (option: ModelOption) => {
        setSelectedModel(option);
        localStorage.setItem('oracle-model', option.model);
        setShowModelSelector(false);
    };

    const handleRAGToggle = () => {
        const newValue = !enableRAG;
        setEnableRAG(newValue);
        localStorage.setItem('oracle-rag', String(newValue));
    };

    const handleOracleChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        if (!isDM) {
            setChatHistory(prev => [...prev, { role: 'assistant', text: "Apologies, adventurer. Only the Dungeon Master may consult the Oracle directly to preserve the timeline's integrity." }]);
            setChatInput("");
            return;
        }

        const newMessage = chatInput;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', text: newMessage }]);
        setIsChatLoading(true);

        const context = `
You are The Oracle, an AI assistant for a D&D campaign.
Current Campaign: "${data.title}"
Party Members: ${data.party.map(p => `${p.name} (${p.class} Lvl ${p.level})`).join(', ')}
Active Quests: ${data.quests.filter(q => q.status === 'active').map(q => q.title).join(', ')}
Latest Journal Entry: "${data.sessions[0]?.journalEntry || "None"}"

Answer questions about the campaign, rules, or lore. Be helpful, concise, and thematic.
`;

        try {
            const messages = [
                ...chatHistory.map(h => ({
                    role: h.role === 'user' ? 'user' as const : 'assistant' as const,
                    content: h.text
                })),
                { role: 'user' as const, content: newMessage }
            ];

            const response = await (client as any).api.llm.chat.$post({
                json: {
                    model: selectedModel.model,
                    messages,
                    stream: false,
                    campaignContext: context,
                    enableRAG: enableRAG,
                    campaignId: data.campaignId,
                }
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            const result = await response.json();
            const text = result.choices?.[0]?.message?.content || result.message?.content || "The Oracle is silent...";
            
            setChatHistory(prev => [...prev, { role: 'assistant', text }]);
        } catch (error) {
            console.error("Oracle chat error:", error);
            setChatHistory(prev => [...prev, { role: 'assistant', text: "The Oracle is currently unreachable. Please check your model configuration." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const getProviderColor = (provider: ModelProvider) => {
        switch (provider) {
            case 'local': return 'text-green-400 bg-green-500/10';
            case 'gemini': return 'text-blue-400 bg-blue-500/10';
            case 'openai': return 'text-emerald-400 bg-emerald-500/10';
            case 'anthropic': return 'text-orange-400 bg-orange-500/10';
        }
    };

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col max-w-4xl mx-auto bg-neutral-900/20 border border-neutral-800 rounded-xl overflow-hidden backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">The Oracle</h3>
                        <p className="text-[10px] text-neutral-400">Powered by {selectedModel.label}</p>
                    </div>
                    {!isDM && (
                        <Badge type="warning">Player Access Restricted</Badge>
                    )}
                </div>
                
                {/* Model Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowModelSelector(!showModelSelector)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${getProviderColor(selectedModel.provider)} border-current/20 hover:border-current/40`}
                    >
                        <Settings className="w-3 h-3" />
                        {selectedModel.label}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showModelSelector && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="p-2 border-b border-neutral-800">
                                <p className="text-[10px] text-neutral-500 uppercase font-bold">Select Model</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {MODEL_OPTIONS.map((option) => (
                                    <button
                                        key={option.model}
                                        onClick={() => handleModelChange(option)}
                                        className={`w-full text-left px-3 py-2 hover:bg-neutral-800/50 transition-colors flex items-center justify-between ${selectedModel.model === option.model ? 'bg-neutral-800' : ''}`}
                                    >
                                        <div>
                                            <p className="text-sm text-white">{option.label}</p>
                                            <p className="text-[10px] text-neutral-500">{option.description}</p>
                                        </div>
                                        {selectedModel.model === option.model && (
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* RAG Toggle */}
                <button
                    onClick={handleRAGToggle}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        enableRAG 
                            ? 'text-purple-400 bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50' 
                            : 'text-neutral-500 bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                    }`}
                    title={enableRAG ? "Campaign knowledge enabled (Vertex AI Search)" : "Campaign knowledge disabled"}
                >
                    <Database className={`w-3 h-3 ${enableRAG ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">{enableRAG ? 'RAG On' : 'RAG Off'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <BookOpen className="w-12 h-12 text-neutral-500 mb-4" />
                        <h3 className="text-lg font-medium text-neutral-300 mb-2">The Archives are Open</h3>
                        <p className="text-sm text-neutral-500 max-w-xs">Ask me about previous sessions, NPC locations, or campaign lore.</p>
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-6 h-6 rounded bg-indigo-600/20 flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-neutral-800 text-white rounded-br-sm'
                            : 'bg-neutral-950/50 border border-neutral-800 text-neutral-300 rounded-bl-sm shadow-sm'
                            }`}>
                            {msg.text.split('\n').map((line, j) => (
                                <p key={j} className="mb-2 last:mb-0">{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex gap-4">
                        <div className="w-6 h-6 rounded bg-indigo-600/20 flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                        </div>
                        <div className="bg-neutral-950/50 border border-neutral-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-900/50">
                <form onSubmit={handleOracleChat} className="relative group">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={!isDM}
                        placeholder={isDM ? "Ask a question about your campaign..." : "Only the DM may consult the Oracle."}
                        className="w-full bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!chatInput.trim() || isChatLoading || !isDM}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-0 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};
