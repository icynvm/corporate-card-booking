"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthRoute = pathname === "/login" || pathname === "/register";
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    if (isAuthRoute) {
        return <main className="min-h-screen w-full">{children}</main>;
    }

    return (
        <div className="flex min-h-screen w-full">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full overflow-hidden">
                {/* Mobile Header - hamburger on LEFT */}
                <div className="lg:hidden p-4 border-b border-white/20 bg-white/40 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-gray-600 hover:bg-white/60 rounded-lg transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            </svg>
                        </div>
                        <h1 className="font-bold text-gray-800 text-sm tracking-tight text-shadow-sm">Corporate Card</h1>
                    </div>
                </div>

                <div className="p-4 md:p-8 flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin">
                    <div className="max-w-7xl mx-auto w-full animate-fade-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
