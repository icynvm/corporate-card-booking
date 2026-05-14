import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get(getSessionCookieName())?.value;
        const session = token ? parseSessionToken(token) : null;
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();
        const { data: profile } = await supabase
            .from("profiles")
            .select("fb_access_token")
            .eq("id", session.pid)
            .single();

        if (!profile?.fb_access_token) {
            return NextResponse.json({ campaigns: [] });
        }

        // 1. Get Ad Accounts
        const accountsRes = await fetch(
            `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&access_token=${profile.fb_access_token}`
        );
        const accountsData = await accountsRes.json();
        
        if (accountsData.error || !accountsData.data?.length) {
            return NextResponse.json({ campaigns: [] });
        }

        // 2. Get active/recent campaigns
        const adAccountId = accountsData.data[0].id;
        const campaignsRes = await fetch(
            `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,status&limit=50&access_token=${profile.fb_access_token}`
        );
        const campaignsData = await campaignsRes.json();

        return NextResponse.json({ 
            campaigns: campaignsData.data || [],
            adAccountId: adAccountId
        });
    } catch (error) {
        return NextResponse.json({ campaigns: [] });
    }
}
