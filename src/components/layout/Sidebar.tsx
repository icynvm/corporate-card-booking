"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { IMPACT_LOGO_BASE64 } from "@/lib/logo-base64";

const navItems = [
    { label: "Dashboard", href: "/dashboard", roles: ["admin", "user", "manager"], icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>) },
    {
        label: "Management",
        roles: ["admin"],
        icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>),
        subItems: [
            { label: "Event IDs", href: "/master-data/events" },
            { label: "Account Codes", href: "/master-data/accounts" },
            { label: "Credit Cards", href: "/master-data/cards" }
        ]
    },
    {
        label: "Requests",
        roles: ["admin", "user", "manager"],
        icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>),
        subItems: [
            { label: "New Request", href: "/request-form" },
            { label: "My Requests", href: "/my-requests" },
        ]
    },
    { label: "Email Settings", href: "/email-settings", roles: ["admin"], icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>) },
    { label: "Admin Panel", href: "/admin", roles: ["admin"], icon: (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>) },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [userName, setUserName] = useState("Loading...");
    const [userDepartment, setUserDepartment] = useState("");
    const [userRole, setUserRole] = useState("");
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setUserName(data.user.name);
                        setUserDepartment(data.user.department);
                        setUserRole(data.user.role);
                        return;
                    }
                }
                router.push("/login");
            } catch {
                setUserName("Offline");
            }
        };
        getUser();
    }, [router]);

    // Expand items if current path is a sub-item
    useEffect(() => {
        navItems.forEach(item => {
            if (item.subItems?.some(sub => pathname === sub.href)) {
                setExpandedItem(item.label);
            }
        });
    }, [pathname]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-0 h-full w-64 glass-card !rounded-none border-r border-white/20 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src={IMPACT_LOGO_BASE64} alt="IMPACT" width={120} height={40} className="w-auto h-8 object-contain" />
                    </div>
                    <button onClick={onClose} className="lg:hidden p-1 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-white dark:bg-gray-800/50 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        if (!item.roles.includes(userRole)) return null;

                        const isExpanded = expandedItem === item.label;
                        const hasSubItems = !!item.subItems;
                        const isActive = item.href ? pathname === item.href : item.subItems?.some(s => pathname === s.href);

                        return (
                            <div key={item.label} className="space-y-1">
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                            ${isActive
                                                ? "bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/25"
                                                : "text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:bg-white dark:bg-gray-800/50"
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => setExpandedItem(isExpanded ? null : item.label)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                                            ${isActive && !isExpanded
                                                ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 dark:text-brand-600 dark:text-brand-400 dark:text-brand-600 dark:text-brand-400"
                                                : "text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200 hover:bg-white dark:bg-gray-800/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            {item.label}
                                        </div>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>
                                )}

                                {hasSubItems && isExpanded && (
                                    <div className="pl-11 space-y-1 animate-slide-down">
                                        {item.subItems.map((sub) => {
                                            const isSubActive = pathname === sub.href;
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    onClick={onClose}
                                                    className={`block py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200
                                                        ${isSubActive
                                                            ? "text-brand-600 dark:text-brand-400 dark:text-brand-600 dark:text-brand-400 dark:text-brand-600 dark:text-brand-400 font-semibold"
                                                            : "text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
                                                        }`}
                                                >
                                                    {sub.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-200 to-purple-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-brand-700 text-xs font-bold">
                                {userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{userName}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate">{userDepartment} &middot; {userRole}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50/50 transition-all duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}

