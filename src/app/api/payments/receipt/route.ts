import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canAccessRequest } from "@/lib/access";
import { detectFileType } from "@/lib/file-validation";
import { v4 as uuidv4 } from "uuid";

/**
 * Handles per-installment receipt uploads.
 * Links to a specific Request ID and Month-Year.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession(req, { freshRole: true });
    if ("response" in auth) return auth.response;
    const { session } = auth;

    const formData = await req.formData();
    const requestId = formData.get("requestId") as string;
    const monthYear = formData.get("monthYear") as string;
    const file = formData.get("file");

    if (!requestId || !monthYear || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof requestId !== "string" || typeof monthYear !== "string" || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return NextResponse.json({ error: "Invalid monthYear (expected YYYY-MM)" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 2MB limit" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const access = await canAccessRequest(supabase, requestId, session);
    if (!access.ok) {
      return access.notFound
        ? NextResponse.json({ error: "Request not found" }, { status: 404 })
        : NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectFileType(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: "Only JPEG, PNG and PDF files are allowed" }, { status: 400 });
    }

    // 1. Upload File to "Receipts" Bucket
    const fileExt = detectedType === "application/pdf" ? "pdf" : detectedType === "image/png" ? "png" : "jpg";
    const fileName = `${requestId}_${monthYear}_${uuidv4().slice(0, 8)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { data: storageData, error: storageErr } = await supabase.storage
      .from("Request Form") // We'll use existing bucket for simplicity or "Receipts" if exists
      .upload(filePath, buffer, {
        contentType: detectedType,
        upsert: false,
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
  } catch (error) {
    console.error("Receipt Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    const auth = await requireSession(req, { freshRole: true });
    if ("response" in auth) return auth.response;
    const { session } = auth;

    // Owner of the request or admin only
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });

    const supabase = createServerSupabase();
    const access = await canAccessRequest(supabase, requestId, session);
    if (access.notFound) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (!access.ok || (session.role === "manager" && !(await isOwner(supabase, requestId, session.pid)))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Logic for deleting a receipt if necessary
    return NextResponse.json({ message: "Not implemented yet" });
}

async function isOwner(supabase: ReturnType<typeof createServerSupabase>, requestId: string, pid: string) {
    const { data } = await supabase.from("requests").select("user_id").eq("id", requestId).maybeSingle();
    return data?.user_id === pid;
}
