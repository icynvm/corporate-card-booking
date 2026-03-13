import Link from "next/link";

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            {/* Hero Section */}
            <div className="animate-slide-up">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-xl shadow-brand-500/30 mb-8 mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                </div>
                <h1 className="text-4xl font-bold text-gray-800 mb-3">
                    Corporate Card <span className="gradient-text">Booking System</span>
                </h1>
                <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
                    Streamline your corporate credit card requests, approvals, and expense tracking.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/request-form" className="btn-primary inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Request
                    </Link>
                    <Link href="/dashboard" className="btn-secondary inline-flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                    </Link>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-3xl">
                {[
                    { title: "Quick Requests", desc: "Submit card requests with our streamlined form", icon: "๐“" },
                    { title: "PDF Generation", desc: "Auto-generate pre-filled PDF documents", icon: "๐“" },
                    { title: "Track Expenses", desc: "Monitor budgets and receipt uploads", icon: "๐“" },
                ].map((feature) => (
                    <div key={feature.title} className="glass-card-hover p-6 text-center">
                        <div className="text-3xl mb-3">{feature.icon}</div>
                        <h3 className="font-semibold text-gray-700 mb-1">{feature.title}</h3>
                        <p className="text-xs text-gray-400">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
