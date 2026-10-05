import type { SupabaseClient } from "@supabase/supabase-js";
import { isPrivileged } from "@/lib/auth";

/** Privileged (admin/manager) or the owner of the request. */
export async function canAccessRequest(
    supabase: SupabaseClient<any, any, any>,
    requestId: string,
    session: { pid: string; role: string }
): Promise<{ ok: boolean; notFound?: boolean }> {
    if (!requestId) return { ok: false, notFound: true };
    const { data } = await supabase
        .from("requests")
        .select("user_id")
        .eq("id", requestId)
        .maybeSingle();
    if (!data) return { ok: false, notFound: true };
    if (isPrivileged(session) || data.user_id === session.pid) return { ok: true };
    return { ok: false };
}
