import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, Zap, CheckCircle, Shield } from 'lucide-react';

// Define types locally
type UserSystemRole = 'guest' | 'player' | 'dm' | 'admin';

interface ExtendedUser {
    id: string;
    role?: string;
    oracleTokensUsed?: number;
    oracleTokensResetAt?: Date | string;
}

const ROLE_INFO: Record<UserSystemRole, { label: string; tokens: number; reqLimit: number; oracleLimit: number; searchLimit: number; color: string; bg: string; border: string }> = {
    guest: { 
        label: 'Guest', 
        tokens: 1000, 
        reqLimit: 5, 
        oracleLimit: 2,
        searchLimit: 5,
        color: 'text-gray-400', 
        bg: 'bg-gray-500/10', 
        border: 'border-gray-500/20' 
    },
    player: { 
        label: 'Player', 
        tokens: 100000, 
        reqLimit: 60, 
        oracleLimit: 20,
        searchLimit: 40,
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20' 
    },
    dm: { 
        label: 'Dungeon Master', 
        tokens: 200000, 
        reqLimit: 200, 
        oracleLimit: 60,
        searchLimit: 100,
        color: 'text-purple-400', 
        bg: 'bg-purple-500/10', 
        border: 'border-purple-500/20' 
    },
    admin: { 
        label: 'Admin', 
        tokens: -1, 
        reqLimit: 1000, 
        oracleLimit: 200,
        searchLimit: 500,
        color: 'text-red-400', 
        bg: 'bg-red-500/10', 
        border: 'border-red-500/20' 
    },
};

export const UsageView: React.FC = () => {
    const { user, isDemo } = useAuth();
    const extendedUser = user as unknown as ExtendedUser;
    
    // In demo mode, treat as guest for display
    const rawRole = isDemo ? 'guest' : ((extendedUser?.role as UserSystemRole) || 'guest'); 
    // Validate role against known keys, default to guest
    const roleKey: UserSystemRole = ROLE_INFO[rawRole] ? rawRole : 'guest';
    const roleInfo = ROLE_INFO[roleKey];
    
    // Tokens
    const tokensUsed = isDemo ? 1250 : (extendedUser?.oracleTokensUsed || 0);
    const boxLimit = roleInfo.tokens === -1 ? 'Unlimited' : roleInfo.tokens.toLocaleString();
    const percentUsed = roleInfo.tokens === -1 ? 0 : Math.min(100, (tokensUsed / roleInfo.tokens) * 100);
    
    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto w-full max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-light tracking-tight text-neutral-100 mb-2">
                    Usage & Role
                </h1>
                <p className="text-neutral-400">
                    Your access level determines your rate limits and token quota.
                </p>
            </header>

            {/* Current Role Card */}
            <div className={`rounded-xl border ${roleInfo.border} ${roleInfo.bg} p-6 relative overflow-hidden`}>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="text-sm font-medium text-neutral-400 mb-1">ACCESS LEVEL</div>
                        <div className={`text-4xl font-semibold ${roleInfo.color} mb-2`}>{roleInfo.label}</div>
                        <div className="text-neutral-300">
                            {roleInfo.tokens === -1 
                                ? 'Unlimited Oracle tokens per month' 
                                : `${roleInfo.tokens.toLocaleString()} Oracle tokens per month`
                            }
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/50 border border-neutral-700">
                        <Shield className={`w-4 h-4 ${roleInfo.color}`} />
                        <span className="text-sm text-neutral-300 capitalize">{roleKey}</span>
                    </div>
                </div>
            </div>

            {/* Usage Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Token Usage */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-200">Token Usage</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-3xl font-semibold text-neutral-100">
                                    {tokensUsed.toLocaleString()}
                                </div>
                                <div className="text-sm text-neutral-500 mt-1">
                                    tokens used this month
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-neutral-400">Limit</div>
                                <div className="text-lg text-neutral-200">{boxLimit}</div>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    percentUsed > 90 ? 'bg-red-500' :
                                    percentUsed > 75 ? 'bg-yellow-500' : 
                                    'bg-green-500'
                                }`}
                                style={{ width: `${roleInfo.tokens === -1 ? 5 : percentUsed}%` }}
                            />
                        </div>
                        
                        <div className="text-xs text-neutral-500 text-center pt-2">
                            Resets on {extendedUser?.oracleTokensResetAt ? new Date(extendedUser.oracleTokensResetAt).toLocaleDateString() : 'next month'}
                        </div>
                    </div>
                </div>

                {/* API Limits */}
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-200">Rate Limits</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                            <span className="text-neutral-400">General API</span>
                            <span className="font-mono text-neutral-200">{roleInfo.reqLimit} req/min</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                            <span className="text-neutral-400">Oracle Chat</span>
                            <span className="font-mono text-neutral-200">
                                {roleInfo.oracleLimit} req/min
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                            <span className="text-neutral-400">Search</span>
                            <span className="font-mono text-neutral-200">
                                {roleInfo.searchLimit} req/min
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features List */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-medium text-neutral-200">Role Capabilities</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className={`flex items-center gap-3 text-sm ${roleKey === 'guest' ? 'text-neutral-500' : 'text-neutral-300'}`}>
                        <CheckCircle className={`w-4 h-4 ${roleKey === 'guest' ? 'text-neutral-700' : 'text-green-500'}`} />
                        <span>High-Speed API Access</span>
                     </div>
                     <div className={`flex items-center gap-3 text-sm ${roleKey !== 'guest' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        <CheckCircle className={`w-4 h-4 ${roleKey !== 'guest' ? 'text-green-500' : 'text-neutral-700'}`} />
                        <span>RAG Context (Vertex AI)</span>
                     </div>
                     <div className={`flex items-center gap-3 text-sm ${(roleKey === 'dm' || roleKey === 'admin') ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        <CheckCircle className={`w-4 h-4 ${(roleKey === 'dm' || roleKey === 'admin') ? 'text-green-500' : 'text-neutral-700'}`} />
                        <span>Campaign Management</span>
                     </div>
                     <div className={`flex items-center gap-3 text-sm ${roleKey === 'admin' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        <CheckCircle className={`w-4 h-4 ${roleKey === 'admin' ? 'text-green-500' : 'text-neutral-700'}`} />
                        <span>System Administration</span>
                     </div>
                </div>
            </div>
        </div>
    );
};
