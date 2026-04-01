import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // "next" is a query param to redirect to after successful login
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = createServerSupabase();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+magic+link`);
}
