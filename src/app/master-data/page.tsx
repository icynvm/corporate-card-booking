"use client";

import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

const managementOptions = [
    {
        title: "Event IDs",
        description: "Manage standardized Event IDs and their associated account mappings.",
        href: "/master-data/events",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
        )
    },
    {
        title: "Account Codes",
        description: "Centralized list of official account codes used across all requests.",
        href: "/master-data/accounts",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        )
    },
    {
        title: "Credit Cards",
        description: "Manage the master list of corporate credit cards and their details.",
        href: "/master-data/cards",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
        )
    }
];

export default function MasterDataOverviewPage() {
    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-12">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    Management <span className="gradient-text">Console</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Select a category to manage your organization's master data and ensure pattern consistency.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {managementOptions.map((option) => (
                    <Link key={option.href} href={option.href} className="group">
                        <GlassCard className="h-full hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300">
                            <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-gray-800/50 w-fit group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100 dark:border-gray-700">
                                {option.icon}
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-brand-600 transition-colors">
                                {option.title}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                {option.description}
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-brand-600 dark:text-brand-400 text-sm font-semibold">
                                Configure Sub-data
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </div>
                        </GlassCard>
                    </Link>
                ))}
            </div>
        </div>
    );
}
