import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionToken } from "@/lib/session";

// In-memory rate limiter (per Edge container instance)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const BLOCK_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

export async function middleware(request: NextRequest) {
    // 1. Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "generic-ip";
    const now = Date.now();
    const rateData = rateLimitMap.get(ip) || { count: 0, timestamp: now };

    if (now - rateData.timestamp > BLOCK_WINDOW_MS) {
        rateData.count = 0;
        rateData.timestamp = now;
    }

    rateData.count++;
    rateLimitMap.set(ip, rateData);

    if (rateData.count > MAX_REQUESTS) {
        return new NextResponse("Too Many Requests. Rate limit exceeded.", { status: 429 });
    }

    // 2. Session Authentication
    const sessionCookie = request.cookies.get("cc_session")?.value;

    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = parseSessionToken(sessionCookie);
    if (!payload) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.set("cc_session", "", { maxAge: 0 });
        return response;
    }

        // Admin-only route protection
        if (request.nextUrl.pathname.startsWith("/admin") && payload.role !== "admin" && payload.role !== "manager") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // Email settings: admin only
        if (request.nextUrl.pathname.startsWith("/email-settings") && payload.role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // Audit logs: only admin and manager
        if (request.nextUrl.pathname.startsWith("/audit-logs") && payload.role === "user") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }


    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/|login|register|approval-result).*)",
    ],
};
