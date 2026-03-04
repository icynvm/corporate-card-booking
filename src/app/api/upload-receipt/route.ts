import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const formData = await req.formData();
        const requestId = formData.get("requestId") as string;
        const monthYear = formData.get("monthYear") as string;
        const file = formData.get("file") as File;

        if (!requestId || !monthYear || !file) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Placeholder URL (in production, upload to Supabase Storage)
        const receiptFileUrl = `/uploads/receipts/${requestId}/${monthYear}-${file.name}`;

        // Check if receipt already exists for this month
        const { data: existing } = await supabase
            .from("receipts")
            .select("id")
            .eq("request_id", requestId)
            .eq("month_year", monthYear)
            .single();

        let receipt;

        if (existing) {
            const { data } = await supabase
                .from("receipts")
                .update({ receipt_file_url: receiptFileUrl, status: "UPLOADED" })
                .eq("id", existing.id)
                .select()
                .single();
            receipt = data;
        } else {
            const { data } = await supabase
                .from("receipts")
                .insert({
                    request_id: requestId,
                    month_year: monthYear,
                    receipt_file_url: receiptFileUrl,
                    status: "UPLOADED",
                })
                .select()
                .single();
            receipt = data;
        }

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "RECEIPT",
            entity_id: receipt?.id || requestId,
            action: "UPLOAD",
            changes: { month_year: monthYear, file_name: file.name },
        });

        return NextResponse.json(receipt, { status: 201 });
    } catch (error) {
        console.error("Upload receipt error:", error);
        return NextResponse.json(
            { error: "Failed to upload receipt" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { receiptId, status } = await req.json();

        const { data: receipt } = await supabase
            .from("receipts")
            .update({ status })
            .eq("id", receiptId)
            .select()
            .single();

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "RECEIPT",
            entity_id: receiptId,
            action: "VERIFY",
            changes: { new_status: status },
        });

        return NextResponse.json(receipt);
    } catch (error) {
        console.error("Verify receipt error:", error);
        return NextResponse.json(
            { error: "Failed to update receipt status" },
            { status: 500 }
        );
    }
}
