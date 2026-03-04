import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require auth
    const publicRoutes = ["/login", "/register", "/api/approve", "/approval-result"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublic) {
        return NextResponse.next();
    }

    // Check for Supabase session via cookie
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next(); // Skip auth check if not configured
    }

    // Get the access token from cookies
    const accessToken = request.cookies.get("sb-access-token")?.value;
    const refreshToken = request.cookies.get("sb-refresh-token")?.value;

    // Also check for the default Supabase auth cookie pattern
    const allCookies = request.cookies.getAll();
    const sbAuthCookie = allCookies.find((c) => c.name.includes("auth-token"));

    if (!accessToken && !refreshToken && !sbAuthCookie) {
        // No auth tokens found, redirect to login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/approve|login|register|approval-result).*)",
    ],
};
