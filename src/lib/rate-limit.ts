import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export function clientIp(req: NextRequest): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
    }
    return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Persistent rate limiter backed by the `rate_limit_hit` Postgres function.
 * Fails open if the RPC errors (e.g. migration not yet applied).
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase.rpc("rate_limit_hit", {
            p_key: key,
            p_limit: limit,
            p_window_seconds: windowSeconds,
        });
        if (error) {
            console.error("rateLimit RPC error (failing open):", error.message);
            return { allowed: true };
        }
        if (data === false) {
            return { allowed: false, retryAfter: windowSeconds };
        }
        return { allowed: true };
    } catch (err) {
        console.error("rateLimit unexpected error (failing open):", err);
        return { allowed: true };
    }
}
