import { createServerSupabase } from "./supabase";

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

        const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                to: destinationId,
                messages: [lineMessage],
            }),
        });

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
