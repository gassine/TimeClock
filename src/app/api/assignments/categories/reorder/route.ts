import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const items: { id: string; order: number }[] = body;

        await Promise.all(
            items.map(({ id, order }) =>
                prisma.assignmentCategory.update({
                    where: { id },
                    data: { order },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder categories:", error);
        return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 });
    }
}
