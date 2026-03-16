import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
    try {
        const supabase = createServerSupabase();
        
        // Try uploading dummy bytes to request-form
        const testBytes = Buffer.from("%PDF-1.4 ... Dummy PDF Content for Testing upload bucket RLS ...");
        
        const { data, error } = await supabase.storage
            .from("request-form")
            .upload("test-diagnostic.pdf", testBytes, {
                contentType: "application/pdf",
                upsert: true
            });

        if (error) {
            const { data: buckets } = await supabase.storage.listBuckets();
            return NextResponse.json({ 
                success: false, 
                message: "Bucket upload failed (Bucket not found)", 
                error: error,
                existingBuckets: buckets?.map(b => b.name) || []
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Bucket upload succeeded!", 
            data: data 
        });

    } catch (e: any) {
        return NextResponse.json({ 
            success: false, 
            message: "Exception occurred", 
            error: e.message 
        });
    }
}
