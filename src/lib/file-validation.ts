export type AllowedFileType = "application/pdf" | "image/jpeg" | "image/png";

export const ALLOWED_FILE_TYPES: readonly string[] = ["application/pdf", "image/jpeg", "image/png"];

/** Detect file type from magic bytes (never trust client-declared MIME). */
export function detectFileType(buf: Uint8Array): AllowedFileType | null {
    if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) {
        return "application/pdf";
    }
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return "image/jpeg";
    }
    if (
        buf.length >= 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) {
        return "image/png";
    }
    return null;
}

export function sanitizeFileName(name: string, maxLen = 100): string {
    const cleaned = String(name ?? "")
        .replace(/[^a-z0-9._-]/gi, "_")
        .replace(/^\.+/, "")
        .slice(0, maxLen);
    return cleaned || "file";
}

/** Safe `Content-Disposition` header value (ASCII-only filename, no quotes). */
export function contentDispositionInline(name: string, disposition: "inline" | "attachment" = "inline"): string {
    const safe = sanitizeFileName(name).replace(/["\\]/g, "");
    return `${disposition}; filename="${safe}"`;
}

/** Reject path segments that could traverse the storage namespace. */
export function isSafePathSegment(segment: string): boolean {
    return !!segment && !segment.includes("/") && !segment.includes("\\") && !segment.includes("..") && !segment.includes("\0");
}

/**
 * Build a safe download response for a stored receipt blob. Content type is
 * derived from magic bytes; anything unrecognised is forced to a download.
 */
export async function buildReceiptResponse(blob: Blob, fileName: string): Promise<Response> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const detected = detectFileType(bytes);
    const headers: Record<string, string> = {
        "Content-Type": detected ?? "application/octet-stream",
        "Content-Disposition": contentDispositionInline(fileName, detected ? "inline" : "attachment"),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
    };
    return new Response(bytes, { headers });
}
