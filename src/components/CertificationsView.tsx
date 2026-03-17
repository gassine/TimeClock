'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Search } from 'lucide-react';

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
    isActive: boolean;
    role: { name: string };
};

type ReminderRule = {
    id: string;
    daysBeforeExpiry: number;
    color: string;
    label: string | null;
};

function formatDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

function getDaysRemaining(expiryDate: string | null): number | null {
    if (!expiryDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    return Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

export default function CertificationsView() {
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [firefighters, setFirefighters] = useState<Firefighter[]>([]);
    const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [filterCertId, setFilterCertId] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'certified' | 'not-certified' | 'expiring' | 'expired'>('all');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [certsRes, ffsRes, rulesRes] = await Promise.all([
                    fetch('/api/certifications'),
                    fetch('/api/firefighters'),
                    fetch('/api/certification-rules'),
                ]);
                const [certs, ffs, rules] = await Promise.all([certsRes.json(), ffsRes.json(), rulesRes.json()]);
                setCertifications(certs);
                setFirefighters(ffs.filter((f: Firefighter) => f.isActive));
                setReminderRules(rules);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getMemberCert = (firefighterId: string, certificationId: string): MemberCertification | null =>
        certifications.find(c => c.id === certificationId)?.memberCertifications.find(mc => mc.firefighterId === firefighterId) || null;

    const isExpiring = (mc: MemberCertification | null) => {
        if (!mc || !mc.expiryDate) return false;
        const days = getDaysRemaining(mc.expiryDate);
        return days !== null && days >= 0 && reminderRules.some(r => days <= r.daysBeforeExpiry);
    };

    const isExpired = (mc: MemberCertification | null) => {
        if (!mc || !mc.expiryDate) return false;
        const days = getDaysRemaining(mc.expiryDate);
        return days !== null && days < 0;
    };

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

    if (loading) {
        return (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 flex items-center justify-center text-slate-400">
                Loading certifications...
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <Shield className="text-blue-400 w-5 h-5" /> Certifications
                </h2>
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[160px]">
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
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                    >
                        <option value="">All Certifications</option>
                        {certifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="certified">Certified</option>
                        <option value="not-certified">Not Certified</option>
                        <option value="expiring">Expiring Soon</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
            </div>

            {certifications.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No certifications have been set up yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-900/70">
                                <th className="sticky left-0 z-20 bg-slate-900/95 backdrop-blur text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-r border-slate-700 min-w-[160px]">
                                    Member
                                </th>
                                {certifications.map(cert => (
                                    <th key={cert.id} className="px-3 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-700 min-w-[120px]">
                                        {cert.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFFs.length === 0 ? (
                                <tr>
                                    <td colSpan={certifications.length + 1} className="text-center py-8 text-slate-500 italic text-sm px-4">
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
                                                <div
                                                    className={`rounded-lg border px-2 py-2 ${mc ? '' : 'bg-slate-800/50 border-slate-700/50'}`}
                                                    style={mc ? { ...colorStyle, borderWidth: 1 } : undefined}
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
                                                </div>
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
                <div className="flex flex-wrap gap-3 p-4 border-t border-slate-700/50">
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
    );
}
