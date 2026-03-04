"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
    },
    {
        label: "New Request",
        href: "/request-form",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
        ),
    },
    {
        label: "My Requests",
        href: "/my-requests",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
            </svg>
        ),
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-white/30 shadow-glass-sm z-50 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-800">Corporate Card</h1>
                        <p className="text-xs text-gray-400">Booking System</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25"
                                    : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
                                }
              `}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100/50">
                <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-pink flex items-center justify-center text-xs font-bold text-white">
                        AW
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">Alex Williams</p>
                        <p className="text-[10px] text-gray-400">Digital Marketing</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
