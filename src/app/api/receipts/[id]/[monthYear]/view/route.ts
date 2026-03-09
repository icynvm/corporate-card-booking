import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string; monthYear: string } }
) {
    try {
        const { id, monthYear } = params;
        const supabase = createServerSupabase();

        // 1. Find the receipt record to get the file name/path
        const { data: receipt, error: fetchError } = await supabase
            .from("receipts")
            .select("*")
            .eq("request_id", id)
            .eq("month_year", monthYear)
            .single();

        if (fetchError || !receipt) {
            return new NextResponse("Receipt not found", { status: 404 });
        }

        const { data: files } = await supabase.storage
            .from("receipt")
            .list(id);

        const file = files?.find(f => f.name.startsWith(monthYear));

        if (!file) {
            return new NextResponse("File not found in storage", { status: 404 });
        }

        const filePath = `${id}/${file.name}`;
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
        console.error("View receipt error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
