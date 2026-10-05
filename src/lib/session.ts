// Session token handling. Uses Web Crypto only, so it works in both the Edge
// runtime (middleware) and Node. Do NOT import Node-only modules here.

const SESSION_COOKIE = "cc_session";

export const SESSION_TTL_SECONDS = 3 * 24 * 60 * 60; // 3 days

const DEV_FALLBACK_SECRET = "INSECURE-DEV-ONLY-SESSION-SECRET-DO-NOT-USE-IN-PRODUCTION";

export type SessionPayload = {
    pid: string;
    email: string;
    role: string;
    name: string;
    department: string;
};

let warnedDevSecret = false;

function getSecret(): string {
    const secret = process.env.SESSION_SECRET || process.env.APPROVAL_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET (or APPROVAL_SECRET) must be set in production");
    }
    if (!warnedDevSecret) {
        warnedDevSecret = true;
        console.warn("[session] SESSION_SECRET is not set; using an insecure dev-only secret.");
    }
    return DEV_FALLBACK_SECRET;
}

function bytesToBase64Url(bytes: Uint8Array): string {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array {
    if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new Error("Invalid base64url");
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function utf8ToBase64Url(s: string): string {
    return bytesToBase64Url(new TextEncoder().encode(s));
}

function base64UrlToUtf8(s: string): string {
    return new TextDecoder().decode(base64UrlToBytes(s));
}

async function importKey(usage: "sign" | "verify"): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(getSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        [usage]
    );
}

export async function createSessionToken(profile: {
    id: string;
    email: string;
    role: string;
    name: string;
    department: string;
}): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const payload = {
        pid: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.name,
        department: profile.department,
        iat,
        exp: iat + SESSION_TTL_SECONDS,
    };
    const payloadPart = utf8ToBase64Url(JSON.stringify(payload));
    const key = await importKey("sign");
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
    return `${payloadPart}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export async function parseSessionToken(token: string): Promise<SessionPayload | null> {
    try {
        if (typeof token !== "string") return null;
        const parts = token.split(".");
        if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
        const [payloadPart, sigPart] = parts;

        const key = await importKey("verify");
        const ok = await crypto.subtle.verify(
            "HMAC",
            key,
            base64UrlToBytes(sigPart) as BufferSource,
            new TextEncoder().encode(payloadPart)
        );
        if (!ok) return null;

        const payload = JSON.parse(base64UrlToUtf8(payloadPart));
        if (!payload || typeof payload !== "object") return null;
        if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
        if (typeof payload.pid !== "string" || !payload.pid) return null;

        return {
            pid: payload.pid,
            email: payload.email,
            role: payload.role,
            name: payload.name,
            department: payload.department,
        };
    } catch (err) {
        // Missing secret in production is a config error; surface it in logs.
        if (err instanceof Error && err.message.startsWith("SESSION_SECRET")) {
            console.error(err.message);
        }
        return null;
    }
}

export function getSessionCookieName() {
    return SESSION_COOKIE;
}

export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    };
}

export function generateOTP(): string {
    // Rejection sampling for a uniform value in [0, 900000)
    const limit = 0x100000000 - (0x100000000 % 900000);
    const buf = new Uint32Array(1);
    do {
        crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return String(100000 + (buf[0] % 900000));
}
