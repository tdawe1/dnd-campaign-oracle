import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ScrollText, MapPin, BookOpen, Sword, Gem, Calendar, ExternalLink, Share2 } from 'lucide-react'
import Markdown from 'react-markdown'

interface Session {
    id: string;
    sessionNumber?: number;
    title: string;
    date: string;
    location?: string;
    tldr?: string;
    journalEntry?: string;
    transcript?: string;
    combat: { name: string; result: string }[];
    loot: { name: string; effect: string }[];
}

interface ChronicleData {
    campaign: {
        id: string;
        title: string;
        description?: string;
    };
    sessions: Session[];
}

export const Route = createFileRoute('/chronicle/$campaignId')({
    component: ChroniclePage,
})

function ChroniclePage() {
    const { campaignId } = Route.useParams()
    const [data, setData] = useState<ChronicleData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedSession, setExpandedSession] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchChronicle = async () => {
            try {
                const res = await fetch(`/api/chronicle/${campaignId}`)
                if (!res.ok) throw new Error('Failed to load chronicle')
                const json = await res.json()
                setData(json)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchChronicle()
    }, [campaignId])

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-neutral-400 animate-pulse">Loading chronicle...</div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-red-400">{error || 'Chronicle not found'}</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{data.campaign.title}</h1>
                        {data.campaign.description && (
                            <p className="text-sm text-neutral-400 mt-1">{data.campaign.description}</p>
                        )}
                    </div>
                    <button
                        onClick={handleShare}
                        className="px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Share2 className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Share'}
                    </button>
                </div>
            </header>

            {/* Sessions */}
            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
                    <ScrollText className="w-4 h-4" />
                    <span>{data.sessions.length} sessions recorded</span>
                </div>

                {data.sessions.map((session) => (
                    <article
                        key={session.id}
                        className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden"
                    >
                        {/* Session Header */}
                        <div className="p-6 border-b border-neutral-800">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{session.title}</h2>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {session.date}
                                        </span>
                                        {session.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {session.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {session.combat.length > 0 && (
                                        <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-xs rounded flex items-center gap-1">
                                            <Sword className="w-3 h-3" />
                                            {session.combat.length}
                                        </span>
                                    )}
                                    {session.loot.length > 0 && (
                                        <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded flex items-center gap-1">
                                            <Gem className="w-3 h-3" />
                                            {session.loot.length}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* TLDR */}
                            {session.tldr && (
                                <p className="text-sm text-amber-200/80 bg-amber-950/20 px-4 py-3 rounded-lg border border-amber-500/20 italic">
                                    {session.tldr}
                                </p>
                            )}
                        </div>

                        {/* Journal Entry */}
                        {session.journalEntry && (
                            <div className="p-6 border-b border-neutral-800">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    Chronicle
                                </h3>
                                <p className="text-neutral-300 leading-relaxed font-serif italic">
                                    "{session.journalEntry}"
                                </p>
                            </div>
                        )}

                        {/* Transcript (only for latest session) */}
                        {session.transcript && (
                            <div className="p-6">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ScrollText className="w-4 h-4" />
                                    Full Transcript
                                </h3>
                                <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800 max-h-[500px] overflow-y-auto">
                                    <pre className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed font-sans">
                                        {session.transcript}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </article>
                ))}
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-800 py-8 text-center text-sm text-neutral-500">
                <p>Campaign Oracle • Public Chronicle</p>
            </footer>
        </div>
    )
}
