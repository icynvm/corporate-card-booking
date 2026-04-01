import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <Card glass className="overflow-hidden border-none shadow-md group hover:shadow-xl transition-all duration-500">
            <CardContent className="p-6 relative">
                {/* Background decorative element */}
                <div className={cn(
                    "absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700",
                    gradient
                )} />

                <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                            </h3>
                        </div>
                        
                        {subtitle && (
                            <p className="text-[11px] font-bold text-muted-foreground/60 leading-tight">
                                {subtitle}
                            </p>
                        )}

                        {trend && (
                            <div className={cn(
                                "flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full w-fit text-[10px] font-black border uppercase tracking-tighter",
                                trend.positive 
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                                    : 'text-red-700 bg-red-50 border-red-100'
                            )}>
                                {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {trend.value}
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500 shrink-0",
                        gradient
                    )}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
