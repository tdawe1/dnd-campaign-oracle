import React from 'react';
import { Card } from './Card';

export const StatCard = ({ label, value, icon: Icon, trend, trendDirection = 'up' }: { label: string, value: string | number, icon?: any, trend?: string, trendDirection?: 'up' | 'down' | 'neutral' }) => (
    <Card className="p-0">
        <div className="flex items-start justify-between p-5">
            <div>
                <p className="text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">{label}</p>
                <h4 className="text-2xl font-semibold text-white tracking-tight">{value}</h4>
                {trend && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendDirection === 'up' ? 'text-emerald-400' : trendDirection === 'down' ? 'text-rose-400' : 'text-neutral-400'
                        }`}>
                        {trend}
                    </div>
                )}
            </div>
            {Icon && (
                <div className="p-2.5 bg-neutral-800/50 rounded-lg border border-neutral-800 text-neutral-400">
                    <Icon className="w-4 h-4" />
                </div>
            )}
        </div>
    </Card>
);
