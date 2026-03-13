'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, File, ImageIcon, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface TrainingFile {
    name: string;
    url: string;
    size: number;
    createdAt: string;
    inUse: boolean;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(name: string): boolean {
    return /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name);
}

export default function TrainingFiles() {
    const [files, setFiles] = useState<TrainingFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/training/files');
            if (res.ok) setFiles(await res.json());
        } catch (e) {
            console.error('Failed to load training files', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setDeleting(name);
        try {
            const res = await fetch(`/api/training/files?filename=${encodeURIComponent(name)}`, { method: 'DELETE' });
            if (res.ok) {
                setFiles(prev => prev.filter(f => f.name !== name));
            } else {
                alert('Failed to delete file.');
            }
        } catch (e) {
            console.error('Delete failed', e);
            alert('Failed to delete file.');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="text-center p-12 text-slate-500">
                <File className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No files have been uploaded to the knowledge base yet.</p>
            </div>
        );
    }

    const orphanCount = files.filter(f => !f.inUse).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                    {files.length} file{files.length !== 1 ? 's' : ''}
                    {orphanCount > 0 && (
                        <span className="ml-2 text-red-400">· {orphanCount} orphaned</span>
                    )}
                </p>
                <button
                    onClick={fetchFiles}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                    Refresh
                </button>
            </div>

            <div className="grid gap-3">
                {files.map(file => (
                    <div key={file.name} className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                        {/* Thumbnail or icon */}
                        <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                            {isImage(file.name) ? (
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                                <File className="w-6 h-6 text-slate-400" />
                            )}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-slate-200 truncate text-sm hover:text-blue-400 transition-colors block"
                                title={file.name}
                            >
                                {file.name}
                            </a>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                        </div>

                        {/* Usage badge */}
                        {file.inUse ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full shrink-0">
                                <CheckCircle2 className="w-3 h-3" /> In Use
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full shrink-0">
                                <AlertTriangle className="w-3 h-3" /> Orphan
                            </span>
                        )}

                        {/* Delete button */}
                        <button
                            onClick={() => handleDelete(file.name)}
                            disabled={deleting === file.name}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                            title="Delete file"
                        >
                            {deleting === file.name
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />
                            }
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
