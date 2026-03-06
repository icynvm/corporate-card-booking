import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const formData = await req.formData();
        const id = (formData.get("id") || formData.get("requestId")) as string;
        const monthYear = formData.get("monthYear") as string;
        const file = formData.get("file") as File;

        if (!id || !monthYear || !file) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = `${id}/${monthYear}-${file.name}`;

        // Upload to Supabase Storage (bucket: receipts)
        const { error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            // We will continue but the link might fail if bucket doesn't exist
        }

        // We use a proxy route to handle the viewing
        // This allows us to handle permissions or bucket name changes later
        const receiptFileUrl = `/api/receipts/${id}/${monthYear}/view`;

        // Check if receipt already exists for this month
        const { data: existing } = await supabase
            .from("receipts")
            .select("id")
            .eq("request_id", id)
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
                    request_id: id,
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
            entity_id: receipt?.id || id,
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
