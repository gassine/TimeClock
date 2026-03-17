'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, GripVertical, Shield, Check, X, Calendar, AlertTriangle, ChevronDown, Search, Filter, Edit2, Save } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Certification = {
    id: string;
    name: string;
    order: number;
    memberCertifications: MemberCertification[];
};

type MemberCertification = {
    id: string;
    firefighterId: string;
    certificationId: string;
    certDate: string | null;
    expiryDate: string | null;
};

type Firefighter = {
    id: string;
    name: string;
    pin: string;
    isActive: boolean;
    role: { name: string };
};

type ReminderRule = {
    id: string;
    daysBeforeExpiry: number;
    color: string;
    label: string | null;
};

type CertSettings = {
    id: string;
    showToUsers: boolean;
};

function formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

function toInputDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toISOString().split('T')[0];
}

function getDaysRemaining(expiryDate: string | null): number | null {
    if (!expiryDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    return Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getCellColor(mc: MemberCertification | null, rules: ReminderRule[]): { bg: string; text: string; border: string } | null {
    if (!mc) return null;
    const days = getDaysRemaining(mc.expiryDate);
    if (days === null) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' };
    if (days < 0) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' };
    const sorted = [...rules].sort((a, b) => a.daysBeforeExpiry - b.daysBeforeExpiry);
    for (const rule of sorted) {
        if (days <= rule.daysBeforeExpiry) {
            return { bg: `bg-[${rule.color}]/20`, text: `text-[${rule.color}]`, border: `border-[${rule.color}]/40` };
        }
    }
    return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' };
}

function getCellColorStyle(mc: MemberCertification | null, rules: ReminderRule[]): React.CSSProperties {
    if (!mc) return {};
    const days = getDaysRemaining(mc.expiryDate);
    if (days === null) return { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' };
    if (days < 0) return { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' };
    const sorted = [...rules].sort((a, b) => a.daysBeforeExpiry - b.daysBeforeExpiry);
    for (const rule of sorted) {
        if (days <= rule.daysBeforeExpiry) {
            const hex = rule.color;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return {
                backgroundColor: `rgba(${r},${g},${b},0.15)`,
                borderColor: `rgba(${r},${g},${b},0.35)`,
                color: hex,
            };
        }
    }
    return { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' };
}

// ── Sortable cert row for manage tab ──────────────────────────────────────────
function SortableCertRow({ cert, onRename, onDelete }: {
    cert: Certification;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cert.id });
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(cert.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const save = () => {
        if (name.trim() && name.trim() !== cert.name) onRename(cert.id, name.trim());
        setEditing(false);
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 group">
            <button {...attributes} {...listeners} className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none">
                <GripVertical className="w-5 h-5" />
            </button>
            {editing ? (
                <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(cert.name); setEditing(false); } }}
                    onBlur={save}
                    autoFocus
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
            ) : (
                <span className="flex-1 text-white font-medium">{cert.name}</span>
            )}
            <span className="text-xs text-slate-500">{cert.memberCertifications.length} certified</span>
            <button onClick={() => { setEditing(true); }} className="text-slate-500 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 p-1">
                <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(cert.id)} className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CertificationsAdmin({ firefighters: initialFFs }: { firefighters: any[] }) {
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [firefighters] = useState<Firefighter[]>(initialFFs.filter((f: any) => f.isActive));
    const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
    const [settings, setSettings] = useState<CertSettings>({ id: '', showToUsers: true });
    const [section, setSection] = useState<'matrix' | 'manage' | 'settings'>('matrix');
    const [loading, setLoading] = useState(true);

    // Matrix filters
    const [search, setSearch] = useState('');
    const [filterCertId, setFilterCertId] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'certified' | 'not-certified' | 'expiring' | 'expired'>('all');

    // Cell modal
    const [cellModal, setCellModal] = useState<{ firefighterId: string; certificationId: string } | null>(null);
    const [cellForm, setCellForm] = useState({ certDate: '', expiryDate: '' });
    const [cellSaving, setCellSaving] = useState(false);

    // Manage tab
    const [newCertName, setNewCertName] = useState('');
    const [addingCert, setAddingCert] = useState(false);

    // Settings tab
    const [newRule, setNewRule] = useState({ daysBeforeExpiry: 30, color: '#ef4444', label: '' });
    const [addingRule, setAddingRule] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [certsRes, rulesRes, settingsRes] = await Promise.all([
                fetch('/api/certifications'),
                fetch('/api/certification-rules'),
                fetch('/api/certifications/settings'),
            ]);
            const [certs, rules, sett] = await Promise.all([certsRes.json(), rulesRes.json(), settingsRes.json()]);
            setCertifications(certs);
            setReminderRules(rules);
            setSettings(sett);
        } finally {
            setLoading(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getMemberCert = (firefighterId: string, certificationId: string): MemberCertification | null =>
        certifications.find(c => c.id === certificationId)?.memberCertifications.find(mc => mc.firefighterId === firefighterId) || null;

    const isExpiring = (mc: MemberCertification | null): boolean => {
        if (!mc || !mc.expiryDate) return false;
        const days = getDaysRemaining(mc.expiryDate);
        if (days === null || days < 0) return false;
        return reminderRules.some(r => days <= r.daysBeforeExpiry);
    };

    const isExpired = (mc: MemberCertification | null): boolean => {
        if (!mc || !mc.expiryDate) return false;
        const days = getDaysRemaining(mc.expiryDate);
        return days !== null && days < 0;
    };

    // ── Matrix filter ─────────────────────────────────────────────────────────
    const filteredFFs = firefighters.filter(ff => {
        if (search && !ff.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCertId) {
            const mc = getMemberCert(ff.id, filterCertId);
            if (filterStatus === 'certified' && !mc) return false;
            if (filterStatus === 'not-certified' && mc) return false;
            if (filterStatus === 'expiring' && !isExpiring(mc)) return false;
            if (filterStatus === 'expired' && !isExpired(mc)) return false;
        } else {
            if (filterStatus === 'certified') {
                if (!certifications.some(c => getMemberCert(ff.id, c.id))) return false;
            } else if (filterStatus === 'not-certified') {
                if (certifications.some(c => getMemberCert(ff.id, c.id))) return false;
            } else if (filterStatus === 'expiring') {
                if (!certifications.some(c => isExpiring(getMemberCert(ff.id, c.id)))) return false;
            } else if (filterStatus === 'expired') {
                if (!certifications.some(c => isExpired(getMemberCert(ff.id, c.id)))) return false;
            }
        }
        return true;
    });

    // ── Cell modal ────────────────────────────────────────────────────────────
    const openCell = (firefighterId: string, certificationId: string) => {
        const mc = getMemberCert(firefighterId, certificationId);
        setCellForm({
            certDate: toInputDate(mc?.certDate || null),
            expiryDate: toInputDate(mc?.expiryDate || null),
        });
        setCellModal({ firefighterId, certificationId });
    };

    const saveCell = async () => {
        if (!cellModal) return;
        setCellSaving(true);
        try {
            const mc = getMemberCert(cellModal.firefighterId, cellModal.certificationId);
            if (mc) {
                await fetch(`/api/member-certifications/${mc.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ certDate: cellForm.certDate || null, expiryDate: cellForm.expiryDate || null }),
                });
            } else {
                await fetch('/api/member-certifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...cellModal, certDate: cellForm.certDate || null, expiryDate: cellForm.expiryDate || null }),
                });
            }
            await fetchAll();
            setCellModal(null);
        } finally {
            setCellSaving(false);
        }
    };

    const revokeCell = async () => {
        if (!cellModal) return;
        const mc = getMemberCert(cellModal.firefighterId, cellModal.certificationId);
        if (!mc) return;
        setCellSaving(true);
        try {
            await fetch(`/api/member-certifications/${mc.id}`, { method: 'DELETE' });
            await fetchAll();
            setCellModal(null);
        } finally {
            setCellSaving(false);
        }
    };

    // ── Manage tab ────────────────────────────────────────────────────────────
    const addCert = async () => {
        if (!newCertName.trim()) return;
        setAddingCert(true);
        try {
            await fetch('/api/certifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCertName.trim() }),
            });
            setNewCertName('');
            await fetchAll();
        } finally {
            setAddingCert(false);
        }
    };

    const renameCert = async (id: string, name: string) => {
        await fetch(`/api/certifications/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        await fetchAll();
    };

    const deleteCert = async (id: string) => {
        if (!confirm('Delete this certification? All member records will also be removed.')) return;
        await fetch(`/api/certifications/${id}`, { method: 'DELETE' });
        await fetchAll();
    };

    const handleCertDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = certifications.findIndex(c => c.id === active.id);
        const newIndex = certifications.findIndex(c => c.id === over.id);
        const reordered = arrayMove(certifications, oldIndex, newIndex);
        setCertifications(reordered);
        await fetch('/api/certifications/reorder', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reordered.map((c, i) => ({ id: c.id, order: i }))),
        });
    };

    // ── Settings tab ──────────────────────────────────────────────────────────
    const toggleShowToUsers = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch('/api/certifications/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showToUsers: !settings.showToUsers }),
            });
            setSettings(await res.json());
        } finally {
            setSavingSettings(false);
        }
    };

    const addRule = async () => {
        if (!newRule.daysBeforeExpiry || !newRule.color) return;
        setAddingRule(true);
        try {
            await fetch('/api/certification-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRule),
            });
            setNewRule({ daysBeforeExpiry: 30, color: '#ef4444', label: '' });
            await fetchAll();
        } finally {
            setAddingRule(false);
        }
    };

    const deleteRule = async (id: string) => {
        await fetch(`/api/certification-rules/${id}`, { method: 'DELETE' });
        setReminderRules(prev => prev.filter(r => r.id !== id));
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return <div className="flex items-center justify-center py-20 text-slate-400">Loading certifications...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header + sub-tabs */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-blue-400 w-6 h-6" /> Certifications
                    </h2>
                    <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                        {(['matrix', 'manage', 'settings'] as const).map(s => (
                            <button key={s} onClick={() => setSection(s)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${section === s ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                {s === 'matrix' ? 'Cert Matrix' : s === 'manage' ? 'Manage Certs' : 'Settings'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── CERT MATRIX ── */}
                {section === 'matrix' && (
                    <div className="p-6 space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by name..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                                />
                            </div>
                            <select
                                value={filterCertId}
                                onChange={e => setFilterCertId(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                            >
                                <option value="">All Certifications</option>
                                {certifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value as any)}
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                            >
                                <option value="all">All Statuses</option>
                                <option value="certified">Certified</option>
                                <option value="not-certified">Not Certified</option>
                                <option value="expiring">Expiring Soon</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>

                        {certifications.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>No certifications defined yet.</p>
                                <button onClick={() => setSection('manage')} className="mt-2 text-blue-400 hover:underline text-sm">Add certifications in Manage tab</button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-700 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900/80">
                                            <th className="sticky left-0 z-20 bg-slate-900/95 backdrop-blur text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-r border-slate-700 min-w-[180px]">
                                                Name
                                            </th>
                                            {certifications.map(cert => (
                                                <th key={cert.id} className="px-3 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-700 min-w-[130px]">
                                                    {cert.name}
                                                    <div className="text-slate-600 font-normal normal-case tracking-normal mt-0.5">
                                                        {cert.memberCertifications.length}/{firefighters.length}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredFFs.length === 0 ? (
                                            <tr>
                                                <td colSpan={certifications.length + 1} className="text-center py-8 text-slate-500 italic text-sm">
                                                    No members match the current filters.
                                                </td>
                                            </tr>
                                        ) : filteredFFs.map((ff, idx) => (
                                            <tr key={ff.id} className={idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}>
                                                <td className="sticky left-0 z-10 bg-inherit backdrop-blur border-r border-slate-700/50 px-4 py-3 whitespace-nowrap">
                                                    <div className="font-medium text-white text-sm">{ff.name}</div>
                                                    <div className="text-xs text-slate-500">{ff.role?.name}</div>
                                                </td>
                                                {certifications.map(cert => {
                                                    const mc = getMemberCert(ff.id, cert.id);
                                                    const colorStyle = getCellColorStyle(mc, reminderRules);
                                                    const days = mc ? getDaysRemaining(mc.expiryDate) : null;
                                                    return (
                                                        <td key={cert.id} className="px-2 py-2 text-center">
                                                            <button
                                                                onClick={() => openCell(ff.id, cert.id)}
                                                                className={`w-full rounded-lg border px-2 py-2 transition-all hover:scale-105 hover:shadow-lg ${mc ? '' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}
                                                                style={mc ? { ...colorStyle, borderWidth: 1 } : undefined}
                                                                title={mc ? `Certified${mc.certDate ? ` — ${formatDate(mc.certDate)}` : ''}${mc.expiryDate ? ` — Expires ${formatDate(mc.expiryDate)}` : ''}` : 'Not certified — click to grant'}
                                                            >
                                                                {mc ? (
                                                                    <>
                                                                        <Check className="w-4 h-4 mx-auto mb-1" style={{ color: colorStyle.color }} />
                                                                        {mc.certDate && <div className="text-[10px] leading-tight" style={{ color: colorStyle.color }}>{formatDate(mc.certDate)}</div>}
                                                                        {mc.expiryDate && (
                                                                            <div className="text-[10px] leading-tight mt-0.5 font-medium" style={{ color: colorStyle.color }}>
                                                                                {days !== null && days < 0 ? 'EXPIRED' : `exp ${formatDate(mc.expiryDate)}`}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <X className="w-4 h-4 mx-auto text-slate-600" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Legend */}
                        {reminderRules.length > 0 && (
                            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-700/50">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/70" /> Valid
                                </div>
                                {[...reminderRules].sort((a, b) => a.daysBeforeExpiry - b.daysBeforeExpiry).map(rule => (
                                    <div key={rule.id} className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rule.color }} />
                                        {rule.label || `≤ ${rule.daysBeforeExpiry}d`}
                                    </div>
                                ))}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <div className="w-3 h-3 rounded-full bg-red-500/70" /> Expired
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MANAGE CERTS ── */}
                {section === 'manage' && (
                    <div className="p-6 space-y-4">
                        {/* Add new */}
                        <div className="flex gap-3">
                            <input
                                value={newCertName}
                                onChange={e => setNewCertName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCert()}
                                placeholder="New certification name..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                            />
                            <button
                                onClick={addCert}
                                disabled={addingCert || !newCertName.trim()}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {certifications.length === 0 ? (
                            <p className="text-slate-500 text-center py-8 italic">No certifications yet. Add one above.</p>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCertDragEnd}>
                                <SortableContext items={certifications.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {certifications.map(cert => (
                                            <SortableCertRow key={cert.id} cert={cert} onRename={renameCert} onDelete={deleteCert} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5" /> Drag rows to reorder — order reflects column order in the matrix.
                        </p>
                    </div>
                )}

                {/* ── SETTINGS ── */}
                {section === 'settings' && (
                    <div className="p-6 space-y-8">
                        {/* Visibility toggle */}
                        <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5 flex items-center justify-between gap-4">
                            <div>
                                <div className="font-semibold text-white mb-1">Show Certifications to Users</div>
                                <div className="text-sm text-slate-400">When enabled, a Certifications tab appears in the user dashboard.</div>
                            </div>
                            <button
                                onClick={toggleShowToUsers}
                                disabled={savingSettings}
                                className={`relative w-14 h-7 rounded-full transition-all ${settings.showToUsers ? 'bg-blue-600' : 'bg-slate-600'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings.showToUsers ? 'translate-x-7' : ''}`} />
                            </button>
                        </div>

                        {/* Reminder rules */}
                        <div>
                            <h3 className="font-bold text-white mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Expiry Reminder Rules</h3>
                            <p className="text-sm text-slate-400 mb-4">Set color thresholds for upcoming certification expirations. Rules are applied based on days remaining before expiry.</p>

                            <div className="space-y-3 mb-4">
                                {reminderRules.length === 0 && <p className="text-slate-500 italic text-sm">No rules defined. Add one below.</p>}
                                {[...reminderRules].sort((a, b) => a.daysBeforeExpiry - b.daysBeforeExpiry).map(rule => (
                                    <div key={rule.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-600 shrink-0" style={{ backgroundColor: rule.color }} />
                                        <div className="flex-1">
                                            <span className="text-white font-medium">≤ {rule.daysBeforeExpiry} days</span>
                                            {rule.label && <span className="text-slate-400 ml-2 text-sm">— {rule.label}</span>}
                                        </div>
                                        <button onClick={() => deleteRule(rule.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add rule form */}
                            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                                <h4 className="text-sm font-semibold text-slate-300">Add New Rule</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Days Before Expiry</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newRule.daysBeforeExpiry}
                                            onChange={e => setNewRule(r => ({ ...r, daysBeforeExpiry: parseInt(e.target.value) || 30 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Label (optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Expiring Soon"
                                            value={newRule.label}
                                            onChange={e => setNewRule(r => ({ ...r, label: e.target.value }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm placeholder-slate-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="color"
                                                value={newRule.color}
                                                onChange={e => setNewRule(r => ({ ...r, color: e.target.value }))}
                                                className="w-10 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent p-0.5"
                                            />
                                            <input
                                                type="text"
                                                value={newRule.color}
                                                onChange={e => setNewRule(r => ({ ...r, color: e.target.value }))}
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                                maxLength={7}
                                                placeholder="#ef4444"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={addRule}
                                    disabled={addingRule}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Rule
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cell modal */}
            {cellModal && (() => {
                const ff = firefighters.find(f => f.id === cellModal.firefighterId);
                const cert = certifications.find(c => c.id === cellModal.certificationId);
                const mc = getMemberCert(cellModal.firefighterId, cellModal.certificationId);
                return (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setCellModal(null); }}>
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-sm p-6 space-y-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{cert?.name}</h3>
                                    <p className="text-slate-400 text-sm">{ff?.name}</p>
                                </div>
                                <button onClick={() => setCellModal(null)} className="text-slate-500 hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${mc ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                {mc ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                {mc ? 'Currently Certified' : 'Not Certified'}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 font-medium">Certification Date (optional)</label>
                                    <input
                                        type="date"
                                        value={cellForm.certDate}
                                        onChange={e => setCellForm(f => ({ ...f, certDate: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 font-medium">Expiration Date (optional)</label>
                                    <input
                                        type="date"
                                        value={cellForm.expiryDate}
                                        onChange={e => setCellForm(f => ({ ...f, expiryDate: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={saveCell}
                                    disabled={cellSaving}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {cellSaving ? 'Saving...' : <><Check className="w-4 h-4" /> {mc ? 'Update' : 'Grant'}</>}
                                </button>
                                {mc && (
                                    <button
                                        onClick={revokeCell}
                                        disabled={cellSaving}
                                        className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Revoke
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
