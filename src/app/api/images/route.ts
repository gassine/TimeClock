import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        let files: string[] = [];
        try {
            files = await readdir(uploadDir);
        } catch (dirErr: any) {
            if (dirErr.code === 'ENOENT') {
                return NextResponse.json({ images: [] });
            }
            throw dirErr;
        }

        const images = [];

        for (const file of files) {
            // Ignore non-files or hidden files if needed
            if (file.startsWith('.')) continue;

            const filePath = path.join(uploadDir, file);
            const fileStat = await stat(filePath);

            if (fileStat.isFile()) {
                images.push({
                    name: file,
                    url: `/uploads/${file}`,
                    size: fileStat.size,
                    createdAt: fileStat.birthtime.toISOString()
                });
            }
        }

        // Sort images by newest first
        images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error listing images:', error);
        return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        // Prevent directory traversal attacks
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

        try {
            await unlink(filepath);
        } catch (unlinkErr: any) {
            if (unlinkErr.code === 'ENOENT') {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            throw unlinkErr;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
}
