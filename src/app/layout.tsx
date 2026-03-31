import type { Metadata } from "next";
import { Noto_Sans_Thai, Poppins } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
    variable: "--font-poppins",
    display: "swap",
});

const noto_sans_thai = Noto_Sans_Thai({
    preload: false,
    variable: "--font-noto-sans-thai",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Corporate Card Booking System | IMPACT",
    description: "Corporate credit card request and expense tracking system",
    icons: {
        icon: "https://wxxaazwykroptrnuaotk.supabase.co/storage/v1/object/public/Image/logo-impactorganizer-square.png",
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                {/* Favicon removed due to broken link */}
            </head>
            <body className={`${poppins.variable} ${noto_sans_thai.variable} font-sans bg-[#f0f4f8] text-gray-800 min-h-screen view-height-fix selection:bg-brand-500/30`}>
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
