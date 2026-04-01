import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

/**
 * Handles per-installment receipt uploads.
 * Links to a specific Request ID and Month-Year.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(getSessionCookieName())?.value;
    const session = token ? parseSessionToken(token) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const requestId = formData.get("requestId") as string;
    const monthYear = formData.get("monthYear") as string;
    const file = formData.get("file") as File;

    if (!requestId || !monthYear || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // 1. Upload File to "Receipts" Bucket
    const fileExt = file.name.split(".").pop();
    const fileName = `${requestId}_${monthYear}_${uuidv4().slice(0, 8)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { data: storageData, error: storageErr } = await supabase.storage
      .from("Request Form") // We'll use existing bucket for simplicity or "Receipts" if exists
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (storageErr) throw storageErr;

    const { data: { publicUrl } } = supabase.storage
      .from("Request Form")
      .getPublicUrl(filePath);

    // 2. Upsert Receipt Record
    const { data: receipt, error: recErr } = await supabase
      .from("receipts")
      .upsert({
        request_id: requestId,
        month_year: monthYear,
        receipt_file_url: publicUrl,
        status: "UPLOADED",
      }, { onConflict: "request_id, month_year" }) // Assumes unique constraint exists
      .select()
      .single();

    if (recErr) {
      // If no unique constraint, just insert
      const { data: fallbackRec, error: fallbackErr } = await supabase
        .from("receipts")
        .insert({
          request_id: requestId,
          month_year: monthYear,
          receipt_file_url: publicUrl,
          status: "UPLOADED",
        })
        .select()
        .single();
      
      if (fallbackErr) throw fallbackErr;
    }

    // 3. Update Request Payment Status (if explicit record exists)
    await supabase
      .from("request_payments")
      .update({ status: "PAID", payment_date: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("month_year", monthYear);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error("Receipt Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    // Logic for deleting a receipt if necessary
    return NextResponse.json({ message: "Not implemented yet" });
}
