import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

const MAX_FILES = 3;

export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
        const supabase = createServerSupabase();
        const formData = await req.formData();
        const id = (formData.get("id") || formData.get("requestId")) as string;
        const monthYear = formData.get("monthYear") as string;

        // Support both single "file" field (legacy) and multiple "files" field
        const files: File[] = [];
        const multipleFiles = formData.getAll("files");
        if (multipleFiles.length > 0) {
            for (const f of multipleFiles) {
                if (f instanceof File) files.push(f);
            }
        } else {
            const singleFile = formData.get("file") as File | null;
            if (singleFile) files.push(singleFile);
        }

        if (!id || !monthYear || files.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (files.length > MAX_FILES) {
            return NextResponse.json(
                { error: `Maximum ${MAX_FILES} files allowed per upload` },
                { status: 400 }
            );
        }

        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        const receipts = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Validation: 2MB limit per file
            if (file.size > 2 * 1024 * 1024) {
                return NextResponse.json({ error: `File "${file.name}" exceeds 2MB limit` }, { status: 400 });
            }

            // Validation: MIME types
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json({ error: `File "${file.name}": Only JPEG, PNG and PDF files are allowed` }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            // Sanitize filename: remove spaces and special characters
            const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
            // For multiple files, append index suffix to storage path to avoid overwriting
            const fileKey = files.length > 1 ? `${monthYear}-${i + 1}-${safeName}` : `${monthYear}-${safeName}`;
            const storagePath = `${id}/${fileKey}`;

            // Upload to Supabase Storage (bucket: receipt)
            const { error: uploadError } = await supabase.storage
                .from("receipt")
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: true,
                });

            if (uploadError) {
                console.error("Storage upload error:", uploadError);
                return NextResponse.json({ error: `Failed to upload "${file.name}" to storage` }, { status: 500 });
            }

            // We use a proxy route to handle the viewing
            const receiptFileUrl = `/api/receipts/${id}/${encodeURIComponent(fileKey)}/view`;

            // For the first file, check if receipt already exists for this month and update it
            // For subsequent files, always insert new records
            if (i === 0) {
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
                receipts.push(receipt);
            } else {
                // Additional files: insert new receipt records
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
                receipts.push(data);
            }
        }

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "RECEIPT",
            entity_id: receipts[0]?.id || id,
            action: "UPLOAD",
            user_name: session?.name || session?.email || "User",
            changes: {
                month_year: monthYear,
                file_count: files.length,
                file_names: files.map(f => f.name),
            },
        });

        // Return array if multiple, single object if one (backward-compatible)
        return NextResponse.json(
            files.length === 1 ? receipts[0] : receipts,
            { status: 201 }
        );
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
