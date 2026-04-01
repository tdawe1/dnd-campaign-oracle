import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BookOpen, Wand2, ChevronRight, ExternalLink, FileText } from 'lucide-react'

export const Route = createFileRoute('/docs')({
    component: DocsPage,
})

interface DocItem {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    content: React.ReactNode
}

const TRANSCRIPT_REFINE_CONTENT = () => (
    <div className="prose prose-invert prose-sm max-w-none">
        <h2 className="text-xl font-bold text-white mb-4">Transcript Refine - Quick Start</h2>

        <p className="text-neutral-300">
            The <strong>Transcript Refine</strong> feature uses Gemini AI to clean up and enhance your D&D session transcripts while preserving important game details.
        </p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Use</h3>

        <div className="space-y-4">
            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">1. Open the Transcript Editor</h4>
                <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
                    <li>Go to <strong>Sessions</strong> view</li>
                    <li>Click on a session card to expand it</li>
                    <li>Click the <strong>✏️ Edit Transcript</strong> button</li>
                </ul>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">2. Write AI Instructions</h4>
                <p className="text-sm text-neutral-400 mb-2">In the AI Instructions box, describe what you want:</p>
                <ul className="text-sm text-neutral-500 space-y-1 list-disc list-inside">
                    <li>"Clean up speaker attribution and fix names"</li>
                    <li>"Focus on combat details and damage numbers"</li>
                    <li>"Highlight NPC dialogue and important plot points"</li>
                    <li>"Remove table chatter and off-topic discussions"</li>
                </ul>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">3. Click "Refine with AI"</h4>
                <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
                    <li>AI processes your transcript (may take a while for long transcripts)</li>
                    <li>A new version is automatically saved</li>
                    <li>Original transcript is preserved in version history</li>
                </ul>
            </div>
        </div>

        <h3 className="text-lg font-semibold text-white mt-6 mb-3">Features</h3>
        <div className="grid grid-cols-2 gap-3">
            {[
                { title: 'AI Refinement', desc: 'Gemini 2.5 Flash cleans and enhances transcripts' },
                { title: 'Version History', desc: 'Click 🕐 to view/restore previous versions' },
                { title: 'Usage Limits', desc: '3 AI refinements per session (DMs get unlimited)' },
                { title: 'Manual Edits', desc: "Edit directly in the text area anytime" },
            ].map(f => (
                <div key={f.title} className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                    <p className="text-sm font-medium text-white">{f.title}</p>
                    <p className="text-xs text-neutral-500 mt-1">{f.desc}</p>
                </div>
            ))}
        </div>

        <div className="mt-6 p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-lg">
            <p className="text-sm text-indigo-300">
                <strong>💡 Tip:</strong> Be specific with instructions. "Fix combat damage numbers" works better than "make it better".
            </p>
        </div>
    </div>
)

const TRANSCRIPT_UPLOAD_CONTENT = () => (
    <div className="prose prose-invert prose-sm max-w-none">
        <h2 className="text-xl font-bold text-white mb-4">Adding & Transforming Transcripts</h2>

        <p className="text-neutral-300">
            Upload session transcripts and use AI-powered transformations to clean them up automatically.
        </p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-3">Uploading a Transcript</h3>
        <div className="space-y-4">
            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">1. Add New Session</h4>
                <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
                    <li>Go to <strong>Sessions</strong> view</li>
                    <li>Click <strong>"Add Transcript"</strong> button</li>
                    <li>Paste your transcript or click <strong>📁 Upload</strong> for .txt/.md files</li>
                </ul>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">2. Configure Analysis</h4>
                <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
                    <li>Toggle what to extract: Combat, Loot, NPCs, Key Moments</li>
                    <li>Choose summary length: Brief, Standard, or Detailed</li>
                    <li>Add focus areas like "party roster: Erato, Arfine, Shava, Vorth"</li>
                </ul>
            </div>
        </div>

        <h3 className="text-lg font-semibold text-white mt-6 mb-3">Quick Transforms</h3>
        <p className="text-sm text-neutral-400 mb-3">In the Transcript Editor, use the Quick Transforms toolbar:</p>
        <div className="grid grid-cols-2 gap-2">
            {[
                { label: 'Names', desc: 'Player names → Character names (T→Erato)' },
                { label: 'Times', desc: 'Remove [00:15:32] timestamps' },
                { label: 'Format', desc: 'Break into readable paragraphs' },
                { label: 'Clean', desc: 'Remove "um", "uh", off-topic chat' },
                { label: 'Tags', desc: 'Add [COMBAT], [ROLL], [RP] markers' },
                { label: 'Dialog', desc: 'Format NPC speech with quotes' },
            ].map(t => (
                <div key={t.label} className="bg-neutral-900/50 p-2 rounded-lg border border-neutral-800">
                    <p className="text-xs font-medium text-white">{t.label}</p>
                    <p className="text-xs text-neutral-500">{t.desc}</p>
                </div>
            ))}
        </div>

        <div className="mt-4 p-4 bg-amber-950/30 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-300">
                <strong>💡 Tip:</strong> For long transcripts (&gt;50k chars), run individual transforms instead of "Full" - they're faster and more reliable.
            </p>
        </div>
    </div>
)

const CHRONICLE_CONTENT = () => (
    <div className="prose prose-invert prose-sm max-w-none">
        <h2 className="text-xl font-bold text-white mb-4">Public Chronicle</h2>

        <p className="text-neutral-300">
            Share your campaign story with a beautiful, read-only public page that players can bookmark.
        </p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-3">Accessing the Chronicle</h3>
        <div className="space-y-4">
            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">Chronicle URL</h4>
                <p className="text-sm text-neutral-400 mb-2">Each campaign has a public chronicle at:</p>
                <code className="block bg-neutral-900 px-3 py-2 rounded text-sm text-indigo-300 font-mono">
                    /chronicle/your-campaign-id
                </code>
                <p className="text-xs text-neutral-500 mt-2">Find your campaign ID in the URL when viewing your campaign.</p>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                <h4 className="font-medium text-indigo-400 mb-2">What's Included</h4>
                <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
                    <li>Campaign title and description</li>
                    <li>All session entries with dates and locations</li>
                    <li>TL;DR summaries and journal entries</li>
                    <li>Expandable full transcripts</li>
                    <li>Share button to copy the URL</li>
                </ul>
            </div>
        </div>

        <div className="mt-6 p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-lg">
            <p className="text-sm text-indigo-300">
                <strong>🔒 Privacy:</strong> The Chronicle is read-only and shows only published session content. No login required for viewers.
            </p>
        </div>
    </div>
)

const DOCS: DocItem[] = [
    {
        id: 'transcript-refine',
        title: 'Transcript Refine',
        description: 'Use AI to clean up and enhance session transcripts',
        icon: Wand2,
        content: <TRANSCRIPT_REFINE_CONTENT />
    },
    {
        id: 'transcript-upload',
        title: 'Adding Transcripts',
        description: 'Upload and transform session transcripts',
        icon: FileText,
        content: <TRANSCRIPT_UPLOAD_CONTENT />
    },
    {
        id: 'chronicle',
        title: 'Public Chronicle',
        description: 'Share your campaign story with a public URL',
        icon: ExternalLink,
        content: <CHRONICLE_CONTENT />
    },
]

function DocsPage() {
    const [selectedDoc, setSelectedDoc] = useState<string>(DOCS[0].id)
    const currentDoc = DOCS.find(d => d.id === selectedDoc) || DOCS[0]

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Documentation</h1>
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-64 shrink-0">
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-2 space-y-1">
                        {DOCS.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${selectedDoc === doc.id
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                    }`}
                            >
                                <doc.icon className="w-4 h-4 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.title}</p>
                                </div>
                                <ChevronRight className={`w-4 h-4 ml-auto shrink-0 opacity-50 ${selectedDoc === doc.id ? 'opacity-100' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                        {currentDoc.content}
                    </div>
                </div>
            </div>
        </div>
    )
}
