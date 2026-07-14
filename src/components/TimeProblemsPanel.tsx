'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';

type TimeEntry = {
    id: string;
    firefighterId: string;
    firefighter: { name: string };
    clockIn: string;
    clockOut: string | null;
};

type TimeProblem = {
    id: string;
    status: 'PENDING' | 'APPROVED';
    reviewedAt: string | null;
    reviewedBy: { name: string } | null;
    timeEntry: TimeEntry;
};

type ProblemView = 'pending' | 'history';

export default function TimeProblemsPanel({
    onEdit,
    onMessage,
}: {
    onEdit: (entry: TimeEntry) => void;
    onMessage: (message: string) => void;
}) {
    const [problems, setProblems] = useState<TimeProblem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<ProblemView>('pending');
    const [query, setQuery] = useState('');

    const fetchProblems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/time-problems');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load potential time problems');
            setProblems(Array.isArray(data) ? data : []);
        } catch (error) {
            onMessage(error instanceof Error ? error.message : 'Failed to load potential time problems');
        } finally {
            setLoading(false);
        }
    }, [onMessage]);

    useEffect(() => {
        fetchProblems();
        const refresh = () => fetchProblems();
        window.addEventListener('time-problems-updated', refresh);
        return () => window.removeEventListener('time-problems-updated', refresh);
    }, [fetchProblems]);

    const approve = async (id: string) => {
        try {
            const res = await fetch(`/api/time-problems/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to approve time record');
            setProblems((current) => current.map((problem) => problem.id === id ? data : problem));
            onMessage('Long shift approved and moved to Approval History.');
        } catch (error) {
            onMessage(error instanceof Error ? error.message : 'Failed to approve time record');
        }
    };

    const pendingCount = problems.filter((problem) => problem.status === 'PENDING').length;
    const approvedCount = problems.filter((problem) => problem.status === 'APPROVED').length;

    const visibleProblems = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return problems.filter((problem) => {
            if (view === 'pending' && problem.status !== 'PENDING') return false;
            if (view === 'history' && problem.status !== 'APPROVED') return false;
            if (!normalizedQuery) return true;

            const entry = problem.timeEntry;
            const dateValues = [entry.clockIn, entry.clockOut, problem.reviewedAt]
                .filter((value): value is string => Boolean(value))
                .flatMap((value) => {
                    const date = new Date(value);
                    return [
                        value,
                        format(date, 'MM/dd/yyyy'),
                        format(date, 'MMMM d yyyy'),
                        format(date, 'MMM d yyyy'),
                        format(date, 'yyyy-MM-dd'),
                    ];
                });
            const searchableText = [
                entry.firefighter.name,
                problem.reviewedBy?.name || '',
                ...dateValues,
            ].join(' ').toLowerCase();

            return searchableText.includes(normalizedQuery);
        });
    }, [problems, query, view]);

    const hasAttentionItems = pendingCount > 0;
    const emptyMessage = query.trim()
        ? 'No records match that person or date.'
        : view === 'pending'
            ? 'No shifts longer than 12 hours need attention.'
            : 'No approved long shifts have been archived yet.';

    return (
        <div className={`bg-slate-800 rounded-2xl p-4 sm:p-6 border ${hasAttentionItems ? 'border-amber-500/40' : 'border-slate-700'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                    <h2 className="text-xl font-bold flex flex-wrap items-center gap-2">
                        {hasAttentionItems ? (
                            <AlertTriangle className="text-amber-400" />
                        ) : (
                            <CheckCircle className="text-green-400" />
                        )}
                        Potential Time Problems
                        <span className={`text-sm font-semibold px-2 py-0.5 rounded ${hasAttentionItems ? 'bg-amber-500/15 text-amber-300' : 'bg-green-500/15 text-green-400'}`}>
                            {hasAttentionItems ? `${pendingCount} need review` : 'All clear'}
                        </span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {hasAttentionItems ? 'Review shifts longer than 12 hours.' : 'There are no unresolved long shifts.'}
                    </p>
                </div>
                <button onClick={fetchProblems} className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-lg" title="Refresh potential time problems">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                <div className="inline-flex bg-slate-900/70 border border-slate-700 rounded-lg p-1 self-start">
                    <button
                        onClick={() => setView('pending')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'pending' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Needs Review ({pendingCount})
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'history' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Approval History ({approvedCount})
                    </button>
                </div>

                <label className="relative block w-full md:w-72">
                    <span className="sr-only">Search potential time problems by person or date</span>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search person or date..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </label>
            </div>

            {loading ? (
                <p className="text-slate-400 text-center py-6">Checking for long shifts...</p>
            ) : visibleProblems.length === 0 ? (
                <div className="text-center py-7 border border-dashed border-slate-700 rounded-lg bg-slate-900/20">
                    {view === 'pending' && !query.trim() && <CheckCircle className="w-7 h-7 text-green-400 mx-auto mb-2" />}
                    <p className="text-slate-400">{emptyMessage}</p>
                </div>
            ) : (
                <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full text-left min-w-max">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                <th className="pb-3 px-3">Person</th>
                                <th className="pb-3 px-3">Clock In</th>
                                <th className="pb-3 px-3">Clock Out</th>
                                <th className="pb-3 px-3">Duration</th>
                                <th className="pb-3 px-3">Review</th>
                                <th className="pb-3 px-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {visibleProblems.map((problem) => {
                                const entry = problem.timeEntry;
                                const durationMs = entry.clockOut ? new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime() : 0;
                                const hours = Math.floor(durationMs / 3600000);
                                const minutes = Math.floor((durationMs % 3600000) / 60000);
                                return (
                                    <tr key={problem.id} className={problem.status === 'PENDING' ? 'bg-amber-500/5' : ''}>
                                        <td className="py-3 px-3 font-semibold">{entry.firefighter.name}</td>
                                        <td className="py-3 px-3 text-slate-300">{format(new Date(entry.clockIn), 'MM/dd/yy - h:mm a')}</td>
                                        <td className="py-3 px-3 text-slate-300">{entry.clockOut ? format(new Date(entry.clockOut), 'MM/dd/yy - h:mm a') : 'Active'}</td>
                                        <td className={`py-3 px-3 font-mono ${problem.status === 'PENDING' ? 'text-amber-300' : 'text-slate-300'}`}>{hours}h {minutes}m</td>
                                        <td className="py-3 px-3">
                                            {problem.status === 'APPROVED' ? (
                                                <div className="text-green-400 text-sm">
                                                    <span><CheckCircle className="w-4 h-4 inline mr-1" />Approved{problem.reviewedBy ? ` by ${problem.reviewedBy.name}` : ''}</span>
                                                    {problem.reviewedAt && <p className="text-xs text-slate-500 mt-1">{format(new Date(problem.reviewedAt), 'MMM d, yyyy h:mm a')}</p>}
                                                </div>
                                            ) : <span className="text-amber-300 text-sm">Needs review</span>}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => onEdit(entry)} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded text-sm font-medium">Edit</button>
                                                {problem.status === 'PENDING' && (
                                                    <button onClick={() => approve(problem.id)} className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded text-sm font-medium">Approve</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
