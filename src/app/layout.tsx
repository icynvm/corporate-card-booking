import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
    title: "Corporate Card Booking System",
    description: "Corporate credit card request and expense tracking system",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="bg-[#f0f4f8] text-gray-800 font-sans min-h-screen view-height-fix selection:bg-brand-500/30">
                <div className="fixed inset-0 -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>

                {/* Soft ambient background blobs */}
                <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-20 bg-gradient-to-r from-pastel-blue to-pastel-purple blur-[100px] -z-10"></div>
                <div className="fixed bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full opacity-20 bg-gradient-to-l from-pastel-pink to-brand-300 blur-[80px] -z-10"></div>

                <AppLayout>
                    {children}
                </AppLayout>
            </body>
        </html>
    );
}
