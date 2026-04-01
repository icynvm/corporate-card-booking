import { NextRequest, NextResponse } from "next/server";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { RequestService } from "@/services/request.service";
import { CreateRequestSchema, RequestQuerySchema } from "@/lib/validations/schemas";
import { RequestStatus } from "@/types/enums";

/**
 * Controller-level logic for managing corporate card requests.
 * Uses RequestService to handle complex business rules and side effects.
 */

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function GET(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        
        // Parse and validate query params
        const query = RequestQuerySchema.parse({
            status: searchParams.get("status") || undefined,
            billingType: searchParams.get("billingType") || undefined,
        });

        // Role-based scope filtering
        const userId = (session.role !== "admin" && session.role !== "manager") 
            ? session.pid 
            : undefined;

        const data = await RequestService.getRequests({ ...query, userId });
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[GET /api/requests] Failed:", error);
        return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const validatedData = CreateRequestSchema.parse(body);

        const request = await RequestService.createRequest(session.pid, validatedData);
        
        return NextResponse.json(request, { status: 201 });
    } catch (error: any) {
        console.error("[POST /api/requests] Failed:", error);
        
        if (error.name === "ZodError") {
            return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
        }

        return NextResponse.json(
            { error: error.message || "Failed to create request" }, 
            { status: 500 }
        );
    }
}
