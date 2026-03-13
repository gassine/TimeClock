import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {

        const categories = await prisma.assignmentCategory.findMany({
            include: {
                items: {
                    orderBy: { order: 'asc' }
                },
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error("Failed to fetch assignment categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, date, endDate } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const category = await prisma.assignmentCategory.create({
            data: {
                name,
                date: date ? new Date(date + 'T12:00:00.000Z') : null,
                endDate: endDate ? new Date(endDate + 'T12:00:00.000Z') : null,
            },
            include: {
                items: true,
            }
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error("Failed to create assignment category:", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}
