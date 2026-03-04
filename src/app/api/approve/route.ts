import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");
        const action = searchParams.get("action");

        if (!token || !action) {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=Invalid+link", req.url)
            );
        }

        if (action !== "approve" && action !== "reject") {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=Invalid+action", req.url)
            );
        }

        // Find request by approval token
        const request = await prisma.request.findUnique({
            where: { approvalToken: token },
            include: { user: true, project: true },
        });

        if (!request) {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=Request+not+found+or+link+expired", req.url)
            );
        }

        // Check if token has expired
        if (request.approvalTokenExpiry && new Date() > request.approvalTokenExpiry) {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=This+approval+link+has+expired", req.url)
            );
        }

        // Check if already processed
        if (request.status !== "PENDING") {
            return NextResponse.redirect(
                new URL(
                    `/approval-result?status=info&message=This+request+has+already+been+${request.status.toLowerCase()}&eventId=${request.eventId}`,
                    req.url
                )
            );
        }

        // Update request status
        const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

        await prisma.request.update({
            where: { id: request.id },
            data: {
                status: newStatus,
                approvalToken: null, // Invalidate token
                approvalTokenExpiry: null,
            },
        });

        // If rejected, refund the budget
        if (newStatus === "REJECTED") {
            await prisma.project.update({
                where: { id: request.projectId },
                data: {
                    remainingBudget: {
                        increment: request.amount,
                    },
                },
            });
        }

        return NextResponse.redirect(
            new URL(
                `/approval-result?status=success&action=${action}&eventId=${request.eventId}&requester=${encodeURIComponent(request.user.name)}&amount=${request.amount}`,
                req.url
            )
        );
    } catch (error) {
        console.error("Approval error:", error);
        return NextResponse.redirect(
            new URL("/approval-result?status=error&message=An+unexpected+error+occurred", req.url)
        );
    }
}
