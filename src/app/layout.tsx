import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

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
            <body className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 ml-64 p-8 overflow-auto scrollbar-thin">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </main>
            </body>
        </html>
    );
}
