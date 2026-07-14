
'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';

type AuditLog = {
    id: string;
    action: string;
    model: string;
    details: string;
    ipAddress: string | null;
    createdAt: string;
    admin: { name: string } | null;
};

const areaLabels: Record<string, string> = {
    TimeEntry: 'Time record',
    TimeChangeRequest: 'Time change request',
    Firefighter: 'Roster member',
    Apparatus: 'Apparatus',
    DirectorySettings: 'Directory settings',
    Issue: 'Issue',
    IssueStatus: 'Issue status',
    Role: 'Role',
    Shift: 'Shift',
    Station: 'Station',
    TrainingCategory: 'Knowledge category',
    TrainingPost: 'Knowledge post',
    TrainingReply: 'Knowledge reply',
};

const actionLabels: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Changed',
    DELETE: 'Deleted',
    APPROVE: 'Approved',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
};

export default function LogsTable() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/audit-logs')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setLogs(data);
                } else {
                    console.error('Logs data is not an array:', data);
                    setLogs([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch logs', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">Loading logs...</td>
            </tr>
        );
    }
    if (logs.length === 0) {
        return (
            <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No audit logs found.</td>
            </tr>
        );
    }

    return (
        <>
            {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0">
                    <td className="p-4 text-slate-300 whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MMM dd, hh:mm a')}
                    </td>
                    <td className="p-4 font-medium text-blue-400">
                        {log.admin?.name || 'System'}
                    </td>
                    <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'CREATE' || log.action === 'APPROVE' || log.action === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                            log.action === 'UPDATE' ? 'bg-blue-500/20 text-blue-400' :
                                log.action === 'DELETE' || log.action === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                    'bg-slate-700 text-slate-300'
                            }`}>
                            {actionLabels[log.action] || log.action.toLowerCase().replace(/^./, c => c.toUpperCase())}
                        </span>
                    </td>
                    <td className="p-4 text-slate-300 text-sm">
                        {areaLabels[log.model] || log.model.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </td>
                    <td className="p-4 text-slate-300 text-sm max-w-xl whitespace-normal" title={log.details || ''}>
                        {log.details || `${actionLabels[log.action] || log.action} ${areaLabels[log.model] || log.model}`}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs text-right">
                        {log.ipAddress || '-'}
                    </td>
                </tr>
            ))}
        </>
    );
}
