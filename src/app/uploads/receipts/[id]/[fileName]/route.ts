import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string; fileName: string } }
) {
    try {
        const { id, fileName } = params;
        const supabase = createServerSupabase();

        // 1. Try direct download first (assumes id is requestId)
        let filePath = `${id}/${fileName}`;
        let { data, error: downloadError } = await supabase.storage
            .from("receipt")
            .download(filePath);

        // 2. If it fails, try to find a receipt record where id is the receipt UUID
        if (downloadError) {
            console.log(`Direct download failed for ${filePath}, searching database...`);

            const { data: receipt } = await supabase
                .from("receipts")
                .select("request_id")
                .eq("id", id)
                .single();

            if (receipt) {
                filePath = `${receipt.request_id}/${fileName}`;
                const { data: data2, error: error2 } = await supabase.storage
                    .from("receipt")
                    .download(filePath);

                if (!error2) {
                    data = data2;
                    downloadError = null;
                }
            }
        }

        if (downloadError) {
            console.error("Final download error:", downloadError);
            return new NextResponse("File not found in storage", { status: 404 });
        }

        return new NextResponse(data, {
            headers: {
                "Content-Type": data!.type || "application/octet-stream",
                "Content-Disposition": `inline; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("View receipt file error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
