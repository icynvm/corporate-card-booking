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
        // Parse the actual monthYear since the URL might contain the full filename now
        const queryMonthYear = monthYear.substring(0, 7);

        const { data: receipt, error: fetchError } = await supabase
            .from("receipts")
            .select("*")
            .eq("request_id", id)
            .eq("month_year", queryMonthYear)
            .single();

        if (fetchError || !receipt) {
            return new NextResponse("Receipt not found", { status: 404 });
        }

        const storagePath = (receipt as any).storage_path;
        let filePath = "";
        let fileName = "";

        if (storagePath) {
            filePath = storagePath;
            // Extract original filename, which comes after monthYear.
            // Format is: [id]/[YYYY-MM]-[safeName]
            const parts = storagePath.split("-");
            if (parts.length >= 3) {
                // Remove ID and month year (first two dashes), keep the rest
                fileName = parts.slice(2).join("-");
            } else {
                fileName = storagePath.split("/").pop() || "receipt";
            }
        } else {
            // Fallback for legacy files: search by prefix
            const { data: files } = await supabase.storage
                .from("receipt")
                .list(id);

            const file = files?.find((f: any) => f.name.startsWith(monthYear));

            if (!file) {
                return new NextResponse("File not found in storage", { status: 404 });
            }
            filePath = `${id}/${file.name}`;
            fileName = file.name;
        }

        const { data, error: downloadError } = await supabase.storage
            .from("receipt")
            .download(filePath);
        const file = { name: fileName }; // For filename reference below

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
