'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, MessageSquare, Truck, Check, X } from 'lucide-react';
import { format } from 'date-fns';

type UserContext = {
    id: string;
    name: string;
};

export default function AdminTruckChecks({ currentUser }: { currentUser: UserContext }) {
    const [subTab, setSubTab] = useState<'templates' | 'reports'>('reports');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // State
    const [templates, setTemplates] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [apparatusList, setApparatusList] = useState<any[]>([]);

    // Builder State
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [builderItems, setBuilderItems] = useState<any[]>([]);
    const [selectedApparatusId, setSelectedApparatusId] = useState('');
    const [locations, setLocations] = useState<any[]>([]);
    const [newLocationName, setNewLocationName] = useState('');
    const [uploadingImageIdx, setUploadingImageIdx] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
        fetchApparatus();
    }, [subTab]);

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
                const res = await fetch('/api/truck-checks/templates');
                const data = await res.json();
                setTemplates(data || []);
            } else if (subTab === 'reports') {
                const res = await fetch('/api/truck-checks/reports');
                const data = await res.json();
                setReports(data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
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
                            <h3 className="font-bold text-lg mb-4">Saved Templates</h3>
                            <div className="space-y-3">
                                {templates.map(t => (
                                    <div key={t.id} className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg flex justify-between items-center group">
                                        <div>
                                            <p className="font-medium text-slate-200">{t.apparatus?.name || 'Unknown Apparatus'}</p>
                                            <p className="text-sm text-slate-400">{t.items?.length || 0} items</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingTemplate(t);
                                                setBuilderItems(t.items || []);
                                                setSelectedApparatusId(t.apparatusId);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">{editingTemplate ? `Edit Template: ${editingTemplate.apparatus?.name}` : 'Create New Template'}</h3>
                            <div className="space-x-3">
                                {editingTemplate && (
                                    <button onClick={() => { setEditingTemplate(null); setBuilderItems([]); }} className="text-slate-400 hover:text-white">Cancel</button>
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
                                            {/* We will route this to a full-screen view mode later, for now just basic text */}
                                            <span className="text-sm text-blue-400 cursor-not-allowed">View Report (Coming Soon)</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


        </div>
    );
}
