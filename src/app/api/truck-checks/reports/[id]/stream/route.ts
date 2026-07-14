import { NextResponse } from 'next/server';
import { addReportStreamClient, removeReportStreamClient } from '@/lib/truckCheckStreams';

// NextJS Web Streams Route
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id: reportId } = await context.params;

    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (streamController) removeReportStreamClient(reportId, streamController);
        heartbeat = null;
        streamController = null;
    };

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            streamController = controller;
            addReportStreamClient(reportId, controller);

            // Send an initial ping to establish connection
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`event: connected\ndata: {"status": "connected"}\n\n`));
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
