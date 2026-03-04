import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const requestId = formData.get("requestId") as string;
        const monthYear = formData.get("monthYear") as string;
        const file = formData.get("file") as File;

        if (!requestId || !monthYear || !file) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // In production, upload to Supabase Storage or S3
        // For now, create a placeholder URL
        const receiptFileUrl = `/uploads/receipts/${requestId}/${monthYear}-${file.name}`;

        // Check if receipt already exists for this month
        const existing = await prisma.receipt.findFirst({
            where: {
                requestId,
                monthYear,
            },
        });

        let receipt;

        if (existing) {
            receipt = await prisma.receipt.update({
                where: { id: existing.id },
                data: {
                    receiptFileUrl,
                    status: "UPLOADED",
                },
            });
        } else {
            receipt = await prisma.receipt.create({
                data: {
                    requestId,
                    monthYear,
                    receiptFileUrl,
                    status: "UPLOADED",
                },
            });
        }

        return NextResponse.json(receipt, { status: 201 });
    } catch (error) {
        console.error("Upload receipt error:", error);
        return NextResponse.json(
            { error: "Failed to upload receipt" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { receiptId, status } = await req.json();

        const receipt = await prisma.receipt.update({
            where: { id: receiptId },
            data: { status },
        });

        return NextResponse.json(receipt);
    } catch (error) {
        console.error("Verify receipt error:", error);
        return NextResponse.json(
            { error: "Failed to update receipt status" },
            { status: 500 }
        );
    }
}
