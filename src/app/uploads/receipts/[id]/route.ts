import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canAccessRequest } from "@/lib/access";
import { buildReceiptResponse, isSafePathSegment } from "@/lib/file-validation";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSession(req, { freshRole: true });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const { id } = params;
        if (!isSafePathSegment(id)) {
            return new NextResponse("Bad Request", { status: 400 });
        }
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

        const access = await canAccessRequest(supabase, receipt.request_id, session);
        if (!access.ok) {
            return access.notFound
                ? new NextResponse("Receipt not found", { status: 404 })
                : new NextResponse("Forbidden", { status: 403 });
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

        if (downloadError || !data) {
            console.error("Download error:", downloadError);
            return new NextResponse("Failed to download file", { status: 500 });
        }

        return await buildReceiptResponse(data, file.name);
    } catch (error) {
        console.error("View legacy receipt error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
