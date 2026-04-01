import React from 'react';

export const Card = ({ children, className = "", title, action, noPadding }: { children?: React.ReactNode; className?: string; title?: string; action?: React.ReactNode; noPadding?: boolean }) => (
    <div className={`bg-neutral-900/40 border border-neutral-800 rounded-lg overflow-hidden backdrop-blur-sm ${className}`}>
        {(title || action) && (
            <div className="px-5 py-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/20">
                {title && <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>}
                {action && <div>{action}</div>}
            </div>
        )}
        <div className={noPadding ? "" : "p-5"}>
            {children}
        </div>
    </div>
);
