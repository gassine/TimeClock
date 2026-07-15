type NoticeStreamController = ReadableStreamDefaultController<Uint8Array>;

const globalStreams = globalThis as typeof globalThis & {
    noticeStreams?: Set<NoticeStreamController>;
};

const noticeStreams = globalStreams.noticeStreams ?? new Set<NoticeStreamController>();
globalStreams.noticeStreams = noticeStreams;

export function addNoticeStreamClient(controller: NoticeStreamController) {
    noticeStreams.add(controller);
}

export function removeNoticeStreamClient(controller: NoticeStreamController) {
    noticeStreams.delete(controller);
}

export function broadcastNoticeChange(type: 'created' | 'deleted' | 'pinned' | 'reordered' | 'settings') {
    const payload = new TextEncoder().encode(`data: ${JSON.stringify({ type })}\n\n`);

    noticeStreams.forEach((controller) => {
        try {
            controller.enqueue(payload);
        } catch {
            removeNoticeStreamClient(controller);
        }
    });
}
