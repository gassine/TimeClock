import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subfolder = searchParams.get('subfolder') || '';

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file received' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '') || 'file';
        const filename = `${uuidv4()}-${originalName}`;

        // Validate subfolder — no path traversal
        const safeSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');
        const uploadDir = safeSubfolder
            ? path.join(process.cwd(), 'public', 'uploads', safeSubfolder)
            : path.join(process.cwd(), 'public', 'uploads');

        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        const fileUrl = safeSubfolder ? `/uploads/${safeSubfolder}/${filename}` : `/uploads/${filename}`;

        return NextResponse.json({
            url: fileUrl,
            filename,
            originalName: file.name,
            size: file.size,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
