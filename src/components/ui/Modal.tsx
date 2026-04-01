import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
    className?: string;
}

export function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    maxWidth = "max-w-lg",
    className
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-500"
                onClick={onClose}
            />
            {/* Content Container */}
            <div 
                className={cn(
                    "relative w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-500 overflow-hidden rounded-2xl flex flex-col bg-white/70 backdrop-blur-xl border border-white/40",
                    maxWidth,
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100/50 bg-white/30">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-9 w-9 rounded-xl hover:bg-white/50 hover:text-red-500 transition-all duration-300"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                {/* Body */}
                <div className="px-8 py-8 overflow-y-auto min-h-0 relative z-10 max-h-[75vh] scrollbar-thin">
                    {children}
                </div>
            </div>
        </div>
    );
}

