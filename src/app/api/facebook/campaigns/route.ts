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
        const { searchParams } = new URL(req.url);
        const since = searchParams.get("since");
        const until = searchParams.get("until");

        const { data: profile } = await supabase
            .from("profiles")
            .select("fb_access_token, fb_user_id")
            .eq("id", session.pid)
            .single();

        if (!profile?.fb_access_token) {
            return NextResponse.json({ error: "Facebook not connected" }, { status: 400 });
        }

        // 1. Get Ad Accounts
        const accountsRes = await fetch(
            `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency&access_token=${profile.fb_access_token}`
        );
        const accountsData = await accountsRes.json();
        
        if (accountsData.error) throw new Error(accountsData.error.message);

        if (accountsData.data.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Get Campaigns for the first account
        const adAccountId = accountsData.data[0].id;
        
        // Build the URL with optional date filtering
        let campaignsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&access_token=${profile.fb_access_token}`;
        
        // For performance/insights, we use time_range, but for campaign list we use filtering
        if (since && until) {
            // Note: In a real app, you might want to fetch insights here too to see spend for that range
        }

        const campaignsRes = await fetch(campaignsUrl);
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
