import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Minimize2, ChevronDown, Bot, User as UserIcon, Loader2, Database, Info, Maximize2 } from 'lucide-react';
import { CampaignData } from '../../../types';
import { client } from '../../lib/client';

interface OraclePanelProps {
    data: CampaignData;
    isDM: boolean;
    isOpen: boolean;
    onClose: () => void;
    isMinimized: boolean;
    onMinimize: (minimized: boolean) => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ModelOption {
    id: string;
    name: string;
    model: string;
    provider: 'google' | 'openai' | 'anthropic';
    description: string;
}

const MODEL_OPTIONS: ModelOption[] = [
    { id: 'gemini-pro', name: 'Gemini Pro', model: 'gemini/gemini-pro', provider: 'google', description: 'Best for complex reasoning & creativity' },
    { id: 'gemini-flash', name: 'Gemini 2.5 Flash', model: 'gemini/gemini-2.5-flash', provider: 'google', description: 'Next-gen fast model' },
    // { id: 'gpt-4', name: 'GPT-4', model: 'openai/gpt-4', provider: 'openai', description: 'High intelligence (Needs API Key)' },
    // { id: 'claude-3', name: 'Claude 3', model: 'anthropic/claude-3-opus', provider: 'anthropic', description: 'Natural writing style (Needs API Key)' },
];

export const OraclePanel: React.FC<OraclePanelProps> = ({ data, isDM, isOpen, onClose, isMinimized, onMinimize }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Greetings, Dungeon Master. I am the Oracle, your AI companion for this campaign. Ask me anything about rules, lore, or for creative inspiration." }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[1]);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [enableRAG, setEnableRAG] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Close model menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Prepared context string
            const context = `
            Current Campaign: ${data.title}
            Party Level: ${Math.floor(data.party.reduce((acc, char) => acc + char.level, 0) / (data.party.length || 1))}
            Current Quest: ${data.quests.find(q => q.status === 'active')?.title || 'None'}
            Location: ${data.sessions[0]?.summary.location || 'Unknown'}
            `;

            const res = await (client as any).api.llm.chat.$post({
                json: {
                    messages: messages.concat({ role: 'user', content: userMessage }).map(m => ({ role: m.role, content: m.content })),
                    model: selectedModel.model,
                    stream: false,
                    campaignContext: context,
                    enableRAG: enableRAG,
                    campaignId: data.campaignId
                }
            });

            if (!res.ok) {
                const errorData = await res.json() as any;
                throw new Error(errorData.error || 'Failed to get response');
            }

            const responseData = await res.json();

            // API returns { choices: [{ message: { content: "..." } }] }
            const content = responseData.choices?.[0]?.message?.content || responseData.content || "The Oracle is silent...";
            setMessages(prev => [...prev, { role: 'assistant', content }]);
        } catch (error) {
            console.error('Oracle error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I apologize, but I'm having trouble connecting to the ethereal plane right now. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    if (isMinimized) {
        return (
            <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <button
                    onClick={() => onMinimize(false)}
                    className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white transition-all hover:scale-105"
                >
                    <Sparkles className="w-6 h-6" />
                </button>
            </div>
        );
    }

    return (
        <div className="absolute inset-y-0 right-0 w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out z-40">
            {/* Header */}
            <div className="h-14 px-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900 shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-white">Oracle Chat</span>
                    <div className="relative" ref={modelMenuRef}>
                        <button
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="ml-2 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-400 hover:text-white hover:border-neutral-600 flex items-center gap-1 transition-colors"
                        >
                            {selectedModel.name}
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Model Dropdown */}
                        {showModelMenu && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-2 space-y-1">
                                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Select Model</div>
                                    {MODEL_OPTIONS.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setSelectedModel(option);
                                                setShowModelMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${selectedModel.id === option.id
                                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                    : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                                                }`}
                                        >
                                            <div className="font-medium">{option.name}</div>
                                            <div className="text-[10px] opacity-70 mt-0.5">{option.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setEnableRAG(!enableRAG)}
                        className={`p-1.5 rounded-md transition-colors ${enableRAG ? 'text-emerald-400 bg-emerald-950/30' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title={enableRAG ? "RAG Enabled (Using Campaign Data)" : "RAG Disabled"}
                    >
                        <Database className="w-4 h-4" />
                    </button>
                    <button onClick={() => onMinimize(true)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-md transition-colors">
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-neutral-900/50">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-indigo-600 text-white' : 'bg-neutral-700 text-neutral-300'
                            }`}>
                            {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                        </div>
                        <div className={`rounded-lg p-3 text-sm max-w-[85%] leading-relaxed ${msg.role === 'assistant'
                                ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                                : 'bg-indigo-600/10 text-indigo-100 border border-indigo-500/20'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex items-center gap-2 h-8">
                            <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-900 shrink-0">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isDM ? "Ask the Oracle..." : "Consult the Oracle..."}
                        disabled={isLoading}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg pl-4 pr-12 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-500 px-1">
                    <Info className="w-3 h-3" />
                    <span>{enableRAG ? "RAG Active: Using campaign context" : "Standard Mode: General knowledge only"}</span>
                </div>
            </div>
        </div>
    );
};
