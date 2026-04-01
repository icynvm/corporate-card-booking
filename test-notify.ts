import { createServerSupabase } from "./src/lib/supabase";

async function testNotify() {
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
        console.error("Missing config in DB");
        return;
    }

    const message = {
        type: "flex",
        altText: "Test Notification",
        contents: {
            type: "bubble",
            header: {
              type: "box",
              layout: "vertical",
              contents: [{ type: "text", text: "Test", color: "#ffffff" }],
              backgroundColor: "#10B981"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [{ type: "text", text: "If you see this, Flex Messages are working!" }]
            }
        }
    };

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            to: destinationId,
            messages: [message],
        }),
    });

    console.log("Status:", res.status);
    console.log("Response:", await res.text());
  } catch (err) {
    console.error("Error:", err);
  }
}

testNotify();
