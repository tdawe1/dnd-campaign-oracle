import React from 'react';

export const Badge = ({ children, type = "neutral" }: { children?: React.ReactNode; type?: "neutral" | "success" | "danger" | "warning" | "main" }) => {
    const styles = {
        neutral: "bg-neutral-800 text-neutral-400 border-neutral-700",
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-900/50",
        danger: "bg-rose-500/10 text-rose-400 border-rose-900/50",
        warning: "bg-amber-500/10 text-amber-400 border-amber-900/50",
        main: "bg-indigo-500/10 text-indigo-400 border-indigo-900/50",
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${styles[type]} uppercase tracking-wide`}>
            {children}
        </span>
    );
};
