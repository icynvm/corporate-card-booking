import { NextRequest, NextResponse } from "next/server";
import { getFacebookLoginUrl } from "@/lib/facebook";

export async function GET(req: NextRequest) {
    try {
        const url = getFacebookLoginUrl();
        return NextResponse.redirect(url);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
