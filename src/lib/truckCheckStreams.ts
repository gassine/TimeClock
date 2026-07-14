type ReportStreamController = ReadableStreamDefaultController<Uint8Array>;

const globalStreams = globalThis as typeof globalThis & {
    truckCheckReportStreams?: Map<string, Set<ReportStreamController>>;
};

const reportStreams = globalStreams.truckCheckReportStreams ?? new Map<string, Set<ReportStreamController>>();
globalStreams.truckCheckReportStreams = reportStreams;

export function addReportStreamClient(reportId: string, controller: ReportStreamController) {
    const clients = reportStreams.get(reportId) ?? new Set<ReportStreamController>();
    clients.add(controller);
    reportStreams.set(reportId, clients);
}

export function removeReportStreamClient(reportId: string, controller: ReportStreamController) {
    const clients = reportStreams.get(reportId);
    if (!clients) return;
    clients.delete(controller);
    if (clients.size === 0) reportStreams.delete(reportId);
}

export function broadcastToReport(reportId: string, data: unknown) {
    const clients = reportStreams.get(reportId);
    if (!clients) return;

    const payload = new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
    clients.forEach((controller) => {
        try {
            controller.enqueue(payload);
        } catch {
            removeReportStreamClient(reportId, controller);
        }
    });
}
