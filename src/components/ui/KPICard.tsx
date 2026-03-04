import React from "react";

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    trend?: { value: string; positive: boolean };
}

export function KPICard({ title, value, subtitle, icon, gradient, trend }: KPICardProps) {
    return (
        <div className="glass-card-hover p-6 relative overflow-hidden group">
            {/* Background gradient accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${gradient} opacity-20 blur-2xl -mr-8 -mt-8 group-hover:opacity-30 transition-opacity`} />

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-800 mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-400">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${!trend.positive && 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="18 15 12 9 6 15" />
                            </svg>
                            {trend.value}
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-2xl ${gradient} flex items-center justify-center text-white shadow-lg`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
