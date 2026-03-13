'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Settings, Eye, AlertTriangle, MessageSquare, Trash2, Edit2, Pin, Archive, Unlock, Lock, RotateCcw, GripVertical, ChevronDown, ChevronRight, HardDrive } from 'lucide-react';
import { TrainingCategory, TrainingPost, TrainingPostVersion } from '@/types/training';
import TrainingFiles from './TrainingFiles';

type Role = { id: string; name: string };

export default function AdminTraining({ roles }: { roles: Role[] }) {
    const [categories, setCategories] = useState<TrainingCategory[]>([]);
    const [posts, setPosts] = useState<TrainingPost[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [viewMode, setViewMode] = useState<'CATEGORIES' | 'MODERATION' | 'FILES'>('CATEGORIES');

    // Category Modal
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<TrainingCategory> | null>(null);

    // Version Modal
    const [viewingVersionsFor, setViewingVersionsFor] = useState<string | null>(null);
    const [versions, setVersions] = useState<TrainingPostVersion[]>([]);

    // Post Preview Modal
    const [viewingPost, setViewingPost] = useState<TrainingPost | null>(null);

    // Drag & Drop
    const dragItem = useRef<string | null>(null);
    const dragOverItem = useRef<string | null>(null);
    const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);

    // Collapsed category groups in Content Moderation
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCategories();
        fetchPosts();
        const catInterval = setInterval(fetchCategories, 30000);
        const postInterval = setInterval(fetchPosts, 30000);
        return () => {
            clearInterval(catInterval);
            clearInterval(postInterval);
        };
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/training/categories');
            if (res.ok) setCategories(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/training/posts');
            if (res.ok) setPosts(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;

        try {
            const url = editingCategory.id ? '/api/training/categories' : '/api/training/categories';
            const method = editingCategory.id ? 'PUT' : 'POST';

            // Normalize JSON arrays
            const payload = {
                ...editingCategory,
                viewRoles: typeof editingCategory.viewRoles === 'string' ? JSON.parse(editingCategory.viewRoles) : editingCategory.viewRoles,
                postRoles: typeof editingCategory.postRoles === 'string' ? JSON.parse(editingCategory.postRoles) : editingCategory.postRoles,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsCategoryModalOpen(false);
                setEditingCategory(null);
                fetchCategories();
            }
        } catch (error) {
            console.error('Failed to save category', error);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to permanently delete the category "${name}"? This will also delete ALL posts and replies within it!`)) return;
        try {
            const res = await fetch(`/api/training/categories?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchCategories();
                fetchPosts(); // Refresh posts since some may have been deleted
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || 'Failed to delete category'}`);
            }
        } catch (error) {
            console.error('Failed to delete category', error);
            alert('Failed to delete category due to a network error.');
        }
    };

    const openCategoryModal = (cat?: TrainingCategory) => {
        if (cat) {
            setEditingCategory(cat);
        } else {
            setEditingCategory({
                name: '',
                description: '',
                isAdminOnly: false,
                isEveryone: true,
                viewRoles: '[]',
                postRoles: '[]'
            });
        }
        setIsCategoryModalOpen(true);
    };

    // ----- POST MODERATION ACTIONS -----
    const updatePostStatus = async (id: string, updates: Partial<TrainingPost>) => {
        try {
            const res = await fetch('/api/training/posts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            });
            if (res.ok) fetchPosts();
        } catch (e) {
            console.error('Post update failed', e);
        }
    };

    const handleViewVersions = async (postId: string) => {
        try {
            const res = await fetch(`/api/training/posts/${postId}/versions`);
            if (res.ok) {
                setVersions(await res.json());
                setViewingVersionsFor(postId);
            }
        } catch (e) {
            console.error('Failed to load versions', e);
        }
    };

    const toggleCategoryCollapse = (catId: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    // Group posts by category for Content Moderation
    const postsByCategory = posts.reduce<Record<string, { categoryName: string; categoryId: string; posts: TrainingPost[] }>>((acc, post) => {
        const catId = post.category?.id || 'uncategorized';
        const catName = post.category?.name || 'Uncategorized';
        if (!acc[catId]) acc[catId] = { categoryName: catName, categoryId: catId, posts: [] };
        acc[catId].posts.push(post);
        return acc;
    }, {});

    const handleDragStart = (e: React.DragEvent, postId: string, categoryId: string) => {
        dragItem.current = postId;
        setDragCategoryId(categoryId);
        // Set a clean drag image — use the whole row element
        e.dataTransfer.effectAllowed = 'move';
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
        // Use the element itself as the drag image for a cleaner look
        e.dataTransfer.setDragImage(target, 20, 20);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';

        // Fire-and-forget: persist the current order to the API
        if (dragCategoryId && postsByCategory[dragCategoryId]) {
            const orderedIds = postsByCategory[dragCategoryId].posts.map(p => p.id);
            fetch('/api/training/posts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderedIds)
            }).catch(err => {
                console.error('Reorder failed', err);
                fetchPosts();
            });
        }

        dragItem.current = null;
        dragOverItem.current = null;
        setDragCategoryId(null);
    };

    const handleDragEnter = (e: React.DragEvent, postId: string, categoryId: string) => {
        e.preventDefault();
        if (!dragItem.current || dragItem.current === postId || dragCategoryId !== categoryId) return;

        // Directly rearrange the posts array for instant visual feedback
        setPosts(prev => {
            const newPosts = [...prev];
            const dragIdx = newPosts.findIndex(p => p.id === dragItem.current);
            const hoverIdx = newPosts.findIndex(p => p.id === postId);
            if (dragIdx < 0 || hoverIdx < 0) return prev;

            // Remove dragged item and insert at hover position
            const [movedItem] = newPosts.splice(dragIdx, 1);
            newPosts.splice(hoverIdx, 0, movedItem);
            return newPosts;
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    if (loading) return <div className="text-center p-8 text-slate-400">Loading Training Module...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Tabs */}
            <div className="flex gap-4 border-b border-slate-700 pb-4">
                <button
                    onClick={() => setViewMode('CATEGORIES')}
                    className={`px-4 py-2 font-medium rounded-lg transition-colors ${viewMode === 'CATEGORIES' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <Settings className="w-4 h-4 inline-block mr-2" />
                    Categories & Permissions
                </button>
                <button
                    onClick={() => setViewMode('MODERATION')}
                    className={`px-4 py-2 font-medium rounded-lg transition-colors ${viewMode === 'MODERATION' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <BookOpen className="w-4 h-4 inline-block mr-2" />
                    Content Moderation
                </button>
                <button
                    onClick={() => setViewMode('FILES')}
                    className={`px-4 py-2 font-medium rounded-lg transition-colors ${viewMode === 'FILES' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <HardDrive className="w-4 h-4 inline-block mr-2" />
                    System Files
                </button>
            </div>

            {/* CATEGORY MANAGER */}
            {viewMode === 'CATEGORIES' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="text-blue-400" />
                            Training Categories
                        </h2>
                        <button
                            onClick={() => openCategoryModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Category
                        </button>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 font-medium">
                                <tr>
                                    <th className="p-4">Category Name</th>
                                    <th className="p-4">Visibility</th>
                                    <th className="p-4">Posting Access</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-700/30">
                                        <td className="p-4 font-medium">
                                            {cat.name}
                                            {cat.description && <div className="text-xs text-slate-500 font-normal mt-1">{cat.description}</div>}
                                        </td>
                                        <td className="p-4">
                                            {cat.isAdminOnly ? <span className="text-purple-400 text-xs font-bold uppercase tracking-wider bg-purple-500/10 px-2 py-1 rounded">Admin Only</span>
                                                : cat.isEveryone ? <span className="text-green-400 text-xs font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded">Everyone</span>
                                                    : <span className="text-blue-400 text-xs font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded">Restricted</span>}
                                        </td>
                                        <td className="p-4 text-xs text-slate-400">
                                            {cat.isAdminOnly ? 'Admins' : cat.isEveryone && JSON.parse(cat.postRoles || '[]').length === 0 ? 'Nobody' : 'Restricted'}
                                        </td>
                                        <td className="p-4">
                                            {cat.isActive ? <span className="text-green-400">Active</span> : <span className="text-red-400">Deactivated</span>}
                                        </td>
                                        <td className="p-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openCategoryModal(cat)}
                                                className="text-slate-400 hover:text-blue-400 p-2 transition-colors"
                                                title="Edit Category"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="text-slate-400 hover:text-red-400 p-2 transition-colors"
                                                title="Delete Category"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            No categories exist yet. Create one to get started!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENT MODERATION */}
            {viewMode === 'MODERATION' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertTriangle className="text-amber-400" />
                        Content Moderation
                    </h2>
                    <p className="text-sm text-slate-400">Posts grouped by category. Drag posts to reorder within a category. Click a post title to preview it.</p>

                    {Object.keys(postsByCategory).length === 0 && <p className="text-slate-400 p-8 text-center bg-slate-800 rounded-xl">No posts exist to moderate yet.</p>}

                    {Object.entries(postsByCategory).map(([catId, group]) => {
                        const isCollapsed = collapsedCategories.has(catId);
                        return (
                            <div key={catId} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategoryCollapse(catId)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {isCollapsed ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        <span className="font-bold text-white text-lg">{group.categoryName}</span>
                                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{group.posts.length} posts</span>
                                    </div>
                                </button>

                                {/* Posts within this category */}
                                {!isCollapsed && (
                                    <div className="border-t border-slate-700 divide-y divide-slate-700/50">
                                        {group.posts.map(post => (
                                            <div
                                                key={post.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, post.id, catId)}
                                                onDragEnter={(e) => handleDragEnter(e, post.id, catId)}
                                                onDragOver={handleDragOver}
                                                onDragEnd={handleDragEnd}
                                                className={`p-4 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center select-none transition-all duration-150 ${dragItem.current === post.id ? 'opacity-50 scale-[0.98] bg-blue-900/20 border-l-2 border-blue-500' : ''} ${post.isDeleted ? 'bg-red-900/10' : post.status === 'ARCHIVED' ? 'bg-slate-800/40' : 'hover:bg-slate-700/20'}`}
                                                style={{ cursor: 'grab' }}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {post.isPinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                                                            <button
                                                                onClick={() => setViewingPost(post)}
                                                                className={`font-bold truncate text-left hover:underline ${post.isDeleted || post.status === 'ARCHIVED' ? 'text-slate-400 line-through' : 'text-white hover:text-blue-400'}`}
                                                            >
                                                                {post.title}
                                                            </button>
                                                            {post.status === 'DRAFT' && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 rounded-full shrink-0">DRAFT</span>}
                                                            {post.status === 'ARCHIVED' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 rounded-full shrink-0">ARCHIVED</span>}
                                                            {post.isDeleted && <span className="text-xs bg-red-500/20 text-red-400 px-2 rounded-full shrink-0">DELETED</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-500 flex items-center gap-3">
                                                            <span>By {post.author?.name}</span>
                                                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post._count?.replies || 0}</span>
                                                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => setViewingPost(post)} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors" title="Preview Post"><Eye className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => handleViewVersions(post.id)} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors" title="Edit History"><RotateCcw className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => updatePostStatus(post.id, { allowReplies: !post.allowReplies })} className={`p-1.5 rounded-lg transition-colors ${post.allowReplies ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-amber-500/20 text-amber-400'}`} title={post.allowReplies ? 'Lock Replies' : 'Unlock Replies'}>{post.allowReplies ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}</button>
                                                    <button onClick={() => updatePostStatus(post.id, { isPinned: !post.isPinned })} className={`p-1.5 rounded-lg transition-colors ${post.isPinned ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`} title={post.isPinned ? 'Unpin' : 'Pin'}><Pin className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => updatePostStatus(post.id, { status: post.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })} className="p-1.5 bg-slate-700 hover:bg-purple-600 text-slate-300 rounded-lg transition-colors" title={post.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}><Archive className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => { if (confirm(`Soft delete "${post.title}"?`)) updatePostStatus(post.id, { isDeleted: true }); }} className="p-1.5 bg-slate-700 hover:bg-red-600 text-slate-300 rounded-lg transition-colors" disabled={post.isDeleted} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SYSTEM FILES */}
            {viewMode === 'FILES' && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <HardDrive className="text-blue-400" />
                        System Files
                    </h2>
                    <p className="text-sm text-slate-400">Files uploaded to the knowledge base. Orphaned files are no longer referenced by any post and can be safely deleted.</p>
                    <TrainingFiles />
                </div>
            )}

            {/* POST PREVIEW MODAL */}
            {viewingPost && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-3xl p-6 border border-slate-700 shadow-2xl space-y-4 my-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{viewingPost.title}</h2>
                                <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                                    <span>By {viewingPost.author?.name}</span>
                                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{viewingPost.category?.name}</span>
                                    <span>{new Date(viewingPost.createdAt).toLocaleDateString()}</span>
                                    {viewingPost.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
                                    {viewingPost.status === 'DRAFT' && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 rounded-full">DRAFT</span>}
                                    {viewingPost.status === 'ARCHIVED' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 rounded-full">ARCHIVED</span>}
                                </div>
                            </div>
                            <button onClick={() => setViewingPost(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                        </div>
                        <hr className="border-slate-700" />
                        <AdminPostContent content={viewingPost.content} />
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-4 border-t border-slate-700">
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {viewingPost._count?.replies || 0} Replies</span>
                            <span>{viewingPost.allowReplies ? 'Replies open' : 'Replies locked'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* VERSION HISTORY MODAL */}
            {viewingVersionsFor && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-4xl p-6 border border-slate-700 shadow-2xl space-y-6 my-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="text-blue-400" /> Post Edit History</h2>
                            <button onClick={() => setViewingVersionsFor(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            {versions.length === 0 ? (
                                <p className="text-slate-400 p-4 bg-slate-800 rounded">No edits have been made to this post.</p>
                            ) : (
                                versions.map((v, i) => (
                                    <div key={v.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                        <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
                                            <div>
                                                <p className="font-bold text-slate-200">Revision {versions.length - i}</p>
                                                <p className="text-sm text-slate-400">Edited by {v.editor?.name || 'Unknown'} on {new Date(v.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-lg mb-2">{v.title}</h4>
                                        <div className="bg-slate-900 p-3 rounded text-sm text-slate-300 font-mono whitespace-pre-wrap">
                                            {v.content}
                                        </div>
                                        {i === 0 && (
                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    onClick={() => {
                                                        updatePostStatus(v.postId, { title: v.title, content: v.content });
                                                        setViewingVersionsFor(null);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium"
                                                >
                                                    Restore This Content
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORY MODAL */}
            {isCategoryModalOpen && editingCategory && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingCategory.id ? 'Edit Category' : 'Create Category'}</h2>
                        <form onSubmit={handleSaveCategory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Category Name</label>
                                <input
                                    required
                                    value={editingCategory.name || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                                <textarea
                                    value={editingCategory.description || ''}
                                    onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                                />
                            </div>

                            <hr className="border-slate-800 my-4" />
                            <h3 className="font-bold text-slate-300 text-sm tracking-wider uppercase">Visibility & Access</h3>

                            <div className="space-y-6 mt-4">
                                {/* VIEW PERMISSIONS */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-3">Who can <span className="text-blue-400">VIEW</span> posts in this category?</label>
                                    <div className="flex flex-wrap gap-4 mb-3">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                            <input type="radio" name={`viewMode_${editingCategory.id}`} className="text-blue-500 w-4 h-4 bg-slate-900 border-slate-600 focus:ring-blue-500 focus:ring-2"
                                                checked={editingCategory.isAdminOnly === true}
                                                onChange={() => setEditingCategory({ ...editingCategory, isAdminOnly: true, isEveryone: false, viewRoles: '[]' })}
                                            /> Admin Only
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                            <input type="radio" name={`viewMode_${editingCategory.id}`} className="text-blue-500 w-4 h-4 bg-slate-900 border-slate-600 focus:ring-blue-500 focus:ring-2"
                                                checked={editingCategory.isEveryone === true}
                                                onChange={() => setEditingCategory({ ...editingCategory, isAdminOnly: false, isEveryone: true, viewRoles: '[]' })}
                                            /> Everyone
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                            <input type="radio" name={`viewMode_${editingCategory.id}`} className="text-blue-500 w-4 h-4 bg-slate-900 border-slate-600 focus:ring-blue-500 focus:ring-2"
                                                checked={editingCategory.isAdminOnly === false && editingCategory.isEveryone === false}
                                                onChange={() => setEditingCategory({ ...editingCategory, isAdminOnly: false, isEveryone: false })}
                                            /> Specific Roles
                                        </label>
                                    </div>

                                    {!editingCategory.isEveryone && !editingCategory.isAdminOnly && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-4 border-l-2 border-slate-700 py-2">
                                            {roles.map(r => {
                                                const currentViews = Array.isArray(editingCategory.viewRoles)
                                                    ? editingCategory.viewRoles
                                                    : JSON.parse(editingCategory.viewRoles as string || '[]');

                                                const isSelected = currentViews.includes(r.id);

                                                return (
                                                    <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                const newViews = e.target.checked
                                                                    ? [...currentViews, r.id]
                                                                    : currentViews.filter((id: string) => id !== r.id);
                                                                setEditingCategory({ ...editingCategory, viewRoles: JSON.stringify(newViews) });
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <div className={`w-3 h-3 rounded-sm flex items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-slate-900 border border-slate-600'}`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                                        </div>
                                                        <span className="text-xs font-medium">{r.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* POST PERMISSIONS */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-3">Who can <span className="text-emerald-400">CREATE</span> posts in this category?</label>
                                    <div className="flex flex-wrap gap-4 mb-3">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                            <input type="radio" name={`postMode_${editingCategory.id}`} className="text-emerald-500 w-4 h-4 bg-slate-900 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                                                checked={(Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]')).includes('ADMIN_ONLY')}
                                                onChange={() => setEditingCategory({ ...editingCategory, postRoles: JSON.stringify(['ADMIN_ONLY']) })}
                                            /> Admin Only
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                            <input type="radio" name={`postMode_${editingCategory.id}`} className="text-emerald-500 w-4 h-4 bg-slate-900 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                                                checked={(Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]')).includes('EVERYONE')}
                                                onChange={() => setEditingCategory({ ...editingCategory, postRoles: JSON.stringify(['EVERYONE']) })}
                                            /> Everyone
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                            <input type="radio" name={`postMode_${editingCategory.id}`} className="text-emerald-500 w-4 h-4 bg-slate-900 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                                                checked={!(Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]')).includes('ADMIN_ONLY') && !(Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]')).includes('EVERYONE')}
                                                onChange={() => {
                                                    const parsed = Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]');
                                                    const clean = parsed.filter((id: string) => id !== 'ADMIN_ONLY' && id !== 'EVERYONE');
                                                    setEditingCategory({ ...editingCategory, postRoles: JSON.stringify(clean) });
                                                }}
                                            /> Specific Roles
                                        </label>
                                    </div>

                                    {!(Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]')).includes('ADMIN_ONLY') && !(Array.isArray(editingCategory.postRoles) ? editingCategory.postRoles : JSON.parse(editingCategory.postRoles as string || '[]')).includes('EVERYONE') && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-4 border-l-2 border-slate-700 py-2">
                                            {roles.map(r => {
                                                const currentPosts = Array.isArray(editingCategory.postRoles)
                                                    ? editingCategory.postRoles
                                                    : JSON.parse(editingCategory.postRoles as string || '[]');

                                                const isSelected = currentPosts.includes(r.id);

                                                return (
                                                    <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-emerald-600/20 border-emerald-500/50 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                const newPosts = e.target.checked
                                                                    ? [...currentPosts, r.id]
                                                                    : currentPosts.filter((id: string) => id !== r.id);
                                                                setEditingCategory({ ...editingCategory, postRoles: JSON.stringify(newPosts) });
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <div className={`w-3 h-3 rounded-sm flex items-center justify-center ${isSelected ? 'bg-emerald-500' : 'bg-slate-900 border border-slate-600'}`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                                        </div>
                                                        <span className="text-xs font-medium">{r.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-colors">Save Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Renders post content in admin modals: HTML (rich text) or plain text (legacy)
function AdminPostContent({ content }: { content: string }) {
    const isHtml = content.trimStart().startsWith('<');
    if (isHtml) {
        return <div className="post-content text-sm" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    return <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>;
}
