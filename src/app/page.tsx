import Link from "next/link";

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            {/* Hero Section */}
            <div className="animate-slide-up">
                <div className="w-20 h-20 mb-8 mx-auto">
                    <img 
                        src="https://wxxaazwykroptrnuaotk.supabase.co/storage/v1/object/public/Image/logo-impactorganizer-square.png" 
                        alt="Logo" 
                        className="w-full h-full object-contain rounded-2xl shadow-xl shadow-brand-500/20"
                    />
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
                    { 
                        title: "Quick Requests", 
                        desc: "Submit card requests with our streamlined form", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            </svg>
                        ) 
                    },
                    { 
                        title: "PDF Generation", 
                        desc: "Auto-generate pre-filled PDF documents", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        ) 
                    },
                    { 
                        title: "Track Expenses", 
                        desc: "Monitor budgets and receipt uploads", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                        ) 
                    },
                ].map((feature) => (
                    <div key={feature.title} className="glass-card-hover p-6 text-center">
                        <div className="mb-3">{feature.icon}</div>
                        <h3 className="font-semibold text-gray-700 mb-1">{feature.title}</h3>
                        <p className="text-xs text-gray-400">{feature.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
