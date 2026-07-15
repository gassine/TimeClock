import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { addNoticeStreamClient, removeNoticeStreamClient } from '@/lib/noticeStreams';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (streamController) removeNoticeStreamClient(streamController);
        heartbeat = null;
        streamController = null;
    };

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            streamController = controller;
            addNoticeStreamClient(controller);

            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': keep-alive\n\n'));
                } catch {
                    cleanup();
                }
            }, 20000);

            request.signal.addEventListener('abort', cleanup, { once: true });
        },
        cancel() {
            cleanup();
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Content-Encoding': 'none'
        }
    });
}
