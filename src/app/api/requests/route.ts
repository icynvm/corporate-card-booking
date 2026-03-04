import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch all requests
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const projectId = searchParams.get("projectId");
        const billingType = searchParams.get("billingType");

        const where: Record<string, string> = {};
        if (status) where.status = status;
        if (projectId) where.projectId = projectId;
        if (billingType) where.billingType = billingType;

        const requests = await prisma.request.findMany({
            where,
            include: {
                user: true,
                project: true,
                receipts: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Failed to fetch requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch requests" },
            { status: 500 }
        );
    }
}

// POST: Create a new request
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Generate Event ID: REQ-YYYY-XXXX
        const year = new Date().getFullYear();
        const count = await prisma.request.count({
            where: {
                eventId: { startsWith: `REQ-${year}` },
            },
        });
        const eventId = `REQ-${year}-${String(count + 1).padStart(4, "0")}`;

        // For demo: use or create a default user
        let user = await prisma.user.findFirst({
            where: { email: "employee@company.com" },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: body.fullName,
                    email: "employee@company.com",
                    department: body.department,
                    role: "USER",
                },
            });
        }

        const request = await prisma.request.create({
            data: {
                eventId,
                userId: user.id,
                projectId: body.projectId,
                amount: parseFloat(body.amount),
                objective: body.objective,
                contactNo: body.contactNo,
                billingType: body.billingType,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
                promotionalChannels: body.promotionalChannels || [],
                status: "PENDING",
            },
            include: {
                user: true,
                project: true,
            },
        });

        // Deduct from project budget
        await prisma.project.update({
            where: { id: body.projectId },
            data: {
                remainingBudget: {
                    decrement: parseFloat(body.amount),
                },
            },
        });

        return NextResponse.json(request, { status: 201 });
    } catch (error) {
        console.error("Failed to create request:", error);
        return NextResponse.json(
            { error: "Failed to create request" },
            { status: 500 }
        );
    }
}
