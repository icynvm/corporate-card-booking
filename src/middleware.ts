import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get("cc_session")?.value;

    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        const payload = JSON.parse(Buffer.from(sessionCookie, "base64url").toString());
        if (!payload.pid || !payload.exp || payload.exp < Date.now()) {
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.set("cc_session", "", { maxAge: 0 });
            return response;
        }

        // Admin-only route protection
        if (request.nextUrl.pathname.startsWith("/admin") && payload.role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // Audit logs: only admin and manager
        if (request.nextUrl.pathname.startsWith("/audit-logs") && payload.role === "user") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    } catch {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.set("cc_session", "", { maxAge: 0 });
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/|login|register|approval-result).*)",
    ],
};
