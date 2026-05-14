import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get(getSessionCookieName())?.value;
        const session = token ? parseSessionToken(token) : null;
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();
        const { data: profile } = await supabase
            .from("profiles")
            .select("fb_access_token, fb_user_id")
            .eq("id", session.pid)
            .single();

        if (!profile?.fb_access_token) {
            return NextResponse.json({ error: "Facebook not connected" }, { status: 400 });
        }

        // 1. Get Ad Accounts first
        const accountsRes = await fetch(
            `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency&access_token=${profile.fb_access_token}`
        );
        const accountsData = await accountsRes.json();
        
        if (accountsData.error) throw new Error(accountsData.error.message);

        // 2. For each account, get campaigns (simplified: just first account for now)
        if (accountsData.data.length === 0) {
            return NextResponse.json([]);
        }

        const adAccountId = accountsData.data[0].id;
        const campaignsRes = await fetch(
            `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&access_token=${profile.fb_access_token}`
        );
        const campaignsData = await campaignsRes.json();

        return NextResponse.json(campaignsData.data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const token = req.cookies.get(getSessionCookieName())?.value;
        const session = token ? parseSessionToken(token) : null;
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { campaignId, status, dailyBudget } = body;

        const supabase = createServerSupabase();
        const { data: profile } = await supabase
            .from("profiles")
            .select("fb_access_token")
            .eq("id", session.pid)
            .single();

        if (!profile?.fb_access_token) {
            return NextResponse.json({ error: "Facebook not connected" }, { status: 400 });
        }

        const updates: any = {};
        if (status) updates.status = status;
        if (dailyBudget) updates.daily_budget = dailyBudget;

        const res = await fetch(
            `https://graph.facebook.com/v19.0/${campaignId}?access_token=${profile.fb_access_token}`,
            {
                method: "POST", // Facebook uses POST for updates
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            }
        );

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
