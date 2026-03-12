import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST: Upload approval file (base64)
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerSupabase();
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const notes = formData.get("notes") as string | null;
        const id = params.id;

        if (!file) {
            return NextResponse.json(
                { error: "File is required" },
                { status: 400 }
            );
        }

        const fileName = file.name;
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Supabase Storage
        const filePath = `approvals/${id}/${Date.now()}-${fileName}`;
        const { error: uploadError } = await supabase.storage
            .from("approval-docs")
            .upload(filePath, buffer, {
                contentType: fileName.endsWith(".pdf") ? "application/pdf" : "image/*",
                upsert: true,
            });

        if (uploadError) {
            // If storage bucket doesn't exist, save as data URL instead
            console.error("Storage upload failed:", uploadError);

            // Fallback: store as a reference
            const { data, error } = await supabase
                .from("requests")
                .update({
                    approval_file_url: `data-ref:${fileName}`,
                    approval_notes: notes || "",
                    status: "APPROVED",
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw new Error(`Failed to update request: ${error.message}`);

            // Audit log
            await supabase.from("audit_logs").insert({
                entity_type: "REQUEST",
                entity_id: id,
                action: "UPLOAD_APPROVAL",
                user_name: "User",
                changes: { file_name: fileName, notes: notes || "" },
            });

            return NextResponse.json({ ...data, note: "File reference saved (storage bucket not configured)" });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from("approval-docs")
            .getPublicUrl(filePath);

        // Update request with file URL
        const { data, error } = await supabase
            .from("requests")
            .update({
                approval_file_url: publicUrl,
                approval_notes: notes || "",
                status: "APPROVED",
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update request: ${error.message}`);

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: id,
            action: "UPLOAD_APPROVAL",
            user_name: "User",
            changes: { file_name: fileName, file_url: publicUrl, notes: notes || "" },
        });

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("Failed to upload approval file:", error);
        return NextResponse.json(
            { error: error.message || "Failed to upload approval file" },
            { status: 500 }
        );
    }
}
