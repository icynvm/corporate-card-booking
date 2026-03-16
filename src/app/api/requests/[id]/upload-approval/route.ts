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
            .from("Request Form")
            .upload(filePath, buffer, {
                contentType: fileName.endsWith(".pdf") ? "application/pdf" : "image/*",
                upsert: true,
            });

        if (uploadError) {
            throw uploadError;
        }

        // Get Signed URL for secure access (10 years duration)
        const { data: signedData, error: signedError } = await supabase.storage
            .from("Request Form")
            .createSignedUrl(filePath, 315360000);

        if (signedError || !signedData?.signedUrl) {
            throw new Error(`Failed to generate signed URL: ${signedError?.message || "Unknown error"}`);
        }
        
        const publicUrl = signedData.signedUrl;

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
