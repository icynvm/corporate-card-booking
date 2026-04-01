import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

/**
 * Modernized Information Card for data sections using shadcn/ui.
 */
export const InfoCard: React.FC<InfoCardProps> = ({ 
  title, 
  children, 
  icon, 
  className = "", 
  headerClassName = "" 
}) => (
  <Card glass className={cn("overflow-hidden border-none shadow-md", className)}>
    <CardHeader className={cn("bg-gray-50/50 py-3 px-6 border-b border-gray-100 flex-row items-center gap-3 space-y-0", headerClassName)}>
      {icon && <span className="text-brand-600 shrink-0">{icon}</span>}
      <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      {children}
    </CardContent>
  </Card>
);

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  horizontal?: boolean;
}

/**
 * Standardized Label-Value pair for displaying record details.
 */
export const DetailItem: React.FC<DetailItemProps> = ({ 
  label, 
  value, 
  className = "", 
  horizontal = true 
}) => {
  if (horizontal) {
    return (
      <div className={cn("flex flex-wrap justify-between items-baseline gap-2 py-2 border-b border-gray-50 last:border-0", className)}>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{label}</span>
        <span className="text-xs font-bold text-gray-900 break-all text-right">
          {value || "N/A"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 block">
        {label}
      </span>
      <div className="text-sm font-bold text-gray-900 leading-snug">
        {value || "N/A"}
      </div>
    </div>
  );
};

/**
 * A grid wrapper for detail items to ensure consistent spacing.
 */
export const DetailGrid: React.FC<{ children: React.ReactNode; cols?: number, className?: string }> = ({ 
  children, 
  cols = 2,
  className = ""
}) => {
  const gridCols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
  };

  return <div className={cn("grid gap-8", gridCols[cols] || gridCols[2], className)}>{children}</div>;
};
