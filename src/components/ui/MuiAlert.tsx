import React, { useEffect } from "react";

export type AlertSeverity = "success" | "error" | "info" | "warning";

interface MuiAlertProps {
    severity?: AlertSeverity;
    children: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

const icons = {
    success: (
        <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
            <path d="M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2, 4.31L15.77,2.74C14.61,2.26 13.34,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0, 0 22,12M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z"></path>
        </svg>
    ),
    error: (
        <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
            <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path>
        </svg>
    ),
    info: (
        <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
            <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20, 7.59 20, 12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"></path>
        </svg>
    ),
    warning: (
        <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
            <path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"></path>
        </svg>
    ),
};

const styles = {
    success: "bg-[#edf7ed] text-[#1e4620]",
    error: "bg-[#fdeded] text-[#5f2120]",
    warning: "bg-[#fff4e5] text-[#663c00]",
    info: "bg-[#e5f6fd] text-[#014361]",
};

const iconStyles = {
    success: "text-[#4caf50]",
    error: "text-[#ef5350]",
    warning: "text-[#ff9800]",
    info: "text-[#03a9f4]",
};

export function MuiAlert({ severity = "info", children, onClose, className = "" }: MuiAlertProps) {
    return (
        <div
            className={`flex px-4 py-[14px] rounded-[4px] font-sans text-[14px] leading-[20px] shadow-sm tracking-[0.01071em] items-start gap-3 ${styles[severity]} ${className}`}
            role="alert"
        >
            <div className={`flex-[0_0_auto] flex opacity-90 ${iconStyles[severity]}`}>
                {icons[severity]}
            </div>
            <div className="flex-1 min-w-0 pr-1 py-[1px]">
                {children}
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-[0_0_auto] flex p-[2px] -mr-1 -mt-1 rounded-full hover:bg-black/5 transition-colors opacity-70 hover:opacity-100"
                    aria-label="Close"
                >
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                    </svg>
                </button>
            )}
        </div>
    );
}

export function ToastContainer({ 
    toasts, 
    removeToast 
}: { 
    toasts: { id: string; message: string; severity: AlertSeverity }[], 
    removeToast: (id: string) => void 
}) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 min-w-[320px] max-w-[400px]">
            {toasts.map((toast) => (
                <div key={toast.id} className="animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <MuiAlert severity={toast.severity} onClose={() => removeToast(toast.id)}>
                        {toast.message}
                    </MuiAlert>
                </div>
            ))}
        </div>
    );
}
