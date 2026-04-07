"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// 30 minutes in milliseconds
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// 60 seconds for the countdown modal
const COUNTDOWN_SECONDS = 60;

export function IdleTimer() {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
    
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const logout = useCallback(async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout failed", error);
            // Fallback
            window.location.href = "/login";
        }
    }, [router]);

    const resetIdleTimer = useCallback(() => {
        if (showWarning) return; // Don't reset if warning is already showing

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        
        idleTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setTimeLeft(COUNTDOWN_SECONDS);
        }, IDLE_TIMEOUT_MS);
    }, [showWarning]);

    const stayLoggedIn = useCallback(() => {
        setShowWarning(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        resetIdleTimer();
    }, [resetIdleTimer]);

    // Setup event listeners for user activity
    useEffect(() => {
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
        
        const handleActivity = () => resetIdleTimer();
        
        events.forEach(event => document.addEventListener(event, handleActivity));
        
        // Initial setup
        resetIdleTimer();

        return () => {
            events.forEach(event => document.removeEventListener(event, handleActivity));
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // Handle countdown timer when warning is shown
    useEffect(() => {
        if (showWarning) {
            countdownIntervalRef.current = setInterval(() => {
                setTimeLeft((prev: number) => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        logout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }

        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [showWarning, logout]);

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-up border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-yellow-600 dark:text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Are you still there?</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                        You have been inactive for a while. For your security, you will be automatically logged out in 
                        <span className="font-bold text-brand-600 dark:text-brand-400 block text-2xl mt-2">{timeLeft} seconds</span>
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={logout}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Log Out Now
                        </button>
                        <button 
                            onClick={stayLoggedIn}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors shadow-lg shadow-brand-500/30"
                        >
                            Stay Logged In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
