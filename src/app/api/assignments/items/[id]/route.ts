import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { task, notes, assignedTo } = body;

        const updatedItem = await prisma.assignmentItem.update({
            where: { id },
            data: {
                task: task !== undefined ? task : undefined,
                notes: notes !== undefined ? notes : undefined,
                assignedTo: assignedTo !== undefined ? JSON.stringify(assignedTo) : undefined,
            }
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("Failed to update assignment item:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.assignmentItem.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete assignment item:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}
