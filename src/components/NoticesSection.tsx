'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Pin, PinOff, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Notice = {
    id: string;
    text: string;
    isPinned: boolean;
    order: number;
    createdAt: string;
    authorId: string;
    author: { name: string };
};

type NoticeSettings = {
    everyoneCanPost: boolean;
    everyoneCanDelete: boolean;
};

type NoticesSectionProps = {
    user: { id: string; name: string; isAdmin: boolean };
};

function SortableNoticeItem({ notice, onDelete, onPinToggle, canDelete, isAdmin }: { notice: Notice, onDelete: (id: string) => void, onPinToggle: (id: string, isPinned: boolean) => void, canDelete: boolean, isAdmin: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: notice.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-start gap-3 p-3 rounded-lg border shadow-sm transition-colors ${notice.isPinned ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-slate-800 border-slate-700'}`}>
            {isAdmin && (
                <div {...attributes} {...listeners} className="mt-1 cursor-grab text-slate-500 hover:text-slate-300">
                    <GripVertical className="w-5 h-5" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-200">{notice.author.name}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                        {format(new Date(notice.createdAt), 'MM/dd/yyyy h:mm a')}
                    </span>
                    {notice.isPinned && <span className="text-xs font-bold text-yellow-500 ml-2 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Pinned</span>}
                </div>
                <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{notice.text}</p>
            </div>

            <div className="flex items-center gap-2 ml-4 shrink-0">
                {isAdmin && (
                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onPinToggle(notice.id, !notice.isPinned);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${notice.isPinned ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-700'}`}
                        title={notice.isPinned ? "Unpin Notice" : "Pin Notice"}
                    >
                        {notice.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                )}
                {canDelete && (
                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onDelete(notice.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-700 transition-colors"
                        title="Delete Notice"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function NoticesSection({ user }: NoticesSectionProps) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [settings, setSettings] = useState<NoticeSettings>({ everyoneCanPost: false, everyoneCanDelete: false });
    const [newNoticeText, setNewNoticeText] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchNoticesAndSettings();
    }, []);

    const fetchNoticesAndSettings = async () => {
        try {
            const [noticesRes, settingsRes] = await Promise.all([
                fetch('/api/notices'),
                fetch('/api/notices/settings')
            ]);

            if (noticesRes.ok) {
                const data = await noticesRes.json();
                setNotices(data);
            }
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch notices/settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoticeText.trim()) return;

        setIsPosting(true);
        try {
            const res = await fetch('/api/notices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newNoticeText, isPinned: false, order: notices.length })
            });

            if (res.ok) {
                setNewNoticeText('');
                fetchNoticesAndSettings();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to post notice');
            }
        } catch (error) {
            console.error('Failed to post notice:', error);
            alert('Failed to post notice');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeleteNotice = (id: string) => {
        setNoticeToDelete(id);
    };

    const confirmDeleteAction = async () => {
        if (!noticeToDelete) return;

        const id = noticeToDelete;
        setNoticeToDelete(null); // optimistic UI close

        try {
            const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotices(notices.filter(n => n.id !== id));
            } else {
                const data = await res.json();
                console.error(data.error || 'Failed to delete notice');
                // Use alert fallback only if necessary
                try { alert(data.error || 'Failed to delete notice'); } catch (e) { }
            }
        } catch (error) {
            console.error('Failed to delete notice:', error);
        }
    };

    const handlePinToggle = async (id: string, isPinned: boolean) => {
        try {
            const res = await fetch(`/api/notices/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPinned })
            });

            if (res.ok) {
                fetchNoticesAndSettings();
            }
        } catch (error) {
            console.error('Failed to update pin status:', error);
        }
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = notices.findIndex(n => n.id === active.id);
            const newIndex = notices.findIndex(n => n.id === over.id);

            const newNoticesArray = arrayMove(notices, oldIndex, newIndex);

            // Re-assign order values based on array position
            // We only reorder within unpinned or pinned groups visually, but API handles global order
            const updatedNotices = newNoticesArray.map((not, index) => ({
                ...not,
                order: index
            }));

            setNotices(updatedNotices);

            try {
                // Send the new order to the backend
                await fetch('/api/notices', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notices: updatedNotices.map(n => ({ id: n.id, order: n.order }))
                    })
                });
            } catch (error) {
                console.error('Failed to update notice order:', error);
                alert('Order change save failed, reloading original order...');
                fetchNoticesAndSettings(); // Revert on failure
            }
        }
    };

    const canPost = user.isAdmin || settings.everyoneCanPost;

    if (loading) return null; // Don't show anything while determining Auth

    // Only show the section if there are notices OR if the user is allowed to post a notice
    if (notices.length === 0 && !canPost) {
        return null;
    }

    return (
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 md:p-6 mb-8 w-full backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3">
                <ShieldAlert className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">Important Notices</h2>
            </div>

            {notices.length > 0 && (
                <div className="space-y-3 mb-6">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={notices.map(n => n.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {notices.map(notice => (
                                <SortableNoticeItem
                                    key={notice.id}
                                    notice={notice}
                                    onDelete={handleDeleteNotice}
                                    onPinToggle={handlePinToggle}
                                    canDelete={user.isAdmin || settings.everyoneCanDelete || notice.authorId === user.id}
                                    isAdmin={user.isAdmin}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            )}

            {canPost && (
                <form onSubmit={handlePostNotice} className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Post a new notice</label>
                            <textarea
                                value={newNoticeText}
                                onChange={(e) => setNewNoticeText(e.target.value)}
                                placeholder="Type your announcement here..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none min-h-[44px]"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePostNotice(e as any);
                                    }
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isPosting || !newNoticeText.trim()}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[44px]"
                        >
                            {isPosting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            )}

            {noticeToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold text-slate-200">Delete Notice</h3>
                        </div>
                        <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                            This notice will be permanently deleted and removed from everyone's dashboard.
                            Are you sure you want to proceed?
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setNoticeToDelete(null)}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteAction}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                            >
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
