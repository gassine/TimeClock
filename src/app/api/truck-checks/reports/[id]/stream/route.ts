import { NextResponse } from 'next/server';

// Global memory Map to hold active SSE connections for Truck Check Reports.
// In a serverless environment (Vercel) this lives per isolated lambda warm boot, which may limit massive scaling,
// but for a Node.js/Docker VPS deployment (as this app runs on DigitalOcean), memory maps maintain persistent
// stream controllers for all connected clients.
export const reportStreams = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Add a new client to the stream pool a specific report
 */
export function addClient(reportId: string, controller: ReadableStreamDefaultController) {
    if (!reportStreams.has(reportId)) {
        reportStreams.set(reportId, new Set());
    }
    reportStreams.get(reportId)?.add(controller);
}

/**
 * Remove a client from the pool
 */
export function removeClient(reportId: string, controller: ReadableStreamDefaultController) {
    const clients = reportStreams.get(reportId);
    if (clients) {
        clients.delete(controller);
        if (clients.size === 0) {
            reportStreams.delete(reportId);
        }
    }
}

/**
 * Broadcast an update event (a JSON string) to all clients currently viewing a report
 */
export function broadcastToReport(reportId: string, data: any) {
    const clients = reportStreams.get(reportId);
    if (!clients) return;

    const encoder = new TextEncoder();
    const eventString = `data: ${JSON.stringify(data)}\n\n`;

    clients.forEach(controller => {
        try {
            controller.enqueue(encoder.encode(eventString));
        } catch (error) {
            // Stale or closed connection
            removeClient(reportId, controller);
        }
    });
}

// NextJS Web Streams Route
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id: reportId } = await context.params;

    const stream = new ReadableStream({
        start(controller) {
            addClient(reportId, controller);

            // Send an initial ping to establish connection
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`event: connected\ndata: {"status": "connected"}\n\n`));
        },
        cancel(controller) {
            removeClient(reportId, controller);
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
