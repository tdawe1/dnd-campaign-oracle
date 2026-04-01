import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, PlayCircle, Mail, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { login, loginWithEmail, signupWithEmail, enableDemoMode, isInitialized } = useAuth();
    const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
    const [isSignUp, setIsSignUp] = useState(false);

    // Email state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isSignUp) {
                await signupWithEmail(email, password, name, inviteCode);
            } else {
                await loginWithEmail(email, password);
            }
        } catch (error) {
            console.error(error);
            alert("Authentication failed. Check console.");
        }
    };

    return (
        <div className="min-h-screen bg-dot-grid flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-neutral-900 rounded-xl border border-neutral-800 p-8 shadow-2xl relative">
                <div className="text-center mb-8">
                    <img
                        src="/logo_transparent.png"
                        alt="Campaign Oracle"
                        className="w-48 h-auto mx-auto mb-4 drop-shadow-2xl mix-blend-lighten"
                    />
                    <h1 className="text-3xl font-bold text-white tracking-tight">Campaign Oracle Testing v0.0.2</h1>
                </div>

                {!isInitialized && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-200">
                            <p className="font-semibold mb-1">Authentication Unavailable</p>
                            <p className="opacity-80">Firebase configuration is missing or invalid. You can still use Demo Mode.</p>
                        </div>
                    </div>
                )}

                {/* Auth Method Tabs */}
                <div className="flex justify-center mb-6 space-x-4 border-b border-neutral-700 pb-2">
                    <button
                        onClick={() => setAuthMethod('google')}
                        className={`pb-2 ${authMethod === 'google' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Google
                    </button>
                    <button
                        onClick={() => setAuthMethod('email')}
                        className={`pb-2 ${authMethod === 'email' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Email
                    </button>
                </div>

                <div className="space-y-4">
                    {authMethod === 'google' && (
                        <>
                            <div>
                                <label className="block text-neutral-400 mb-1 text-sm">Invite Code <span className="text-neutral-600">(Optional)</span></label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                                    <input
                                        type="text"
                                        id="googleInviteCode"
                                        name="googleInviteCode"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        className="w-full bg-neutral-800 text-white pl-10 p-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
                                        placeholder="Code to join campaign"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    // Store invite code in localStorage before OAuth redirect
                                    if (inviteCode) {
                                        localStorage.setItem('pendingInviteCode', inviteCode);
                                    }
                                    login();
                                }}
                                disabled={!isInitialized}
                                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-white p-4 rounded-lg font-medium transition-colors"
                            >
                                <Shield className="w-5 h-5" />
                                Sign in with Google
                            </button>
                        </>
                    )}

                    {authMethod === 'email' && (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            <div>
                                <label className="block text-neutral-400 mb-1 text-sm">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-neutral-800 text-white pl-10 p-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-neutral-400 mb-1 text-sm">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-neutral-800 text-white pl-10 p-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            {isSignUp && (
                                <>
                                    <div>
                                        <label className="block text-neutral-400 mb-1 text-sm">Name</label>
                                        <div className="relative">
                                            <Shield className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-neutral-800 text-white pl-10 p-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
                                                placeholder="Your Name"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-neutral-400 mb-1 text-sm">Invite Code <span className="text-neutral-600">(Optional)</span></label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                                            <input
                                                type="text"
                                                id="inviteCode"
                                                name="inviteCode"
                                                value={inviteCode}
                                                onChange={(e) => setInviteCode(e.target.value)}
                                                className="w-full bg-neutral-800 text-white pl-10 p-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500"
                                                placeholder="Code to join campaign"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg font-medium transition-colors">
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </button>
                            <p className="text-center text-xs text-neutral-400 cursor-pointer hover:text-white" onClick={() => setIsSignUp(!isSignUp)}>
                                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                            </p>
                        </form>
                    )}

                    <div className="relative mt-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-neutral-900 text-neutral-500">Or</span>
                        </div>
                    </div>

                    <button
                        onClick={enableDemoMode}
                        className="w-full flex items-center justify-center gap-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-4 rounded-lg font-medium transition-colors border border-neutral-700"
                    >
                        <PlayCircle className="w-5 h-5" />
                        Try Demo Mode
                    </button>
                </div>

                <p className="mt-6 text-center text-xs text-neutral-500">
                    Demo mode has AI features disabled. Sign in for full access.
                </p>
            </div>
        </div>
    );
};
