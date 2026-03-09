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

        const storagePath = (receipt as any).storage_path;
        let filePath = "";
        let fileName = "";

        if (storagePath) {
            // Include full path in filename, replacing slashes with dashes for a safe file name
            filePath = storagePath;
            fileName = storagePath.replace(/\//g, "-");
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
