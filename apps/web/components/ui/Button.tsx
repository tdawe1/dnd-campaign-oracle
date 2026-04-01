import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    icon?: any;
    isLoading?: boolean;
}

export const Button = ({
    children, variant = 'primary', className = '', icon: Icon, isLoading = false, ...props
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/50",
        secondary: "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600",
        ghost: "text-neutral-400 hover:text-white hover:bg-neutral-800/50",
        danger: "bg-rose-950/30 text-rose-400 border border-rose-900/50 hover:bg-rose-900/50 hover:border-rose-800"
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
                Icon && <Icon className="w-4 h-4" />
            )}
            {children}
        </button>
    );
};
