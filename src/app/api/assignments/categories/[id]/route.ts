import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, date, endDate } = body;

        const updatedCategory = await prisma.assignmentCategory.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                date: date ? new Date(date) : date === null ? null : undefined,
                endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined,
            },
            include: {
                items: true,
            }
        });

        return NextResponse.json(updatedCategory);
    } catch (error) {
        console.error("Failed to update assignment category:", error);
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.assignmentCategory.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete assignment category:", error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
