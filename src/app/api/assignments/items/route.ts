import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { categoryId, task, notes, assignedTo } = body;

        if (!categoryId || !task) {
            return NextResponse.json({ error: "categoryId and task are required" }, { status: 400 });
        }

        const item = await prisma.assignmentItem.create({
            data: {
                categoryId,
                task,
                notes: notes || null,
                assignedTo: assignedTo ? JSON.stringify(assignedTo) : "[]",
            }
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("Failed to create assignment item:", error);
        return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }
}
