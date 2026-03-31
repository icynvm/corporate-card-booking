import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
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
        // Sanitize filename: remove spaces and special characters
        const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
        const storagePath = `${id}/${monthYear}-${safeName}`;
        const filePath = storagePath;

        // Validation: 2MB limit
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 2MB limit" }, { status: 400 });
        }

        // Validation: MIME types
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Only JPEG, PNG and PDF files are allowed" }, { status: 400 });
        }

        // Upload to Supabase Storage (bucket: receipt)
        const { error: uploadError } = await supabase.storage
            .from("receipt")
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json({ error: "Failed to upload to storage" }, { status: 500 });
        }

        // We use a proxy route to handle the viewing
        // This allows us to handle permissions or bucket name changes later
        const receiptFileUrl = `/api/receipts/${id}/${encodeURIComponent(`${monthYear}-${safeName}`)}/view`;

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
                .update({
                    receipt_file_url: receiptFileUrl,
                    storage_path: storagePath,
                    status: "UPLOADED"
                })
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
                    storage_path: storagePath,
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
            user_name: session?.name || session?.email || "User",
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
        const session = getSession(req);
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
            user_name: session?.name || session?.email || "User",
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
