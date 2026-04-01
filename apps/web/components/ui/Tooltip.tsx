import React from 'react';

export const Tooltip = ({ text, children }: { text: string, children?: React.ReactNode }) => (
    <div className="group relative">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-neutral-800 text-white text-xs rounded border border-neutral-700 whitespace-nowrap z-50">
            {text}
        </div>
    </div>
);
