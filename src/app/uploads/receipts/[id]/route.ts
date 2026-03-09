import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const supabase = createServerSupabase();

        // 1. Fetch the receipt record from Supabase
        const { data: receipt, error: fetchError } = await supabase
            .from("receipts")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !receipt) {
            return new NextResponse("Receipt not found", { status: 404 });
        }

        // 2. Extract the storage path from the month_year and request_id 
        // Logic should match what's in upload-receipt/route.ts
        // Since we don't store the full storage path in the table yet, 
        // we list files in the id folder and find the one for the month.

        const requestIdForStorage = receipt.request_id;
        const monthYear = receipt.month_year;

        const { data: files } = await supabase.storage
            .from("receipt")
            .list(requestIdForStorage);

        const file = files?.find(f => f.name.startsWith(monthYear));

        if (!file) {
            return new NextResponse("File not found in storage", { status: 404 });
        }

        const filePath = `${requestIdForStorage}/${file.name}`;
        const { data, error: downloadError } = await supabase.storage
            .from("receipt")
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
        console.error("View legacy receipt error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
