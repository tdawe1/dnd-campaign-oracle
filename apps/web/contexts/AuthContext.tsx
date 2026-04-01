import React, { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../app/lib/auth-client';

type User = typeof authClient.$Infer.Session.user;

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isDemo: boolean;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    signupWithEmail: (email: string, pass: string, name: string, inviteCode?: string) => Promise<void>;
    logout: () => Promise<void>;
    enableDemoMode: () => void;
    isInitialized: boolean;
    // Legacy placeholders
    setupRecaptcha: (elementId: string) => void;
    loginWithPhone: (phoneNumber: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session, isPending } = authClient.useSession();
    const user = session?.user || null;
    const [isDemo, setIsDemo] = useState(false);

    // Check for pending invite code after OAuth login
    useEffect(() => {
        const applyPendingInviteCode = async () => {
            if (!user || isPending) return;

            const pendingCode = localStorage.getItem('pendingInviteCode');
            if (!pendingCode) return;

            // Clear immediately to prevent duplicate attempts
            localStorage.removeItem('pendingInviteCode');

            try {
                const res = await fetch('/api/users/apply-invite-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ inviteCode: pendingCode })
                });

                const data = await res.json();
                if (res.ok) {
                    console.log('[Auth] Invite code applied:', data.message);
                    // Force session refresh to get updated role
                    window.location.reload();
                } else {
                    console.warn('[Auth] Invite code failed:', data.error);
                }
            } catch (error) {
                console.error('[Auth] Failed to apply invite code:', error);
            }
        };

        applyPendingInviteCode();
    }, [user, isPending]);

    const login = async () => {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: import.meta.env.VITE_FRONTEND_URL || window.location.origin
        });
    };

    const loginWithEmail = async (email: string, pass: string) => {
        const res = await authClient.signIn.email({
            email,
            password: pass,
        });
        if (res.error) throw res.error;
    };

    const signupWithEmail = async (email: string, pass: string, name: string, inviteCode?: string) => {
        const res = await authClient.signUp.email({
            email,
            password: pass,
            name,
            inviteCode, // Pass invite code to backend
        } as any);
        if (res.error) throw res.error;
    };

    const logout = async () => {
        await authClient.signOut();
        setIsDemo(false);
    };

    const enableDemoMode = () => {
        setIsDemo(true);
    };

    const setupRecaptcha = () => console.warn("Recaptcha not implemented in Better Auth migration");
    const loginWithPhone = async () => { throw new Error("Phone auth not implemented"); };

    return (
        <AuthContext.Provider value={{
            user,
            loading: isPending,
            isDemo,
            login,
            loginWithEmail,
            signupWithEmail,
            logout,
            enableDemoMode,
            isInitialized: true,
            setupRecaptcha,
            loginWithPhone
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
