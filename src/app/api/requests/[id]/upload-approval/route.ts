import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession, isPrivileged } from "@/lib/auth";

const BUCKET = "Request Form";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const EXT_BY_TYPE: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
};

// Detect the real file type from magic bytes (never trust the client-supplied type)
function detectType(buf: Buffer): string | null {
    if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (
        buf.length >= 4 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    ) return "image/png";
    return null;
}

function sanitizeFileName(name: string, ext: string): string {
    let safe = (name || "approval").replace(/[^a-z0-9._-]/gi, "_").replace(/^\.+/, "");
    if (safe.length > 80) safe = safe.slice(-80);
    if (!safe.toLowerCase().endsWith(ext)) safe = `${safe}${ext}`;
    return safe;
}

// Resolve the storage path from the value stored in requests.approval_file_url.
// New format: /api/requests/<id>/upload-approval?file=<storage path>
// Legacy format: a Supabase signed URL containing /Request%20Form/<path>
function resolveStoragePath(stored: string, id: string): string | null {
    try {
        if (stored.startsWith("/api/")) {
            const file = new URL(stored, "http://localhost").searchParams.get("file");
            if (!file || !file.startsWith(`approvals/${id}/`) || file.includes("..")) return null;
            return file;
        }
        const url = new URL(stored);
        const pathParts = url.pathname.split("/Request%20Form/");
        if (pathParts.length < 2) return null;
        return decodeURIComponent(pathParts[1].split("?")[0]);
    } catch {
        return null;
    }
}

// POST: Upload approval file
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSession(req, { freshRole: true });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const id = params.id;

        const { data: existing, error: existingError } = await supabase
            .from("requests")
            .select("id, user_id, status")
            .eq("id", id)
            .maybeSingle();

        if (existingError) throw existingError;
        if (!existing) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const isOwner = existing.user_id === session.pid;
        if (!isOwner && !isPrivileged(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (existing.status === "CANCELLED") {
            return NextResponse.json({ error: "Cancelled requests cannot be modified" }, { status: 400 });
        }
        // Owners may only attach the signed document while the request is awaiting approval
        if (!isPrivileged(session) && existing.status !== "PENDING_APPROVAL") {
            return NextResponse.json({ error: "Approval file can only be uploaded while pending approval" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const notesRaw = formData.get("notes");
        const notes = typeof notesRaw === "string" ? notesRaw.slice(0, 2000) : null;

        if (!file || typeof file === "string") {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        const detectedType = detectType(buffer);
        if (!detectedType || !ALLOWED_TYPES.includes(detectedType)) {
            return NextResponse.json({ error: "Invalid file type. Only PDF, JPEG or PNG files are allowed" }, { status: 400 });
        }

        const safeName = sanitizeFileName(file.name, EXT_BY_TYPE[detectedType]);

        // Upload to Supabase Storage
        const filePath = `approvals/${id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: detectedType,
                upsert: true,
            });

        if (uploadError) {
            throw uploadError;
        }

        // Store an authenticated proxy URL (resolved by the GET handler below) instead of a long-lived signed URL
        const proxyUrl = `/api/requests/${id}/upload-approval?file=${encodeURIComponent(filePath)}`;

        // Only admin/manager uploads approve the request; an owner upload just attaches
        // the signed document for review, otherwise requesters could self-approve.
        const updatePayload: Record<string, unknown> = {
            approval_file_url: proxyUrl,
            approval_notes: notes || "",
        };
        if (isPrivileged(session)) updatePayload.status = "APPROVED";

        const { data, error } = await supabase
            .from("requests")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update request: ${error.message}`);

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: id,
            action: "UPLOAD_APPROVAL",
            user_id: session.pid,
            user_name: session.name || session.email || "User",
            changes: { file_name: safeName, file_path: filePath, notes: notes || "" },
        });

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("Failed to upload approval file:", error);
        return NextResponse.json({ error: "Failed to upload approval file" }, { status: 500 });
    }
}

// GET: Authenticated proxy download/view of the approval file, streamed from the backend.
// The storage path is always resolved from the DB, never from the query string.
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSession(req, { freshRole: true });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const id = params.id;

        const { data: request, error: fetchError } = await supabase
            .from("requests")
            .select("user_id, approval_file_url")
            .eq("id", id)
            .maybeSingle();

        if (fetchError || !request?.approval_file_url) {
            return NextResponse.json({ error: "Approval file not found or inaccessible" }, { status: 404 });
        }

        if (!isPrivileged(session) && request.user_id !== session.pid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const filePath = resolveStoragePath(request.approval_file_url, id);
        if (!filePath) {
            return NextResponse.json({ error: "Approval file not found or inaccessible" }, { status: 404 });
        }

        // Download stream using Service Role direct client
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .download(filePath);

        if (error || !data) {
            console.error("Supabase Storage Download Error:", error);
            return NextResponse.json({ error: "File failed to retrieve from storage stream" }, { status: 500 });
        }

        const buffer = Buffer.from(await data.arrayBuffer());
        const detectedType = detectType(buffer);
        const rawName = filePath.split("/").pop() || "approval";
        const fileName = rawName.replace(/[^a-z0-9._-]/gi, "_");
        const isDownload = req.nextUrl.searchParams.get("download") === "true";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": detectedType || "application/octet-stream",
                "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, no-store",
            }
        });

    } catch (error: any) {
         console.error("Failed to proxy approval file stream:", error);
         return NextResponse.json({ error: "Failed to load approval file" }, { status: 500 });
    }
}
