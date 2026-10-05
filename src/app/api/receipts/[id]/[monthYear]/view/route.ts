import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canAccessRequest } from "@/lib/access";
import { buildReceiptResponse, isSafePathSegment } from "@/lib/file-validation";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string; monthYear: string } }
) {
    try {
        const auth = await requireSession(req, { freshRole: true });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const { id, monthYear } = params;
        if (!isSafePathSegment(id) || !isSafePathSegment(monthYear)) {
            return new NextResponse("Bad Request", { status: 400 });
        }

        const supabase = createServerSupabase();

        const access = await canAccessRequest(supabase, id, session);
        if (!access.ok) {
            return access.notFound
                ? new NextResponse("Not found", { status: 404 })
                : new NextResponse("Forbidden", { status: 403 });
        }

        let filePath = `${id}/${monthYear}`;
        let fileName = monthYear;

        let { data, error: downloadError } = await supabase.storage
            .from("receipt")
            .download(filePath);

        if (downloadError) {
            // Fallback for legacy files
            const { data: files } = await supabase.storage
                .from("receipt")
                .list(id);

            const queryMonthYear = monthYear.substring(0, 7);
            const file = files?.find((f: any) => f.name.startsWith(queryMonthYear));

            if (!file) {
                return new NextResponse("File not found in storage", { status: 404 });
            }

            filePath = `${id}/${file.name}`;
            fileName = file.name;

            const retry = await supabase.storage.from("receipt").download(filePath);
            if (retry.error) {
                return new NextResponse("File not found in storage", { status: 404 });
            }
            data = retry.data;
        }

        if (!data) {
            return new NextResponse("File not found in storage", { status: 404 });
        }

        // Clean up the download filename if it has the prefix
        let downloadFileName = fileName;
        const parts = fileName.split("-");
        if (parts.length >= 3 && fileName.match(/^\d{4}-\d{2}-/)) {
            downloadFileName = parts.slice(2).join("-");
        }

        return await buildReceiptResponse(data, downloadFileName);
    } catch (error) {
        console.error("View receipt error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
