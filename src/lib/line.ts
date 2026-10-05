import { createServerSupabase } from "./supabase";

const LINE_TIMEOUT_MS = 10_000;

/**
 * Returns "<NEXT_PUBLIC_APP_URL>/<path>" or null when the base URL is unset/invalid
 * (LINE rejects messages containing invalid URIs).
 */
export function buildAppUrl(path: string): string | null {
    const base = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s/]+/i.test(base)) return null;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendLineNotification(message: string | any) {
    try {
        const supabase = createServerSupabase();
        
        // Fetch LINE settings from app_settings
        const { data: settingsData } = await supabase
            .from('app_settings')
            .select('key, value')
            .in('key', ['LINE_ACCESS_TOKEN', 'LINE_DESTINATION_ID']);

        const settings = (settingsData || []).reduce((acc: Record<string, string>, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        const accessToken = settings.LINE_ACCESS_TOKEN;
        const destinationId = settings.LINE_DESTINATION_ID;

        if (!accessToken || !destinationId) {
            console.log("LINE notifications skipped: Missing Access Token or Destination ID");
            return { success: false, error: "Missing configuration" };
        }

        // Determine if message is plain text or an object (Flex Message)
        const lineMessage = typeof message === "string" 
            ? { type: "text", text: message } 
            : message;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), LINE_TIMEOUT_MS);
        let response: Response;
        try {
            response = await fetch("https://api.line.me/v2/bot/message/push", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    to: destinationId,
                    messages: [lineMessage],
                }),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("LINE API Error:", errorText);
            return { success: false, error: errorText };
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to send LINE notification:", error);
        return { success: false, error: String(error) };
    }
}
