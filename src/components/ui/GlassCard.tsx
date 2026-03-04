import React from "react";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export function GlassCard({ children, className = "", hover = false }: GlassCardProps) {
    return (
        <div className={`${hover ? "glass-card-hover" : "glass-card"} p-6 ${className}`}>
            {children}
        </div>
    );
}
