import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
    // Auth disabled by user request to focus on system development
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api/approve|api/create-admin|auth/callback|login|register|approval-result).*)",
    ],
};
