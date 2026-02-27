'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Settings, Eye, Users, AlertTriangle, Clock, MapPin, Search, MessageSquare, Trash2, Edit2, Pin, Archive, Unlock, Lock, RotateCcw } from 'lucide-react';
import { TrainingCategory, TrainingPost, TrainingPostVersion } from '@/types/training';

type Role = { id: string; name: string };

export default function AdminTraining({ roles }: { roles: Role[] }) {
    const [categories, setCategories] = useState<TrainingCategory[]>([]);
    const [posts, setPosts] = useState<TrainingPost[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [viewMode, setViewMode] = useState<'CATEGORIES' | 'MODERATION'>('CATEGORIES');

    // Category Modal
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<TrainingCategory> | null>(null);

    // Version Modal
    const [viewingVersionsFor, setViewingVersionsFor] = useState<string | null>(null);
    const [versions, setVersions] = useState<TrainingPostVersion[]>([]);

    useEffect(() => {
        fetchCategories();
        fetchPosts();
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
                        Master Post Index
                    </h2>

                    <div className="space-y-3">
                        {posts.map(post => (
                            <div key={post.id} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${post.isDeleted ? 'bg-red-900/10 border-red-500/30' : post.status === 'ARCHIVED' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-800 border-slate-700'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        {post.isPinned && <Pin className="w-4 h-4 text-amber-500" />}
                                        <h3 className={`font-bold truncate ${post.isDeleted || post.status === 'ARCHIVED' ? 'text-slate-400 line-through' : 'text-white'}`}>
                                            {post.title}
                                        </h3>
                                        <span className="text-xs font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                                            {post.category?.name}
                                        </span>
                                        {post.status === 'DRAFT' && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 rounded-full">DRAFT</span>}
                                        {post.status === 'ARCHIVED' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 rounded-full">ARCHIVED</span>}
                                    </div>
                                    <p className="text-sm text-slate-400 flex items-center gap-4">
                                        <span>By {post.author?.name}</span>
                                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post._count?.replies || 0} Replies</span>
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleViewVersions(post.id)}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <RotateCcw className="w-3 h-3" /> History
                                    </button>
                                    <button
                                        onClick={() => updatePostStatus(post.id, { allowReplies: !post.allowReplies })}
                                        className={`p-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${post.allowReplies ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}
                                        title={post.allowReplies ? "Lock Replies" : "Unlock Replies"}
                                    >
                                        {post.allowReplies ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => updatePostStatus(post.id, { isPinned: !post.isPinned })}
                                        className={`p-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${post.isPinned ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                                    >
                                        <Pin className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => updatePostStatus(post.id, { status: post.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })}
                                        className="p-2 bg-slate-700 hover:bg-purple-600 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <Archive className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to soft delete "${post.title}"?`)) {
                                                updatePostStatus(post.id, { isDeleted: true });
                                            }
                                        }}
                                        className="p-2 bg-slate-700 hover:bg-red-600 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                                        disabled={post.isDeleted}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {posts.length === 0 && <p className="text-slate-400 p-8 text-center bg-slate-800 rounded-xl">No posts exist to moderate yet.</p>}
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
