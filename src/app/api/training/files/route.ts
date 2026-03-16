import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';

const TRAINING_DIR = path.join(process.cwd(), 'public', 'uploads', 'training');

export async function GET() {
    try {
        let filenames: string[] = [];
        try {
            filenames = await readdir(TRAINING_DIR);
        } catch (e: any) {
            if (e.code === 'ENOENT') return NextResponse.json([]);
            throw e;
        }

        // Load only non-deleted post content to determine which files are in use
        const posts = await prisma.trainingPost.findMany({
            where: { isDeleted: false },
            select: { content: true },
        });
        const allContent = posts.map(p => p.content).join('\n');

        const fileEntries = await Promise.all(
            filenames
                .filter(f => !f.startsWith('.'))
                .map(async (name) => {
                    const filePath = path.join(TRAINING_DIR, name);
                    const fileStat = await stat(filePath);
                    if (!fileStat.isFile()) return null;
                    const url = `/uploads/training/${name}`;
                    return {
                        name,
                        url,
                        size: fileStat.size,
                        createdAt: fileStat.birthtime.toISOString(),
                        inUse: allContent.includes(url),
                    };
                })
        );

        const files = fileEntries
            .filter(Boolean)
            .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

        return NextResponse.json(files);
    } catch (error) {
        console.error('Error listing training files:', error);
        return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) return NextResponse.json({ error: 'Filename required' }, { status: 400 });

        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const filepath = path.join(TRAINING_DIR, filename);

        try {
            await unlink(filepath);
        } catch (e: any) {
            if (e.code === 'ENOENT') return NextResponse.json({ error: 'File not found' }, { status: 404 });
            throw e;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting training file:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
