'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, MessageSquare, Truck, Check, X, Eye, MapPin, Calendar, ChevronDown, ChevronRight, GripVertical, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

type UserContext = { id: string; name: string };

let _uidCounter = 0;
function genUid() { return `item-${++_uidCounter}-${Math.random().toString(36).slice(2)}`; }

// ── Sortable checklist item card ─────────────────────────────────────────────
function SortableBuilderItem({
    item, idx, locations, uploadingImageIdx,
    onChange, onDelete, onUpload, addBtnRef,
}: {
    item: any; idx: number; locations: any[]; uploadingImageIdx: number | null;
    onChange: (uid: string, field: string, value: any) => void;
    onDelete: (uid: string) => void;
    onUpload: (file: File, uid: string) => void;
    addBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._uid });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };
    const descRef = useRef<HTMLInputElement>(null);

    const handleDescTab = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' && !e.shiftKey && !item.adminPhotoUrl) {
            // No photo attached — desc is last field, jump to add button
            e.preventDefault();
            addBtnRef.current?.focus();
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="flex gap-2 items-start bg-slate-800 border border-slate-700 rounded-lg p-3 group">
            {/* Drag handle */}
            <button
                {...attributes} {...listeners}
                className="mt-1 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                tabIndex={-1}
            >
                <GripVertical className="w-4 h-4" />
            </button>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Item Name */}
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Item Name</label>
                    <input
                        type="text"
                        value={item.itemName || ''}
                        onChange={e => onChange(item._uid, 'itemName', e.target.value)}
                        placeholder="e.g. Engine Oil"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        autoFocus={item._isNew}
                    />
                </div>
                {/* Description */}
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Description</label>
                    <input
                        ref={descRef}
                        type="text"
                        value={item.itemDescription || ''}
                        onChange={e => onChange(item._uid, 'itemDescription', e.target.value)}
                        onKeyDown={handleDescTab}
                        placeholder="e.g. Check dipstick is between min/max"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>
                {/* Reference Photo */}
                <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Reference Photo (Optional)</label>
                    {!item.adminPhotoUrl ? (
                        <div className="flex gap-2 items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => e.target.files && onUpload(e.target.files[0], item._uid)}
                                onKeyDown={e => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); addBtnRef.current?.focus(); } }}
                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                                disabled={uploadingImageIdx !== null}
                            />
                            {uploadingImageIdx !== null && <span className="text-xs text-blue-400 shrink-0">Uploading…</span>}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded px-3 py-1.5">
                            <a href={item.adminPhotoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate mr-2 flex-1">
                                Photo Attached
                            </a>
                            <button
                                onClick={() => onChange(item._uid, 'adminPhotoUrl', null)}
                                onKeyDown={e => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); addBtnRef.current?.focus(); } }}
                                className="text-slate-500 hover:text-red-400 shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete item */}
            <button
                onClick={() => onDelete(item._uid)}
                tabIndex={-1}
                className="mt-1 text-slate-600 hover:text-red-400 shrink-0 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── Droppable container wrapper ───────────────────────────────────────────────
function DroppableContainer({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef } = useDroppable({ id });
    return <div ref={setNodeRef} className="min-h-[4px]">{children}</div>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminTruckChecks({ currentUser }: { currentUser: UserContext }) {
    const [subTab, setSubTab] = useState<'templates' | 'reports' | 'images'>('reports');
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [templates, setTemplates] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [apparatusList, setApparatusList] = useState<any[]>([]);

    const [images, setImages] = useState<any[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);

    // Builder state
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [builderItems, setBuilderItems] = useState<any[]>([]);
    const [selectedApparatusId, setSelectedApparatusId] = useState('');
    const [locations, setLocations] = useState<any[]>([]);
    const [newLocationName, setNewLocationName] = useState('');
    const [uploadingImageUid, setUploadingImageUid] = useState<string | null>(null);

    // Compartment UI state
    const [collapsedLocs, setCollapsedLocs] = useState<Set<string>>(new Set());
    const [editingLocId, setEditingLocId] = useState<string | null>(null);
    const [editingLocName, setEditingLocName] = useState('');

    // DnD state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Per-compartment "Add" button refs  (keyed by location id)
    const addBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Report viewer
    const [viewingReport, setViewingReport] = useState<any | null>(null);

    // ── helpers ────────────────────────────────────────────────────────────────
    const withUid = (items: any[]) => items.map(i => ({ ...i, _uid: i._uid || i.id || genUid() }));

    const toggleCollapse = (locId: string) =>
        setCollapsedLocs(prev => { const n = new Set(prev); n.has(locId) ? n.delete(locId) : n.add(locId); return n; });

    const allCollapsed = locations.length > 0 && locations.every(l => collapsedLocs.has(l.id));
    const toggleAll = () => {
        if (allCollapsed) setCollapsedLocs(new Set());
        else setCollapsedLocs(new Set(locations.map(l => l.id)));
    };

    // ── data fetching ──────────────────────────────────────────────────────────
    useEffect(() => { fetchData(); fetchApparatus(); }, [subTab, showArchived]);
    useEffect(() => {
        if (selectedApparatusId) fetchLocations(selectedApparatusId);
        else setLocations([]);
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
                setTemplates((await res.json()) || []);
            } else if (subTab === 'reports') {
                const res = await fetch('/api/truck-checks/reports');
                setReports((await res.json()) || []);
            } else if (subTab === 'images') {
                await fetchImages();
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    const fetchImages = async () => {
        setLoadingImages(true);
        try {
            const res = await fetch('/api/images');
            setImages((await res.json()).images || []);
        } catch (e) { console.error(e); }
        finally { setLoadingImages(false); }
    };
    const fetchApparatus = async () => {
        const res = await fetch('/api/apparatus');
        if (res.ok) setApparatusList(await res.json());
    };

    // ── report actions ─────────────────────────────────────────────────────────
    const handleViewReport = async (id: string) => {
        const res = await fetch(`/api/truck-checks/reports/${id}`);
        if (res.ok) setViewingReport(await res.json());
        else alert('Failed to load report.');
    };
    const handleStatusChange = async (reportId: string, status: string) => {
        const res = await fetch(`/api/truck-checks/reports/${reportId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
        });
        if (res.ok) {
            setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
            if (viewingReport?.id === reportId) setViewingReport({ ...viewingReport, status });
        }
    };
    const handleDeleteReport = async (id: string) => {
        if (!confirm('Permanently delete this report? This cannot be undone.')) return;
        const res = await fetch(`/api/truck-checks/reports/${id}`, { method: 'DELETE' });
        if (res.ok) { setReports(reports.filter(r => r.id !== id)); if (viewingReport?.id === id) setViewingReport(null); }
    };

    // ── template actions ───────────────────────────────────────────────────────
    const handleSaveTemplate = async () => {
        if (!selectedApparatusId && !editingTemplate) { setMessage('Please select an apparatus'); return; }
        try {
            const method = editingTemplate ? 'PUT' : 'POST';
            const url = editingTemplate ? `/api/truck-checks/templates/${editingTemplate.id}` : '/api/truck-checks/templates';
            const body = editingTemplate ? { items: builderItems } : { apparatusId: selectedApparatusId, items: builderItems };
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed');
            setMessage('Template saved!');
            setEditingTemplate(null); setBuilderItems([]); setSelectedApparatusId('');
            fetchData();
        } catch (e: any) { setMessage(e.message); }
    };
    const handleDeleteTemplate = async () => {
        if (!editingTemplate || !confirm('Archive this template?')) return;
        const res = await fetch(`/api/truck-checks/templates/${editingTemplate.id}`, { method: 'DELETE' });
        if (!res.ok) { setMessage((await res.json()).error || 'Failed'); return; }
        setMessage('Template archived.'); setEditingTemplate(null); setBuilderItems([]); setSelectedApparatusId(''); fetchData();
    };
    const handleReactivateTemplate = async (id: string) => {
        const res = await fetch(`/api/truck-checks/templates/${id}/reactivate`, { method: 'PATCH' });
        if (!res.ok) { setMessage('Failed to reactivate'); return; }
        setMessage('Template reactivated.'); fetchData();
    };

    // ── location actions ───────────────────────────────────────────────────────
    const handleAddLocation = async () => {
        if (!newLocationName.trim() || !selectedApparatusId) return;
        const res = await fetch('/api/apparatus-locations', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apparatusId: selectedApparatusId, name: newLocationName.trim() })
        });
        if (res.ok) { setNewLocationName(''); fetchLocations(selectedApparatusId); }
    };
    const handleDeleteLocation = async (locId: string) => {
        if (!confirm('Delete this compartment? Its items will become unassigned.')) return;
        const res = await fetch(`/api/apparatus-locations/${locId}`, { method: 'DELETE' });
        if (res.ok) {
            setBuilderItems(prev => prev.map(i => i.locationId === locId ? { ...i, locationId: null } : i));
            fetchLocations(selectedApparatusId);
        }
    };
    const handleRenameLocation = async (locId: string, name: string) => {
        if (!name.trim()) return;
        const res = await fetch(`/api/apparatus-locations/${locId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() })
        });
        if (res.ok) { setLocations(prev => prev.map(l => l.id === locId ? { ...l, name: name.trim() } : l)); }
        setEditingLocId(null);
    };

    // ── builder item actions ───────────────────────────────────────────────────
    const handleItemChange = useCallback((uid: string, field: string, value: any) => {
        setBuilderItems(prev => prev.map(i => i._uid === uid ? { ...i, [field]: value } : i));
    }, []);

    const handleItemDelete = useCallback((uid: string) => {
        setBuilderItems(prev => prev.filter(i => i._uid !== uid));
    }, []);

    const addItemToLocation = (locId: string | null) => {
        const uid = genUid();
        setBuilderItems(prev => [...prev, { _uid: uid, _isNew: true, itemName: '', itemDescription: '', adminPhotoUrl: null, locationId: locId }]);
    };

    const handleFileUpload = async (file: File, uid: string) => {
        setUploadingImageUid(uid);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                handleItemChange(uid, 'adminPhotoUrl', data.url);
            } else setMessage('Failed to upload image.');
        } catch { setMessage('Error uploading image'); }
        finally { setUploadingImageUid(null); }
    };

    const handleDeleteImage = async (filename: string) => {
        if (!confirm('Delete this image?')) return;
        const res = await fetch(`/api/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
        if (res.ok) { setMessage('Image deleted'); fetchImages(); }
        else setMessage((await res.json()).error || 'Failed');
    };

    // ── Drag and Drop ──────────────────────────────────────────────────────────
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over) return;

        const activeUid = String(active.id);
        const overId = String(over.id);

        setBuilderItems(prev => {
            const activeItem = prev.find(i => i._uid === activeUid);
            if (!activeItem) return prev;

            // Is over a location container (droppable) or an item?
            const overIsLocation = locations.some(l => l.id === overId) || overId === 'unassigned';
            const overItem = prev.find(i => i._uid === overId);

            const targetLocId = overIsLocation
                ? (overId === 'unassigned' ? null : overId)
                : (overItem?.locationId ?? null);

            // Move active item to target location and reorder
            let updated = prev.map(i => i._uid === activeUid ? { ...i, locationId: targetLocId } : i);

            // If dropped on a sibling item, reorder within that location's list
            if (overItem && overItem._uid !== activeUid && overItem.locationId === targetLocId) {
                const locItems = updated.filter(i => i.locationId === targetLocId);
                const others = updated.filter(i => i.locationId !== targetLocId);
                const oldIdx = locItems.findIndex(i => i._uid === activeUid);
                const newIdx = locItems.findIndex(i => i._uid === overId);
                if (oldIdx !== -1 && newIdx !== -1) {
                    const reordered = arrayMove(locItems, oldIdx, newIdx);
                    updated = [...others, ...reordered];
                }
            }

            return updated;
        });
    };

    const activeDragItem = builderItems.find(i => i._uid === activeDragId);

    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="flex gap-4 border-b border-slate-700 pb-2">
                {(['reports', 'templates', 'images'] as const).map(t => (
                    <button key={t} onClick={() => setSubTab(t)}
                        className={`pb-2 px-2 font-medium transition-colors border-b-2 capitalize ${subTab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                        {t === 'reports' ? 'Reports Archive' : t === 'templates' ? 'Templates Builder' : 'System Images'}
                    </button>
                ))}
            </div>

            {message && (
                <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 flex justify-between">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
                </div>
            )}

            {/* ── TEMPLATES TAB ── */}
            {subTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar: saved templates */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">{showArchived ? 'Archived' : 'Saved'} Templates</h3>
                                <button onClick={() => { setShowArchived(!showArchived); setEditingTemplate(null); setBuilderItems([]); setSelectedApparatusId(''); }}
                                    className="text-xs text-blue-400 hover:text-blue-300">
                                    {showArchived ? 'View Active' : 'View Archived'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                {templates.map(t => (
                                    <div key={t.id}
                                        onClick={() => { if (showArchived) return; setEditingTemplate(t); setBuilderItems(withUid(t.items || [])); setSelectedApparatusId(t.apparatusId); }}
                                        className={`p-3 bg-slate-700/50 hover:bg-slate-600 border border-slate-600 rounded-lg flex justify-between items-center group transition-colors ${!showArchived ? 'cursor-pointer' : ''}`}>
                                        <div>
                                            <p className="font-medium text-slate-200">{t.apparatus?.name || 'Unknown'}</p>
                                            <p className="text-sm text-slate-400">{t.items?.length || 0} items</p>
                                        </div>
                                        {showArchived ? (
                                            <button onClick={e => { e.stopPropagation(); handleReactivateTemplate(t.id); }}
                                                className="bg-blue-600/80 hover:bg-blue-500 text-white px-3 py-1 text-xs rounded">
                                                Reactivate
                                            </button>
                                        ) : (
                                            <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                        )}
                                    </div>
                                ))}
                                {templates.length === 0 && <p className="text-sm text-slate-500 italic">No {showArchived ? 'archived' : 'active'} templates.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Builder */}
                    <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">{editingTemplate ? `Edit: ${editingTemplate.apparatus?.name}` : 'Create New Template'}</h3>
                            <div className="flex items-center gap-2">
                                {editingTemplate && (
                                    <>
                                        <button onClick={handleDeleteTemplate} className="text-red-400 hover:text-red-300 font-medium px-2 py-2 text-sm">Archive</button>
                                        <button onClick={() => { setEditingTemplate(null); setBuilderItems([]); setSelectedApparatusId(''); }} className="text-slate-400 hover:text-white px-2 py-2 text-sm">Cancel</button>
                                    </>
                                )}
                                <button onClick={handleSaveTemplate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                                    Save Template
                                </button>
                            </div>
                        </div>

                        {/* Apparatus selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Assign to Apparatus</label>
                            <select value={selectedApparatusId} onChange={e => setSelectedApparatusId(e.target.value)}
                                disabled={!!editingTemplate}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Select Apparatus…</option>
                                {apparatusList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        {selectedApparatusId && (
                            <>
                                {/* Add compartment row */}
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={newLocationName}
                                        onChange={e => setNewLocationName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                                        placeholder="New compartment name…"
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <button onClick={handleAddLocation}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                                        <Plus className="w-4 h-4" /> Add Compartment
                                    </button>
                                </div>

                                {/* Expand / Collapse all */}
                                {locations.length > 0 && (
                                    <div className="flex justify-end mb-3">
                                        <button onClick={toggleAll}
                                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                                            {allCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
                                            {allCollapsed ? 'Expand All' : 'Collapse All'}
                                        </button>
                                    </div>
                                )}

                                {/* Compartment cards */}
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                    <div className="space-y-3">
                                        {locations.map(loc => {
                                            const locItems = builderItems.filter(i => i.locationId === loc.id);
                                            const isCollapsed = collapsedLocs.has(loc.id);
                                            return (
                                                <div key={loc.id} className="bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
                                                    {/* Compartment header */}
                                                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-800/60">
                                                        <button onClick={() => toggleCollapse(loc.id)} className="text-slate-400 hover:text-white transition-colors shrink-0">
                                                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                        {editingLocId === loc.id ? (
                                                            <input
                                                                autoFocus
                                                                value={editingLocName}
                                                                onChange={e => setEditingLocName(e.target.value)}
                                                                onBlur={() => handleRenameLocation(loc.id, editingLocName)}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleRenameLocation(loc.id, editingLocName); if (e.key === 'Escape') setEditingLocId(null); }}
                                                                className="flex-1 bg-slate-900 border border-blue-500 rounded px-2 py-0.5 text-sm outline-none"
                                                            />
                                                        ) : (
                                                            <span className="flex-1 font-semibold text-slate-200 text-sm">{loc.name}</span>
                                                        )}
                                                        <span className="text-xs text-slate-500 shrink-0">{locItems.length} item{locItems.length !== 1 ? 's' : ''}</span>
                                                        <button
                                                            onClick={() => { setEditingLocId(loc.id); setEditingLocName(loc.name); }}
                                                            className="text-slate-500 hover:text-blue-400 transition-colors shrink-0" title="Rename">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteLocation(loc.id)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors shrink-0" title="Delete compartment">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Items */}
                                                    {!isCollapsed && (
                                                        <div className="p-3 space-y-2">
                                                            <DroppableContainer id={loc.id}>
                                                                <SortableContext items={locItems.map(i => i._uid)} strategy={verticalListSortingStrategy}>
                                                                    {locItems.map((item, idx) => (
                                                                        <SortableBuilderItem
                                                                            key={item._uid}
                                                                            item={item}
                                                                            idx={idx}
                                                                            locations={locations}
                                                                            uploadingImageIdx={uploadingImageUid === item._uid ? idx : null}
                                                                            onChange={handleItemChange}
                                                                            onDelete={handleItemDelete}
                                                                            onUpload={handleFileUpload}
                                                                            addBtnRef={{ current: addBtnRefs.current[loc.id] } as React.RefObject<HTMLButtonElement | null>}
                                                                        />
                                                                    ))}
                                                                </SortableContext>
                                                            </DroppableContainer>

                                                            <button
                                                                ref={el => { addBtnRefs.current[loc.id] = el; }}
                                                                onClick={() => { addItemToLocation(loc.id); }}
                                                                className="w-full py-2 border border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 rounded-lg flex items-center justify-center gap-1.5 text-sm transition-colors"
                                                            >
                                                                <Plus className="w-4 h-4" /> Add Checklist Item
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Unassigned items */}
                                        {builderItems.some(i => !i.locationId) && (
                                            <div className="bg-slate-900/40 border border-dashed border-slate-700 rounded-xl overflow-hidden">
                                                <div className="px-4 py-3 border-b border-slate-700/60">
                                                    <span className="text-sm font-semibold text-slate-500">Unassigned Items</span>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    <DroppableContainer id="unassigned">
                                                        <SortableContext items={builderItems.filter(i => !i.locationId).map(i => i._uid)} strategy={verticalListSortingStrategy}>
                                                            {builderItems.filter(i => !i.locationId).map((item, idx) => (
                                                                <SortableBuilderItem
                                                                    key={item._uid}
                                                                    item={item}
                                                                    idx={idx}
                                                                    locations={locations}
                                                                    uploadingImageIdx={uploadingImageUid === item._uid ? idx : null}
                                                                    onChange={handleItemChange}
                                                                    onDelete={handleItemDelete}
                                                                    onUpload={handleFileUpload}
                                                                    addBtnRef={{ current: addBtnRefs.current['unassigned'] } as React.RefObject<HTMLButtonElement | null>}
                                                                />
                                                            ))}
                                                        </SortableContext>
                                                    </DroppableContainer>
                                                    <button
                                                        ref={el => { addBtnRefs.current['unassigned'] = el; }}
                                                        onClick={() => addItemToLocation(null)}
                                                        className="w-full py-2 border border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 rounded-lg flex items-center justify-center gap-1.5 text-sm transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Unassigned Item
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Drag overlay */}
                                    <DragOverlay>
                                        {activeDragItem && (
                                            <div className="bg-slate-800 border border-blue-500 rounded-lg p-3 shadow-2xl opacity-90 text-sm font-medium text-slate-200">
                                                {activeDragItem.itemName || 'Checklist Item'}
                                            </div>
                                        )}
                                    </DragOverlay>
                                </DndContext>

                                {locations.length === 0 && builderItems.length === 0 && (
                                    <p className="text-center text-slate-500 italic text-sm py-8">Add a compartment above to start building your checklist.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── REPORTS TAB ── */}
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
                                        <td className="p-4 text-slate-400">{r.items?.filter((i: any) => i.status !== 'NA').length || 0} / {r.items?.length || 0} items</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleViewReport(r.id)}
                                                    className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg">
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                                <button onClick={() => handleDeleteReport(r.id)}
                                                    className="text-sm font-medium text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg">
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">No reports found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── IMAGES TAB ── */}
            {subTab === 'images' && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">System Images Manager</h3>
                        <button onClick={fetchImages} className="text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg">Refresh</button>
                    </div>
                    {loadingImages ? (
                        <div className="text-center p-8 text-slate-400">Loading…</div>
                    ) : images.length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-slate-700 rounded-lg text-slate-500 italic">No images uploaded.</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {images.map(img => (
                                <div key={img.name} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col group">
                                    <div className="h-32 relative overflow-hidden">
                                        <a href={img.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-105" />
                                    </div>
                                    <div className="p-3 text-xs flex flex-col gap-1 border-t border-slate-700 bg-slate-800">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-medium truncate text-slate-300 flex-1 break-all" title={img.name}>{img.name}</p>
                                            <button onClick={() => handleDeleteImage(img.name)} className="text-slate-500 hover:text-red-400 p-1" title="Delete">
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

            {/* ── Report Viewer Modal ── */}
            {viewingReport && (
                <div className="fixed inset-0 bg-slate-900/90 z-[100] flex justify-center items-center overflow-hidden backdrop-blur-sm p-4 md:p-8">
                    <div className="bg-slate-900 w-full max-w-5xl h-full max-h-[90vh] flex flex-col border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Truck className="w-6 h-6 text-blue-400" /> {viewingReport.apparatus?.name} Check
                                </h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(viewingReport.createdAt), 'MMM d, yyyy')}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(viewingReport.createdAt), 'hh:mm a')}</span>
                                    <select value={viewingReport.status} onChange={e => handleStatusChange(viewingReport.id, e.target.value)}
                                        className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wider outline-none cursor-pointer ${viewingReport.status === 'Open' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                        <option value="Open" className="bg-slate-800 text-slate-200">OPEN</option>
                                        <option value="Closed" className="bg-slate-800 text-slate-200">CLOSED</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleDeleteReport(viewingReport.id)}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg border border-red-500/20">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setViewingReport(null)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-900/50">
                            {(() => {
                                const grouped = (viewingReport.items || []).reduce((acc: any, item: any) => {
                                    const key = item.templateItem?.location?.name || 'Uncategorized';
                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(item);
                                    return acc;
                                }, {});
                                return Object.entries(grouped).map(([locName, items]: [string, any]) => (
                                    <div key={locName} className="mb-6 last:mb-0">
                                        <h4 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
                                            <MapPin className="w-5 h-5 text-blue-400" /> {locName}
                                        </h4>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {items.map((item: any) => (
                                                <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4">
                                                    <div className="flex-1">
                                                        <h5 className="font-bold text-white text-base">{item.templateItem?.itemName}</h5>
                                                        {item.status ? (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'YES' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : item.status === 'NO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'}`}>
                                                                    {item.status}
                                                                </span>
                                                                <span className="text-xs text-slate-400">by {item.completedByUser?.name || 'Unknown'}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="mt-2 inline-block px-2 py-1 rounded text-xs font-bold uppercase bg-slate-800 text-slate-500 border border-slate-700 border-dashed">NOT CHECKED</span>
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
                                                            <a href={item.templateItem.adminPhotoUrl} target="_blank" rel="noopener noreferrer"
                                                                className="block w-full rounded bg-black/20 border border-slate-700 hover:border-blue-500 overflow-hidden">
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
