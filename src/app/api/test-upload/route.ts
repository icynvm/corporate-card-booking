import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
    try {
        const supabase = createServerSupabase();
        const testBytes = Buffer.from("%PDF-1.4 ... Dummy PDF for Testing ...");
        
        // List of variations to test
        const variations = ["Request Form", "request_form", "request-form"];
        const results: any[] = [];

        for (const bucket of variations) {
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload("test-diagnostic.pdf", testBytes, {
                    contentType: "application/pdf",
                    upsert: true
                });

            results.push({
                bucket: bucket,
                success: !error,
                error: error ? error.message : null,
                statusCode: error ? (error as any).statusCode : null,
                data: data
            });
        }

        const { data: buckets } = await supabase.storage.listBuckets();

        return NextResponse.json({ 
            message: "Diagnostics complete", 
            testedBuckets: results,
            allAvailableBuckets: buckets?.map(b => b.name) || []
        });

    } catch (e: any) {
        return NextResponse.json({ 
            success: false, 
            message: "Exception occurred", 
            error: e.message 
        });
    }
}
