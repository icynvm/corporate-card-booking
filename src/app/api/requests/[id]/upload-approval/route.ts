import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// POST: Upload approval file (base64)
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerSupabase();
        const body = await req.json();
        const { fileData, fileName, notes } = body;
        const requestId = params.id;

        if (!fileData || !fileName) {
            return NextResponse.json(
                { error: "fileData and fileName are required" },
                { status: 400 }
            );
        }

        // Decode base64
        const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Upload to Supabase Storage
        const filePath = `approvals/${requestId}/${Date.now()}-${fileName}`;
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
                })
                .eq("id", requestId)
                .select()
                .single();

            if (error) throw new Error(`Failed to update request: ${error.message}`);

            // Audit log
            await supabase.from("audit_logs").insert({
                entity_type: "REQUEST",
                entity_id: requestId,
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
            })
            .eq("id", requestId)
            .select()
            .single();

        if (error) throw new Error(`Failed to update request: ${error.message}`);

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: requestId,
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
