import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
    req: NextRequest,
    { params }: { params: { requestId: string; fileName: string } }
) {
    try {
        const { requestId, fileName } = params;
        const supabase = createServerSupabase();

        // The storage path is [requestId]/[fileName] in the 'receipts' bucket
        const filePath = `${requestId}/${fileName}`;

        const { data, error: downloadError } = await supabase.storage
            .from("receipts")
            .download(filePath);

        if (downloadError) {
            console.error("Download error:", downloadError);
            return new NextResponse("File not found in storage", { status: 404 });
        }

        return new NextResponse(data, {
            headers: {
                "Content-Type": data.type || "application/octet-stream",
                "Content-Disposition": `inline; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error("View receipt file error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
