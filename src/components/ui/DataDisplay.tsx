import React from "react";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

/**
 * Standardized Information Card for data sections.
 */
export const InfoCard: React.FC<InfoCardProps> = ({ 
  title, 
  children, 
  icon, 
  className = "", 
  headerClassName = "" 
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>
    <div className={`px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 ${headerClassName}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </h4>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
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
      <div className={`flex flex-wrap justify-between items-baseline gap-2 py-1 ${className}`}>
        <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">{label}</span>
        <span className="text-gray-700 dark:text-gray-200 text-sm font-semibold break-all text-right">
          {value || "N/A"}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-gray-400 dark:text-gray-500 text-xs font-medium block uppercase tracking-tight">
        {label}
      </span>
      <div className="text-gray-700 dark:text-gray-200 text-sm font-semibold">
        {value || "N/A"}
      </div>
    </div>
  );
};

/**
 * A grid wrapper for detail items to ensure consistent spacing.
 */
export const DetailGrid: React.FC<{ children: React.ReactNode; cols?: number }> = ({ 
  children, 
  cols = 2 
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
  }[cols] || "grid-cols-1 md:grid-cols-2";

  return <div className={`grid ${gridCols} gap-4`}>{children}</div>;
};
