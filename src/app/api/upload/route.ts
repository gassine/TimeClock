import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file received' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Clean up the filename and add a UUID to prevent collisions
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
        const filename = `${uuidv4()}-${originalName}`;

        // Ensure the directory exists (Next.js public folder)
        // Adjust the path to properly locate the /public/uploads directory from the api route
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return the public URL that can be used directly in the src attribute
        const fileUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: fileUrl });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
