import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
    req: NextRequest,
    { params }: { params: { requestId: string; monthYear: string } }
) {
    try {
        const { requestId, monthYear } = params;
        const supabase = createServerSupabase();

        // 1. Find the receipt record to get the file name/path
        const { data: receipt, error: fetchError } = await supabase
            .from("receipts")
            .select("*")
            .eq("request_id", requestId)
            .eq("month_year", monthYear)
            .single();

        if (fetchError || !receipt) {
            return new NextResponse("Receipt not found", { status: 404 });
        }

        // 2. The path in Supabase Storage was ${requestId}/${monthYear}-${file.name}
        // Since we don't store the exact file name in the table (oops), 
        // we might need to list files or store it in the table.
        // Actually, let's check the audit logs or just assume a standard path if we can.

        // BETTER: Use the receipt_file_url if it's a direct storage path, 
        // but here we are using it for this very route.

        // Let's assume the storage path is stored in the changes of audit_logs or 
        // we can try to guess it if we had a consistent naming.

        // For now, let's try to find the file in the bucket.
        const { data: files } = await supabase.storage
            .from("receipts")
            .list(requestId);

        const file = files?.find(f => f.name.startsWith(monthYear));

        if (!file) {
            return new NextResponse("File not found in storage", { status: 404 });
        }

        const filePath = `${requestId}/${file.name}`;
        const { data, error: downloadError } = await supabase.storage
            .from("receipts")
            .download(filePath);

        if (downloadError) {
            console.error("Download error:", downloadError);
            return new NextResponse("Failed to download file", { status: 500 });
        }

        return new NextResponse(data, {
            headers: {
                "Content-Type": data.type || "application/octet-stream",
                "Content-Disposition": `inline; filename="${file.name}"`,
            },
        });
    } catch (error) {
        console.error("View receipt error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
