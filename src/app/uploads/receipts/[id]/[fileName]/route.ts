import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canAccessRequest } from "@/lib/access";
import { buildReceiptResponse, isSafePathSegment } from "@/lib/file-validation";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string; fileName: string } }
) {
    try {
        const auth = await requireSession(req, { freshRole: true });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const { id, fileName } = params;
        if (!isSafePathSegment(id) || !isSafePathSegment(fileName)) {
            return new NextResponse("Bad Request", { status: 400 });
        }
        const supabase = createServerSupabase();

        // Resolve the owning request: id is either the request id (direct) or a receipt UUID
        let requestId = id;
        let access = await canAccessRequest(supabase, id, session);

        if (access.notFound) {
            const { data: receipt } = await supabase
                .from("receipts")
                .select("request_id")
                .eq("id", id)
                .maybeSingle();

            if (!receipt) {
                return new NextResponse("File not found in storage", { status: 404 });
            }
            requestId = receipt.request_id;
            access = await canAccessRequest(supabase, requestId, session);
        }

        if (!access.ok) {
            return access.notFound
                ? new NextResponse("File not found in storage", { status: 404 })
                : new NextResponse("Forbidden", { status: 403 });
        }

        const { data, error: downloadError } = await supabase.storage
            .from("receipt")
            .download(`${requestId}/${fileName}`);

        if (downloadError || !data) {
            console.error("Final download error:", downloadError);
            return new NextResponse("File not found in storage", { status: 404 });
        }

        return await buildReceiptResponse(data, fileName);
    } catch (error) {
        console.error("View receipt file error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
