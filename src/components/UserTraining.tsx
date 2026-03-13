'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, MessageSquare, Pin, Calendar, Edit2, Trash2, Loader2, ArrowLeft, Plus } from 'lucide-react';
import { TrainingCategory, TrainingPost, TrainingReply } from '@/types/training';
import RichTextEditor from './RichTextEditor';

export default function UserTraining({ currentUser }: { currentUser: any }) {
    const [categories, setCategories] = useState<TrainingCategory[]>([]);
    const [posts, setPosts] = useState<TrainingPost[]>([]);
    const [activeCategory, setActiveCategory] = useState<TrainingCategory | null>(null);
    const [activePost, setActivePost] = useState<TrainingPost | null>(null);

    // State for viewing/creating
    const [loading, setLoading] = useState(true);
    const [isComposing, setIsComposing] = useState(false);

    // Form State
    const [composeTitle, setComposeTitle] = useState('');
    const [composeContent, setComposeContent] = useState('');
    const [replyContent, setReplyContent] = useState('');

    useEffect(() => {
        fetchCategories();
        const interval = setInterval(fetchCategories, 30000);
        return () => clearInterval(interval);
    }, []);

    // Auto-refresh posts when a category is selected
    useEffect(() => {
        if (!activeCategory) return;
        const interval = setInterval(() => {
            fetchPostsForCategory(activeCategory.id);
        }, 30000);
        return () => clearInterval(interval);
    }, [activeCategory]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/training/categories');
            if (res.ok) setCategories(await res.json());
        } catch (error) {
            console.error('Failed to load training categories', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPostsForCategory = async (categoryId?: string) => {
        try {
            if (categoryId === 'drafts') {
                const url = `/api/training/posts?isDraft=true`;
                const res = await fetch(url);
                if (res.ok) setPosts(await res.json());
                return;
            }

            const url = categoryId
                ? `/api/training/posts?categoryId=${categoryId}`
                : `/api/training/posts`;
            const res = await fetch(url);
            if (res.ok) setPosts(await res.json());
        } catch (error) {
            console.error('Failed to load posts', error);
        }
    };

    const fetchPostDetails = async (post: TrainingPost) => {
        setActivePost(post);
        // Mark as read immediately when opened
        if (post.isUnread) {
            try {
                await fetch(`/api/training/posts/${post.id}/read`, { method: 'POST' });
                // Optimistically clear the unread UI status
                setPosts(posts.map(p => p.id === post.id ? { ...p, isUnread: false } : p));

                // Also trigger a background fetch for replies
                const repliesRes = await fetch(`/api/training/posts/${post.id}/replies`);
                if (repliesRes.ok) {
                    const replies = await repliesRes.json();
                    setActivePost({ ...post, isUnread: false, replies: replies });
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            // Already read, just fetch replies
            try {
                const repliesRes = await fetch(`/api/training/posts/${post.id}/replies`);
                if (repliesRes.ok) {
                    const replies = await repliesRes.json();
                    setActivePost({ ...post, replies: replies });
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Extract /uploads/training/ URLs from HTML for orphan cleanup
    const extractTrainingUrls = (html: string): string[] => {
        const matches = [...html.matchAll(/(?:src|href)="(\/uploads\/training\/[^"]+)"/g)];
        return matches.map(m => m[1]);
    };

    const deleteOrphanFiles = async (oldContent: string, newContent: string) => {
        const oldUrls = extractTrainingUrls(oldContent);
        const newUrls = new Set(extractTrainingUrls(newContent));
        const orphans = oldUrls.filter(url => !newUrls.has(url));
        for (const url of orphans) {
            const filename = url.split('/').pop();
            if (filename) {
                await fetch(`/api/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' }).catch(() => {});
            }
        }
    };

    const handleCreatePost = async (e: React.FormEvent, isDraft: boolean = false) => {
        e.preventDefault();
        if (!activeCategory) {
            alert("No category selected.");
            return;
        }
        if (!composeTitle.trim() || !composeContent.trim() || composeContent === '<p></p>') {
            alert("Please fill out both the title and the content before submitting.");
            return;
        }

        try {
            const isEditing = activePost !== null;
            const method = isEditing ? 'PUT' : 'POST';

            const payload: any = {
                title: composeTitle,
                content: composeContent,
                status: isDraft ? 'DRAFT' : 'ACTIVE',
            };

            if (!isEditing) {
                payload.categoryId = activeCategory.id;
            } else {
                payload.id = activePost.id;
                // Delete files that were removed during editing
                await deleteOrphanFiles(activePost.content, composeContent);
            }

            const res = await fetch('/api/training/posts', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsComposing(false);
                setComposeTitle('');
                setComposeContent('');
                setActivePost(null); // Clear loaded post editor

                // If they saved a draft while in drafts view, reload drafts. 
                // Otherwise reload the active category.
                if (activeCategory.id === 'drafts' && !isDraft) {
                    // They just published a draft. We might want to switch them out of drafts?
                    // For now just reload drafts (it will disappear from the list).
                    fetchPostsForCategory('drafts');
                } else {
                    fetchPostsForCategory(activeCategory.id);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Failed to save post. Server responded with: ${res.status} ${errData.error || ''}`);
            }
        } catch (error) {
            console.error('Failed to save post', error);
            alert("Network error occurred while saving post.");
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePost || !replyContent) return;

        try {
            const res = await fetch(`/api/training/posts/${activePost.id}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: replyContent })
            });

            if (res.ok) {
                const newReply = await res.json();
                setActivePost({
                    ...activePost,
                    replies: [...(activePost as any).replies || [], newReply]
                });
                setReplyContent('');
            }
        } catch (error) {
            console.error('Failed to post reply', error);
        }
    };

    // Calculate if user can post in the currently active category
    const canPostInActiveCategory = () => {
        if (!activeCategory) return false;
        if (currentUser.isAdmin) return true;
        try {
            const allowed = JSON.parse(activeCategory.postRoles || '[]');
            if (allowed.includes('EVERYONE')) return true;
            if (allowed.includes('ADMIN_ONLY')) return false;
            return allowed.includes(currentUser.roleId);
        } catch {
            return false;
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    // ----- FULL POST VIEW -----
    if (activePost && !isComposing) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={() => setActivePost(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to {activeCategory?.name || 'Posts'}
                </button>

                <article className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden relative">
                    <div className="p-6 md:p-8 border-b border-slate-700 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold tracking-wider px-2 py-1 rounded bg-slate-700 text-slate-300">
                                    {activeCategory?.name || activePost.category?.name || 'Draft'}
                                </span>
                                {activePost.isPinned && <span className="text-xs flex items-center gap-1 font-bold tracking-wider px-2 py-1 rounded bg-amber-500/20 text-amber-500"><Pin className="w-3 h-3" /> Pinned</span>}
                            </div>

                            {(currentUser.isAdmin || activePost.authorId === currentUser.id) && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setComposeTitle(activePost.title);
                                            setComposeContent(activePost.content);
                                            // Ensure Active Category matches the post being edited, even if accessed from Drafts
                                            if (activePost.category && activeCategory?.id === 'drafts') {
                                                setActiveCategory(activePost.category);
                                            }
                                            setIsComposing(true);
                                        }}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                                        title="Edit Post"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Are you sure you want to delete this post?')) return;
                                            try {
                                                const res = await fetch(`/api/training/posts?id=${activePost.id}`, { method: 'DELETE' });
                                                if (res.ok) {
                                                    setActivePost(null);
                                                    fetchPostsForCategory(activeCategory?.id);
                                                } else {
                                                    alert('Failed to delete post');
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                alert('Network error deleting post');
                                            }
                                        }}
                                        className="p-2 bg-red-900/30 hover:bg-red-600 rounded-lg text-red-400 hover:text-white transition-colors"
                                        title="Delete Post"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold">{activePost.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1"><Edit2 className="w-4 h-4" /> {activePost.author?.name}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(activePost.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 text-slate-200">
                        <PostContent content={activePost.content} />
                    </div>
                </article>

                {/* REPLIES SECTION */}
                {activePost.allowReplies && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                            Discussion
                            <span className="text-slate-500 font-normal ml-2">({((activePost as any).replies || []).length})</span>
                        </h3>

                        <div className="space-y-4">
                            {((activePost as any).replies || []).map((reply: any) => (
                                <div key={reply.id} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-blue-400">{reply.author?.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">{new Date(reply.createdAt).toLocaleString()}</span>
                                            {(currentUser.isAdmin || reply.authorId === currentUser.id) && (
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Are you sure you want to delete this reply?')) return;
                                                        try {
                                                            const res = await fetch(`/api/training/posts/${activePost.id}/replies?id=${reply.id}`, { method: 'DELETE' });
                                                            if (res.ok) {
                                                                setActivePost({
                                                                    ...activePost,
                                                                    replies: ((activePost as any).replies || []).filter((r: any) => r.id !== reply.id)
                                                                });
                                                            }
                                                        } catch (e) {
                                                            console.error('Failed to delete reply', e);
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                                                    title="Delete Reply"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-slate-300 text-sm whitespace-pre-wrap">{reply.content}</div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Form */}
                        <form onSubmit={handleReply} className="bg-slate-800 rounded-xl p-4 border border-slate-700 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                            <textarea
                                required
                                placeholder="Write a reply..."
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 outline-none resize-y min-h-[80px] text-slate-200"
                            />
                            <div className="flex justify-end mt-2 pt-2 border-t border-slate-700">
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                                    Post Reply
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    // ----- POST COMPOSITION FORM -----
    if (isComposing) {
        const editorKey = activePost ? activePost.id : 'new';
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={() => setIsComposing(false)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Cancel
                </button>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Edit2 className="text-blue-400" />
                        {activePost ? 'Edit Post' : <>New Post in <span className="text-slate-400 font-normal">{activeCategory?.name}</span></>}
                    </h2>
                    <form className="space-y-4">
                        <div>
                            <input
                                required
                                placeholder="Enter a descriptive title..."
                                value={composeTitle}
                                onChange={e => setComposeTitle(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                            />
                        </div>
                        <div>
                            <RichTextEditor
                                key={editorKey}
                                content={composeContent}
                                onUpdate={setComposeContent}
                                placeholder="Write your content here. Use the toolbar to format text, insert images, or attach files."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                type="button"
                                onClick={(e) => handleCreatePost(e, true)}
                                className="px-6 py-2 rounded-xl font-medium border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                                Save as Draft
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleCreatePost(e, false)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg transition-colors"
                            >
                                Publish Post
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // ----- CATEGORY & POST LIST VIEW -----
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">

            {/* Sidebar Navigation */}
            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                    Knowledge Base
                    {/* Simplified global unread badge if needed */}
                </h3>
                <button
                    onClick={() => {
                        setActiveCategory({
                            id: 'drafts',
                            name: 'My Drafts',
                            description: 'Unpublished posts that only you can see.',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            isAdminOnly: false,
                            isEveryone: false,
                            isActive: true,
                            isDeleted: false,
                            viewRoles: '[]',
                            postRoles: '[]',
                            order: 0
                        });
                        fetchPostsForCategory('drafts');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-4 border border-dashed ${activeCategory?.id === 'drafts'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Edit2 className={`w-5 h-5 ${activeCategory?.id === 'drafts' ? 'text-blue-300' : 'text-slate-500'}`} />
                        <span className="font-medium text-left">My Drafts</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${activeCategory?.id === 'drafts' ? 'opacity-100' : 'opacity-0'}`} />
                </button>

                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            setActiveCategory(cat);
                            fetchPostsForCategory(cat.id);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-2 ${activeCategory?.id === cat.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen className={`w-5 h-5 ${activeCategory?.id === cat.id ? 'text-blue-300' : 'text-slate-500'}`} />
                            <span className="font-medium text-left">{cat.name}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${activeCategory?.id === cat.id ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                ))}

                {categories.length === 0 && (
                    <div className="text-sm text-slate-500 px-3 py-4 text-center border border-dashed border-slate-700 rounded-xl">
                        No training materials or categories are available for your role at this time.
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col">
                {activeCategory ? (
                    <>
                        <div className="p-6 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4 bg-slate-800/30">
                            <div>
                                <h2 className="text-2xl font-bold">{activeCategory.name}</h2>
                                {activeCategory.description && <p className="text-slate-400 mt-1">{activeCategory.description}</p>}
                            </div>
                            {canPostInActiveCategory() && (
                                <button
                                    onClick={() => setIsComposing(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" /> Create Post
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {posts.length === 0 ? (
                                <div className="text-center py-16 text-slate-500">
                                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg">This category is currently empty.</p>
                                </div>
                            ) : (
                                posts.map(post => (
                                    <button
                                        key={post.id}
                                        onClick={() => fetchPostDetails(post)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col md:flex-row gap-4 items-start md:items-center hover:scale-[1.01] ${post.isUnread
                                            ? 'bg-slate-800 border-blue-500/30 shadow-md'
                                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {post.isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                                                {post.isPinned && <Pin className="w-4 h-4 text-amber-500 shrink-0" />}
                                                <h3 className={`font-bold truncate text-lg ${post.isUnread ? 'text-white' : 'text-slate-300'}`}>
                                                    {post.title}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pl-4">
                                                <span className="flex items-center gap-1"><Edit2 className="w-3 h-3" /> {post.author?.name}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-2 pr-2">
                                            <span className="flex items-center gap-1.5 text-xs font-bold bg-slate-900/50 px-3 py-1.5 rounded-full text-slate-400">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {post._count?.replies || 0}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                        <BookOpen className="w-20 h-20 mb-6 opacity-10" />
                        <h2 className="text-2xl font-bold text-slate-400 mb-2">Knowledge Base</h2>
                        <p className="text-center max-w-md">
                            Select a category from the sidebar to view standard operating procedures, guidelines, and active discussions.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Renders post content with image lightbox support
function PostContent({ content }: { content: string }) {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const isHtml = content.trimStart().startsWith('<');

    return (
        <>
            {isHtml ? (
                <div
                    className="post-content"
                    dangerouslySetInnerHTML={{ __html: processContent(content) }}
                    onClick={e => {
                        const t = e.target as HTMLElement;
                        if (t.tagName === 'IMG') setLightboxSrc((t as HTMLImageElement).src);
                    }}
                />
            ) : (
                <div className="post-content">
                    <p className="whitespace-pre-wrap">{content}</p>
                </div>
            )}

            {lightboxSrc && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-6 cursor-zoom-out"
                    onClick={() => setLightboxSrc(null)}
                >
                    <img
                        src={lightboxSrc}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </>
    );
}

// Convert YouTube/Vimeo anchor tags to embedded iframes
function processContent(html: string): string {
    return html
        .replace(
            /<a[^>]*href="https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:[^"]*&amp;)?v=|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"]*"[^>]*>.*?<\/a>/gi,
            (_m, id) => `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
        )
        .replace(
            /<a[^>]*href="https?:\/\/(?:www\.)?vimeo\.com\/(\d+)[^"]*"[^>]*>.*?<\/a>/gi,
            (_m, id) => `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${id}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`
        );
}
