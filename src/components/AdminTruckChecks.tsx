'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, MessageSquare, Truck, Check, X, Eye, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type UserContext = {
    id: string;
    name: string;
};

export default function AdminTruckChecks({ currentUser }: { currentUser: UserContext }) {
    const [subTab, setSubTab] = useState<'templates' | 'reports' | 'images'>('reports');
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // State
    const [templates, setTemplates] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [apparatusList, setApparatusList] = useState<any[]>([]);

    // Image Manager State
    const [images, setImages] = useState<any[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);

    // Builder State
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [builderItems, setBuilderItems] = useState<any[]>([]);
    const [selectedApparatusId, setSelectedApparatusId] = useState('');
    const [locations, setLocations] = useState<any[]>([]);
    const [newLocationName, setNewLocationName] = useState('');
    const [uploadingImageIdx, setUploadingImageIdx] = useState<number | null>(null);

    // Report Viewer State
    const [viewingReport, setViewingReport] = useState<any | null>(null);

    const handleViewReport = async (reportId: string) => {
        try {
            const res = await fetch(`/api/truck-checks/reports/${reportId}`);
            if (res.ok) {
                setViewingReport(await res.json());
            } else {
                alert('Failed to load full report details.');
            }
        } catch (error) {
            console.error(error);
            alert('Error fetching report details.');
        }
    };

    const handleStatusChange = async (reportId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/truck-checks/reports/${reportId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                // Update local state
                setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
                if (viewingReport && viewingReport.id === reportId) {
                    setViewingReport({ ...viewingReport, status: newStatus });
                }
            } else {
                alert('Failed to update report status.');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating status.');
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!confirm('WARNING: Are you sure you want to completely DELETE this truck check report? This action cannot be undone and will permanently remove all associated checklist items and data.')) {
            return;
        }

        try {
            const res = await fetch(`/api/truck-checks/reports/${reportId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setReports(reports.filter(r => r.id !== reportId));
                if (viewingReport && viewingReport.id === reportId) {
                    setViewingReport(null);
                }
            } else {
                alert('Failed to delete report.');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting report.');
        }
    };

    useEffect(() => {
        fetchData();
        fetchApparatus();
    }, [subTab, showArchived]);

    useEffect(() => {
        if (selectedApparatusId) {
            fetchLocations(selectedApparatusId);
        } else {
            setLocations([]);
        }
    }, [selectedApparatusId]);

    const fetchLocations = async (appId: string) => {
        const res = await fetch(`/api/apparatus-locations?apparatusId=${appId}`);
        if (res.ok) setLocations(await res.json());
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (subTab === 'templates') {
                const res = await fetch(`/api/truck-checks/templates?archived=${showArchived}`);
                const data = await res.json();
                setTemplates(data || []);
            } else if (subTab === 'reports') {
                const res = await fetch('/api/truck-checks/reports');
                const data = await res.json();
                setReports(data || []);
            } else if (subTab === 'images') {
                await fetchImages();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchImages = async () => {
        setLoadingImages(true);
        try {
            const res = await fetch('/api/images');
            const data = await res.json();
            setImages(data.images || []);
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setLoadingImages(false);
        }
    };

    const handleDeleteImage = async (filename: string) => {
        if (!confirm('WARNING: Are you sure you want to delete this image? If it is attached to an active template, the template will lose its reference photo.')) return;

        try {
            const res = await fetch(`/api/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
            if (res.ok) {
                setMessage('Image deleted successfully');
                fetchImages();
            } else {
                const data = await res.json();
                setMessage(data.error || 'Failed to delete image');
            }
        } catch (error) {
            console.error(error);
            setMessage('Error deleting image');
        }
    };

    const fetchApparatus = async () => {
        const res = await fetch('/api/apparatus');
        if (res.ok) {
            setApparatusList(await res.json());
        }
    };

    const handleSaveTemplate = async () => {
        if (!selectedApparatusId && !editingTemplate) {
            setMessage('Please select an apparatus');
            return;
        }

        try {
            const method = editingTemplate ? 'PUT' : 'POST';
            const url = editingTemplate ? `/api/truck-checks/templates/${editingTemplate.id}` : '/api/truck-checks/templates';
            const body = editingTemplate
                ? { items: builderItems }
                : { apparatusId: selectedApparatusId, items: builderItems };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || 'Failed to save template');
            }

            setMessage('Template saved successfully!');
            setEditingTemplate(null);
            setBuilderItems([]);
            setSelectedApparatusId('');
            fetchData();
        } catch (error: any) {
            setMessage(error.message);
        }
    };

    const handleDeleteTemplate = async () => {
        if (!editingTemplate) return;
        if (!confirm('WARNING: Are you sure you want to archive this template? Past reports using this template will be preserved, but new reports cannot be generated from it.')) {
            return;
        }

        try {
            const res = await fetch(`/api/truck-checks/templates/${editingTemplate.id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || 'Failed to delete template');
            }

            setMessage('Template archived successfully.');
            setEditingTemplate(null);
            setBuilderItems([]);
            setSelectedApparatusId('');
            fetchData();
        } catch (error: any) {
            setMessage(error.message);
        }
    };

    const handleReactivateTemplate = async (templateId: string) => {
        try {
            const res = await fetch(`/api/truck-checks/templates/${templateId}/reactivate`, {
                method: 'PATCH'
            });

            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || 'Failed to reactivate template');
            }

            setMessage('Template reactivated successfully.');
            fetchData();
        } catch (error: any) {
            setMessage(error.message);
        }
    };

    const handleAddLocation = async () => {
        if (!newLocationName.trim() || !selectedApparatusId) return;
        try {
            const res = await fetch('/api/apparatus-locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apparatusId: selectedApparatusId, name: newLocationName })
            });
            if (res.ok) {
                setNewLocationName('');
                fetchLocations(selectedApparatusId);
            }
        } catch (error) {
            console.error('Failed to add location:', error);
        }
    };

    const handleDeleteLocation = async (locId: string) => {
        if (!confirm('Delete this location? Items using it will lose their grouping.')) return;
        try {
            const res = await fetch(`/api/apparatus-locations/${locId}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchLocations(selectedApparatusId);
        } catch (error) {
            console.error('Failed to delete location:', error);
        }
    };

    const handleFileUpload = async (file: File, itemIdx: number) => {
        if (!file) return;
        setUploadingImageIdx(itemIdx);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const newArr = [...builderItems];
                newArr[itemIdx].adminPhotoUrl = data.url;
                setBuilderItems(newArr);
            } else {
                setMessage('Failed to upload image. Check server logs.');
            }
        } catch (error) {
            console.error('Upload Error:', error);
            setMessage('Error uploading image');
        } finally {
            setUploadingImageIdx(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Sub-Tabs Navigation */}
            <div className="flex gap-4 border-b border-slate-700 pb-2">
                <button
                    onClick={() => setSubTab('reports')}
                    className={`pb-2 px-2 font-medium transition-colors border-b-2 ${subTab === 'reports' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Reports Archive
                </button>
                <button
                    onClick={() => setSubTab('templates')}
                    className={`pb-2 px-2 font-medium transition-colors border-b-2 ${subTab === 'templates' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    Templates Builder
                </button>
                <button
                    onClick={() => setSubTab('images')}
                    className={`pb-2 px-2 font-medium transition-colors border-b-2 ${subTab === 'images' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    System Images
                </button>
            </div>

            {message && (
                <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 flex justify-between">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-slate-400 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                </div>
            )}

            {/* TEMPLATES TAB */}
            {subTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">{showArchived ? 'Archived Templates' : 'Saved Templates'}</h3>
                                <button
                                    onClick={() => {
                                        setShowArchived(!showArchived);
                                        setEditingTemplate(null);
                                        setBuilderItems([]);
                                        setSelectedApparatusId('');
                                    }}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    {showArchived ? 'View Active' : 'View Archived'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                {templates.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            if (showArchived) return; // Don't edit archived templates
                                            setEditingTemplate(t);
                                            setBuilderItems(t.items || []);
                                            setSelectedApparatusId(t.apparatusId);
                                        }}
                                        className={`p-3 bg-slate-700/50 hover:bg-slate-600 border border-slate-600 rounded-lg flex justify-between items-center group transition-colors ${!showArchived ? 'cursor-pointer' : ''}`}
                                    >
                                        <div>
                                            <p className="font-medium text-slate-200">{t.apparatus?.name || 'Unknown Apparatus'}</p>
                                            <p className="text-sm text-slate-400">{t.items?.length || 0} items</p>
                                        </div>
                                        <div className="p-2 transition-colors">
                                            {showArchived ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReactivateTemplate(t.id); }}
                                                    className="bg-blue-600/80 hover:bg-blue-500 text-white px-3 py-1 text-xs rounded transition-colors"
                                                >
                                                    Reactivate
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 group-hover:text-blue-400 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {templates.length === 0 && (
                                    <p className="text-sm text-slate-500 italic">No {showArchived ? 'archived' : 'active'} templates found.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">{editingTemplate ? `Edit Template: ${editingTemplate.apparatus?.name}` : 'Create New Template'}</h3>
                            <div className="space-x-3 flex items-center">
                                {editingTemplate && (
                                    <>
                                        <button onClick={handleDeleteTemplate} className="text-red-400 hover:text-red-300 font-medium px-2 py-2">
                                            Archive
                                        </button>
                                        <button onClick={() => { setEditingTemplate(null); setBuilderItems([]); setSelectedApparatusId(''); }} className="text-slate-400 hover:text-white px-2 py-2">
                                            Cancel
                                        </button>
                                    </>
                                )}
                                <button onClick={handleSaveTemplate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                    Save Template
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Assign to Apparatus</label>
                                <select
                                    value={selectedApparatusId}
                                    onChange={(e) => setSelectedApparatusId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    disabled={!!editingTemplate}
                                >
                                    <option value="">Select Apparatus...</option>
                                    {apparatusList.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedApparatusId && (
                                <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg">
                                    <h4 className="font-bold text-sm text-slate-300 mb-3">Apparatus Locations / Compartments</h4>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {locations.length === 0 ? (
                                            <span className="text-xs text-slate-500 italic">No locations defined</span>
                                        ) : (
                                            locations.map(loc => (
                                                <div key={loc.id} className="bg-slate-800 border border-slate-600 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                    {loc.name}
                                                    <button onClick={() => handleDeleteLocation(loc.id)} className="text-slate-400 hover:text-red-400"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newLocationName}
                                            onChange={(e) => setNewLocationName(e.target.value)}
                                            placeholder="e.g. Right Front Compartment 1"
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                                        />
                                        <button onClick={handleAddLocation} className="bg-slate-700 hover:bg-slate-600 px-3 rounded font-medium text-sm transition-colors">Add</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 mb-6">
                            {builderItems.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-3 relative group">
                                    <button
                                        onClick={() => setBuilderItems(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Item Name</label>
                                            <input
                                                type="text"
                                                value={item.itemName || ''}
                                                onChange={(e) => {
                                                    const newArr = [...builderItems];
                                                    newArr[idx].itemName = e.target.value;
                                                    setBuilderItems(newArr);
                                                }}
                                                placeholder="e.g. Engine Oil"
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Location / Grouping (Optional)</label>
                                            <select
                                                value={item.locationId || ''}
                                                onChange={(e) => {
                                                    const newArr = [...builderItems];
                                                    newArr[idx].locationId = e.target.value || null;
                                                    setBuilderItems(newArr);
                                                }}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-300"
                                            >
                                                <option value="">No specific location</option>
                                                {locations.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={item.itemDescription || ''}
                                                onChange={(e) => {
                                                    const newArr = [...builderItems];
                                                    newArr[idx].itemDescription = e.target.value;
                                                    setBuilderItems(newArr);
                                                }}
                                                placeholder="e.g. Check dipstick level is between min and max"
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Reference Photo (Optional)</label>
                                            {!item.adminPhotoUrl ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], idx)}
                                                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                                                        disabled={uploadingImageIdx === idx}
                                                    />
                                                    {uploadingImageIdx === idx && <span className="text-xs text-blue-400 self-center">Uploading...</span>}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded px-3 py-1.5">
                                                    <a href={item.adminPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate mr-2 flex-1">
                                                        Uploaded Photo Attached
                                                    </a>
                                                    <button
                                                        onClick={() => {
                                                            const newArr = [...builderItems];
                                                            newArr[idx].adminPhotoUrl = null;
                                                            setBuilderItems(newArr);
                                                        }}
                                                        className="text-slate-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setBuilderItems([...builderItems, { itemName: '', itemDescription: '', adminPhotoUrl: null, locationId: null }])}
                            className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Add Checklist Item
                        </button>
                    </div>
                </div>
            )}

            {/* REPORTS TAB */}
            {subTab === 'reports' && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto w-full scrollbar-thin">
                        <table className="w-full min-w-max text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/50 border-b border-slate-700">
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Apparatus</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Created</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Completion</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {reports.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 font-medium">{r.apparatus?.name}</td>
                                        <td className="p-4 text-slate-400">{format(new Date(r.createdAt), 'MMM d, yyyy HH:mm')}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${r.status === 'Open' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-400">
                                            {r.items?.filter((i: any) => i.status !== 'NA').length || 0} / {r.items?.length || 0} items
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewReport(r.id)}
                                                    className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg w-fit"
                                                >
                                                    <Eye className="w-4 h-4" /> View Details
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReport(r.id)}
                                                    className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg w-fit"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* IMAGES TAB */}
            {subTab === 'images' && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">System Images Manager</h3>
                        <button onClick={fetchImages} className="text-sm text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg">
                            Refresh Images
                        </button>
                    </div>

                    {loadingImages ? (
                        <div className="text-center p-8 text-slate-400">Loading images...</div>
                    ) : images.length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-slate-700 rounded-lg text-slate-500 italic">
                            No images currently uploaded in the system.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {images.map(img => (
                                <div key={img.name} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col group">
                                    <div className="h-32 bg-slate-900/50 flex flex-col justify-center items-center relative overflow-hidden backdrop-blur-sm">
                                        <a href={img.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 block"></a>
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                                    </div>
                                    <div className="p-3 text-xs flex flex-col gap-1 border-t border-slate-700 relative z-20 bg-slate-800">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-medium truncate text-slate-300 flex-1 break-all" title={img.name}>{img.name}</p>
                                            <button
                                                onClick={() => handleDeleteImage(img.name)}
                                                className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                                title="Delete Image"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-slate-500">{(img.size / 1024).toFixed(1)} KB</p>
                                        <p className="text-slate-500">{format(new Date(img.createdAt), 'MMM d, yyyy')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}


            {/* Read-Only Report Viewer Modal */}
            {
                viewingReport && (
                    <div className="fixed inset-0 bg-slate-900/90 z-[100] flex justify-center items-center overflow-hidden backdrop-blur-sm p-4 md:p-8">
                        <div className="bg-slate-900 w-full max-w-5xl h-full max-h-[90vh] flex flex-col border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Truck className="w-6 h-6 text-blue-400" />
                                        {viewingReport.apparatus?.name} Check Overview
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(viewingReport.createdAt), 'MMM d, yyyy')}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(viewingReport.createdAt), 'hh:mm a')}</span>
                                        <select
                                            value={viewingReport.status}
                                            onChange={(e) => handleStatusChange(viewingReport.id, e.target.value)}
                                            className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wider outline-none cursor-pointer ${viewingReport.status === 'Open' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                }`}
                                        >
                                            <option value="Open" className="bg-slate-800 text-slate-200">OPEN</option>
                                            <option value="Closed" className="bg-slate-800 text-slate-200">CLOSED</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDeleteReport(viewingReport.id)}
                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition-colors border border-red-500/20 flex items-center justify-center"
                                        title="Delete Report"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setViewingReport(null)}
                                        className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                                        title="Close Report Viewer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Checklist Body */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-900/50">
                                {(() => {
                                    // Group items by location name
                                    const grouped = (viewingReport.items || []).reduce((acc: any, item: any) => {
                                        const locName = item.templateItem?.location?.name || 'Uncategorized';
                                        if (!acc[locName]) acc[locName] = [];
                                        acc[locName].push(item);
                                        return acc;
                                    }, {});

                                    return Object.entries(grouped || {}).map(([locationName, items]: [string, any]) => (
                                        <div key={locationName} className="mb-6 last:mb-0">
                                            <h4 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
                                                <MapPin className="w-5 h-5 text-blue-400" />
                                                {locationName}
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {items.map((item: any) => (
                                                    <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4">
                                                        <div className="flex-1">
                                                            <h5 className="font-bold text-white text-base">{item.templateItem?.itemName}</h5>

                                                            {item.status ? (
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'YES' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                                        item.status === 'NO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                                            'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                                                        }`}>
                                                                        {item.status}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">by {item.completedByUser?.name || 'Unknown'}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="mt-2 inline-block px-2 py-1 rounded text-xs font-bold uppercase bg-slate-800 text-slate-500 border border-slate-700 border-dashed">
                                                                    NOT CHECKED
                                                                </span>
                                                            )}

                                                            {item.comments && (
                                                                <div className="mt-3 p-2 bg-slate-900/50 rounded-lg text-sm text-slate-300 border border-slate-700/50 flex gap-2 items-start">
                                                                    <MessageSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                                                    <p>{item.comments}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {item.templateItem?.adminPhotoUrl && (
                                                            <div className="w-24 shrink-0 flex flex-col justify-center items-center border-l border-slate-700 pl-4 text-center">
                                                                <a href={item.templateItem.adminPhotoUrl} target="_blank" rel="noopener noreferrer" className="block w-full rounded bg-black/20 border border-slate-700 hover:border-blue-500 overflow-hidden">
                                                                    <img src={item.templateItem.adminPhotoUrl} alt="Ref" className="w-full object-contain max-h-16" />
                                                                </a>
                                                                <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Ref Photo</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
