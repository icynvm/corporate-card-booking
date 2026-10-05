// Node runtime only (uses node:crypto). Do not import from middleware.
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number, keyLen: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, keyLen, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => {
            if (err) reject(err);
            else resolve(key);
        });
    });
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_LEN);
    const key = await scryptAsync(password, salt, N, R, P, KEY_LEN);
    return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(
    password: string,
    stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
    if (typeof stored !== "string" || !stored) return { valid: false, needsRehash: false };

    if (stored.startsWith("scrypt$")) {
        const parts = stored.split("$");
        if (parts.length !== 6) return { valid: false, needsRehash: false };
        const n = Number(parts[1]);
        const r = Number(parts[2]);
        const p = Number(parts[3]);
        if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
            return { valid: false, needsRehash: false };
        }
        try {
            const salt = Buffer.from(parts[4], "base64");
            const expected = Buffer.from(parts[5], "base64");
            if (expected.length === 0) return { valid: false, needsRehash: false };
            const actual = await scryptAsync(password, salt, n, r, p, expected.length);
            const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
            const needsRehash = valid && (n !== N || r !== R || p !== P || expected.length !== KEY_LEN);
            return { valid, needsRehash };
        } catch {
            return { valid: false, needsRehash: false };
        }
    }

    if (/^[0-9a-f]{64}$/i.test(stored)) {
        const legacySecret = process.env.APPROVAL_SECRET || "dev-session-secret-key-2024";
        const computed = createHash("sha256").update(password + legacySecret).digest();
        const expected = Buffer.from(stored, "hex");
        const valid = computed.length === expected.length && timingSafeEqual(computed, expected);
        return { valid, needsRehash: valid };
    }

    return { valid: false, needsRehash: false };
}
