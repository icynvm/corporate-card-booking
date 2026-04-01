import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LayoutDashboard, FileText, CheckCircle, TrendingUp, ShieldCheck } from "lucide-react";

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            {/* Hero Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="w-20 h-20 mb-8 mx-auto relative group">
                    <div className="absolute inset-0 bg-brand-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <img 
                        src="https://wxxaazwykroptrnuaotk.supabase.co/storage/v1/object/public/Image/logo-impactorganizer-square.png" 
                        alt="Logo" 
                        className="w-full h-full object-contain rounded-2xl shadow-xl relative z-10"
                    />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Corporate Card <span className="gradient-text">Booking System</span>
                </h1>
                <p className="text-gray-500 text-lg mb-12 max-w-lg mx-auto font-medium leading-relaxed">
                    The professional gateway for streamlining corporate credit card requests, multi-level approvals, and automated expense reconciliation.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" variant="brand" className="h-12 px-8 rounded-xl shadow-xl shadow-brand/20">
                        <Link href="/request-form" className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            New Request
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-xl bg-white/50 backdrop-blur-sm border-gray-200">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5" />
                            Dashboard
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-4xl">
                {[
                    { 
                        title: "Smart Requests", 
                        desc: "Submit expenditures with zero friction through our intelligent multi-step entry system.", 
                        icon: <Plus className="w-8 h-8 text-brand-600" />,
                        accent: "bg-brand-50"
                    },
                    { 
                        title: "Secure Controls", 
                        desc: "Multi-level management oversight ensures compliance and audit-ready documentation.", 
                        icon: <ShieldCheck className="w-8 h-8 text-emerald-600" />,
                        accent: "bg-emerald-50"
                    },
                    { 
                        title: "Real-time Insight", 
                        desc: "Visualize spending velocity and project allocations with live administrative analytics.", 
                        icon: <TrendingUp className="w-8 h-8 text-indigo-600" />,
                        accent: "bg-indigo-50"
                    },
                ].map((feature) => (
                    <Card key={feature.title} glass className="group hover:-translate-y-2 transition-all duration-500 border-none shadow-lg">
                        <CardContent className="p-8 text-center">
                            <div className={`w-16 h-16 ${feature.accent} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

