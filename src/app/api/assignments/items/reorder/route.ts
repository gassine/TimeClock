import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const items: { id: string; order: number }[] = body;

        await Promise.all(
            items.map(({ id, order }) =>
                prisma.assignmentItem.update({
                    where: { id },
                    data: { order },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder items:", error);
        return NextResponse.json({ error: "Failed to reorder items" }, { status: 500 });
    }
}
