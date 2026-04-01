import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { User as UserIcon, Settings, Moon, Sun, Monitor, BellRing, CreditCard, LogOut, Sparkles, Upload, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import { User } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface SettingsViewProps {
    user: User | null;
    isDM: boolean;
    handleLogout: () => void;
    campaignId: string | null;
}

type Theme = 'dark' | 'light' | 'system';

export const SettingsView: React.FC<SettingsViewProps> = ({ user, isDM, handleLogout, campaignId }) => {
    const { theme, setTheme } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [oracleModel, setOracleModel] = useState('gemini-flash');
    const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');
    const [importPreview, setImportPreview] = useState<{ characters: number; sessions: number; players: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load preferences from localStorage
    useEffect(() => {
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
        
        const savedModel = localStorage.getItem('oracle-model');
        if (savedModel) setOracleModel(savedModel);
    }, []);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const handleNotificationsToggle = () => {
        const newValue = !notifications;
        setNotifications(newValue);
        localStorage.setItem('notifications', String(newValue));
    };

    const handleRoll20Import = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!campaignId) {
            setImportStatus('error');
            setImportMessage('No campaign selected. Please select a campaign first.');
            return;
        }

        setImportStatus('parsing');
        setImportMessage('Reading Roll20 export file...');
        setImportPreview(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Count entities in the Roll20 export for preview
            const characterCount = data.characters?.length || 0;
            const handoutCount = data.handouts?.length || 0;
            const playerCount = data.players?.length || 0;

            setImportPreview({ characters: characterCount, sessions: handoutCount, players: playerCount });
            setImportMessage(`Found ${characterCount} characters, ${handoutCount} handouts. Importing...`);

            // Call the import API
            const response = await fetch('/api/import/roll20', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ campaignId, data }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            setImportStatus('success');
            setImportMessage(result.message || `Imported ${result.imported?.characters || 0} characters, ${result.imported?.npcs || 0} NPCs, ${result.imported?.sessions || 0} sessions`);
            
            if (result.imported?.errors?.length > 0) {
                console.warn('Import warnings:', result.imported.errors);
            }
        } catch (error) {
            setImportStatus('error');
            setImportMessage(error instanceof Error ? error.message : 'Failed to parse JSON file. Ensure this is a valid Roll20 export.');
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getThemeIcon = () => {
        switch (theme) {
            case 'dark': return Moon;
            case 'light': return Sun;
            case 'system': return Monitor;
        }
    };

    const ThemeIcon = getThemeIcon();

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-sm text-neutral-400 mt-1">Manage your preferences and campaign configuration.</p>
            </div>

            <div className="grid gap-8">
                {/* Account Settings */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> Account
                    </h3>
                    <Card className="divide-y divide-neutral-800" noPadding>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {user?.image ? (
                                    <img src={user.image} alt="" className="w-10 h-10 rounded-full bg-neutral-800" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-white">{user?.name || 'Demo User'}</p>
                                    <p className="text-xs text-neutral-500">{user?.email || 'demo@example.com'}</p>
                                </div>
                            </div>
                            <Badge type={isDM ? 'main' : 'neutral'}>{isDM ? 'Dungeon Master' : 'Player'}</Badge>
                        </div>
                        {user?.createdAt && (
                            <div className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">Member Since</p>
                                    <p className="text-xs text-neutral-500">Account creation date</p>
                                </div>
                                <span className="text-sm text-neutral-400">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </Card>
                </section>

                {/* General Settings */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                        <Settings className="w-4 h-4" /> General
                    </h3>
                    <Card className="divide-y divide-neutral-800" noPadding>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ThemeIcon className="w-4 h-4 text-neutral-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">Appearance</p>
                                    <p className="text-xs text-neutral-500">Customize the interface theme.</p>
                                </div>
                            </div>
                            <div className="flex gap-1 bg-neutral-800/50 p-1 rounded-lg">
                                {([
                                    { value: 'dark', icon: Moon, label: 'Dark' },
                                    { value: 'light', icon: Sun, label: 'Light' },
                                    { value: 'system', icon: Monitor, label: 'System' },
                                ] as const).map(({ value, icon: Icon, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => handleThemeChange(value)}
                                        className={`p-1.5 rounded transition-colors ${
                                            theme === value 
                                                ? 'bg-neutral-700 text-white' 
                                                : 'text-neutral-500 hover:text-neutral-300'
                                        }`}
                                        title={label}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BellRing className="w-4 h-4 text-neutral-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">Notifications</p>
                                    <p className="text-xs text-neutral-500">Session reminders and updates.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleNotificationsToggle}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                    notifications ? 'bg-indigo-500' : 'bg-neutral-700'
                                }`}
                            >
                                <span 
                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                        notifications ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </Card>
                </section>

                {/* Oracle Settings (DM Only) */}
                {isDM && (
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Oracle Settings
                        </h3>
                        <Card className="divide-y divide-neutral-800" noPadding>
                            <div className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">Default Model</p>
                                    <p className="text-xs text-neutral-500">Model used for Oracle chat.</p>
                                </div>
                                <select
                                    value={oracleModel}
                                    onChange={(e) => {
                                        setOracleModel(e.target.value);
                                        localStorage.setItem('oracle-model', e.target.value);
                                    }}
                                    className="bg-neutral-800 text-xs text-white border border-neutral-700 rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="local/llama3.2">Local (Ollama)</option>
                                    <option value="gemini/gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    <option value="gemini/gemini-3.0-pro">Gemini 3.0 Pro</option>
                                    <option value="openai/gpt-5.1">GPT-5.1 (BYOK)</option>
                                    <option value="anthropic/claude-4.5-sonnet">Claude 4.5 Sonnet (BYOK)</option>
                                </select>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-neutral-400">Vertex AI Status</span>
                                    <Badge type="success">Connected</Badge>
                                </div>
                                <p className="text-xs text-neutral-500">
                                    Using Google Cloud project for Gemini models. Local models use Ollama.
                                </p>
                            </div>
                    </Card>
                    </section>
                )}

                {/* Data Import (DM Only) */}
                {isDM && (
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                            <FileJson className="w-4 h-4" /> Data Import
                        </h3>
                        <Card className="divide-y divide-neutral-800" noPadding>
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-medium text-white">Roll20 JSON Import</p>
                                        <p className="text-xs text-neutral-500">Upload your Roll20 campaign export file.</p>
                                    </div>
                                    <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors">
                                        <Upload className="w-4 h-4" />
                                        Select File
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={handleRoll20Import}
                                        />
                                    </label>
                                </div>
                                {importStatus !== 'idle' && (
                                    <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                                        importStatus === 'parsing' ? 'bg-blue-500/10 border border-blue-500/20' :
                                        importStatus === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                                        'bg-red-500/10 border border-red-500/20'
                                    }`}>
                                        {importStatus === 'parsing' && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />}
                                        {importStatus === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                                        {importStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                                        <div className="flex-1">
                                            <p className={`text-xs ${
                                                importStatus === 'success' ? 'text-emerald-300' :
                                                importStatus === 'error' ? 'text-red-300' :
                                                'text-blue-300'
                                            }`}>{importMessage}</p>
                                            {importPreview && (
                                                <div className="flex gap-4 mt-2 text-xs text-neutral-400">
                                                    <span>{importPreview.characters} characters</span>
                                                    <span>{importPreview.sessions} sessions</span>
                                                    <span>{importPreview.players} players</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-neutral-500">
                                    <strong>How to export from Roll20:</strong> In your campaign, go to Settings → Game Settings → Export Data. Download the JSON file and upload it here.
                                </p>
                            </div>
                        </Card>
                    </section>
                )}

                {/* Danger Zone */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Session
                    </h3>
                    <Card className="border-red-900/30" noPadding>
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-white">Sign Out</p>
                                <p className="text-xs text-neutral-500">End your current session.</p>
                            </div>
                            <Button variant="danger" icon={LogOut} onClick={handleLogout}>Sign Out</Button>
                        </div>
                    </Card>
                </section>
            </div>
        </div>
    );
};

