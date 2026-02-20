'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, CheckCircle, Clock, Truck, Shield, AlertTriangle, Eye, Loader2, RefreshCw, Calendar, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type UserContext = {
    id: string;
    name: string;
};

export default function UserTruckChecks({ user }: { user: UserContext }) {
    const [reports, setReports] = useState<any[]>([]);
    const [apparatusList, setApparatusList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal & Active Report State
    const [isStartingNew, setIsStartingNew] = useState(false);
    const [selectedApparatusId, setSelectedApparatusId] = useState('');
    const [reportDate, setReportDate] = useState('');
    const [activeReport, setActiveReport] = useState<any | null>(null);
    const [syncStatus, setSyncStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        fetchData();
        fetchApparatus();
    }, []);

    // Cleanup SSE on unmount or report close
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/truck-checks/reports');
            if (res.ok) setReports(await res.json());
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchApparatus = async () => {
        const res = await fetch('/api/apparatus');
        if (res.ok) setApparatusList(await res.json());
    };

    const handleStartNewCheck = async () => {
        if (!selectedApparatusId) return;
        if (!reportDate) {
            alert('Please select a report date.');
            return;
        }
        try {
            const res = await fetch('/api/truck-checks/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apparatusId: selectedApparatusId,
                    reportDate: new Date(reportDate).toISOString()
                })
            });

            if (!res.ok) {
                const data = await res.json();
                alert(data.error);
                return;
            }

            const newReport = await res.json();
            setIsStartingNew(false);
            openReport(newReport);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Error starting check.');
        }
    };

    const openReport = async (reportProxy: any) => {
        // Fetch full detailed report
        try {
            const res = await fetch(`/api/truck-checks/reports/${reportProxy.id}`);
            if (res.ok) {
                const fullReport = await res.json();
                setActiveReport(fullReport);

                // If the report is open, establish SSE connection for realtime sync
                if (fullReport.status === 'Open') {
                    connectSSE(fullReport.id);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const connectSSE = (reportId: string) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setSyncStatus('reconnecting');
        const es = new EventSource(`/api/truck-checks/reports/${reportId}/stream`);

        es.onopen = () => {
            setSyncStatus('connected');
        };

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // If it's the initial connection ping, ignore
            if (data.status === 'connected') return;

            // It's an item update from another collaborative user
            setActiveReport((prev: any) => {
                if (!prev) return prev;
                // Replace the updated item in our local state but keep our heavily nested relational data
                const newItems = prev.items.map((it: any) =>
                    it.id === data.id ? { ...it, ...data } : it
                );
                return { ...prev, items: newItems };
            });
        };

        es.onerror = () => {
            setSyncStatus('disconnected');
            es.close();
            // Automatically try to reconnect after 3 seconds if we are still viewing
            setTimeout(() => {
                if (activeReport?.id === reportId) {
                    connectSSE(reportId);
                }
            }, 3000);
        };

        eventSourceRef.current = es;
    };

    const handleCloseReportView = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setSyncStatus('disconnected');
        setActiveReport(null);
        fetchData(); // Refresh the list
    };

    const handleItemUpdate = async (itemId: string, updates: any) => {
        if (activeReport?.status !== 'Open') return;

        // Optimistically update local UI for instant feedback
        setActiveReport((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map((it: any) =>
                    it.id === itemId
                        ? { ...it, ...updates, completedByUserId: user.id, completedByUser: { name: user.name }, completedAt: new Date().toISOString() }
                        : it
                )
            };
        });

        // Fire to the server. The server will then broadcast it via SSE, which we will also receive
        // and overwrite our state with the finalized canonical DB row (which guarantees consistency).
        try {
            await fetch(`/api/truck-checks/reports/${activeReport.id}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...updates,
                    completedByUserId: user.id,
                    completedByRadioId: 'USER_PIN' // You'd ideally pull radio ID from user profile
                })
            });
        } catch (error) {
            console.error('Failed to sync item update', error);
        }
    };

    const handleCompleteReport = async () => {
        if (!confirm('Mark report as Complete and Closed? No further edits will be allowed by users.')) return;

        try {
            const res = await fetch(`/api/truck-checks/reports/${activeReport.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Closed' })
            });
            if (res.ok) {
                handleCloseReportView();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleRequestReopen = async (reportId: string) => {
        try {
            const res = await fetch(`/api/truck-checks/requests/${reportId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestedByUserId: user.id })
            });

            if (res.ok) {
                alert('Request to reopen has been sent to the admins.');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to request reopen');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Truck Checks</h2>
                </div>
                <button
                    onClick={() => setIsStartingNew(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" /> Start Check
                </button>
            </div>

            {/* NEW REPORT MODAL */}
            {isStartingNew && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-700">
                        <h3 className="text-xl font-bold mb-4">Start New Check</h3>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Select Apparatus</label>
                        <select
                            value={selectedApparatusId}
                            onChange={(e) => setSelectedApparatusId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Choose...</option>
                            {apparatusList.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>

                        <label className="block text-sm font-medium text-slate-400 mb-2">Report Date</label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 mb-6 focus:ring-2 focus:ring-blue-500 outline-none text-slate-300"
                            required
                        />

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsStartingNew(false)} className="px-4 py-2 font-medium text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleStartNewCheck} className="px-4 py-2 font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Start</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE REPORT VIEW (Collaborative editing modal) */}
            {activeReport && (
                <div className="fixed inset-0 bg-slate-900 z-[100] flex justify-center overflow-hidden">
                    <div className="bg-slate-900 w-full max-w-5xl h-full flex flex-col border-x border-slate-800">
                        {/* Header */}
                        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0 shadow-lg">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Truck className="text-blue-400" />
                                    {activeReport.apparatus?.name} Check
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${activeReport.status === 'Open' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                        {activeReport.status}
                                    </span>
                                    {activeReport.status === 'Open' && (
                                        <span className={`text-xs flex items-center gap-1 ${syncStatus === 'connected' ? 'text-green-400' : 'text-amber-400'}`}>
                                            {syncStatus === 'connected' ? <RefreshCw className="w-3 h-3 animate-spin duration-3000" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                                            {syncStatus === 'connected' ? 'Live Sync Active' : 'Connecting...'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {activeReport.status === 'Open' && (
                                    <button
                                        onClick={handleCompleteReport}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Finalize & Close
                                    </button>
                                )}
                                <button
                                    onClick={handleCloseReportView}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
                                >
                                    Dismiss View
                                </button>
                            </div>
                        </div>

                        {/* Checklist Body */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 space-y-4 bg-slate-900">
                            {activeReport.status === 'Closed' && (
                                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 mb-6">
                                    <AlertTriangle className="text-amber-400 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-amber-400">Report Locked</h4>
                                        <p className="text-sm text-amber-200/80 mt-1">This report has been finalized and locked. Ask an admin to reopen it if you need to make changes.</p>
                                        <button
                                            onClick={() => handleRequestReopen(activeReport.id)}
                                            className="mt-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                        >
                                            Request Reopen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(() => {
                                // Group items by location name
                                const grouped = (activeReport.items || []).reduce((acc: any, item: any) => {
                                    const locName = item.templateItem?.location?.name || 'General Items';
                                    if (!acc[locName]) acc[locName] = [];
                                    acc[locName].push(item);
                                    return acc;
                                }, {});

                                return Object.entries(grouped || {}).map(([locationName, items]: [string, any]) => (
                                    <div key={locationName} className="mb-8 last:mb-0">
                                        <h4 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                            <MapPin className="w-5 h-5 text-blue-400" />
                                            {locationName}
                                        </h4>
                                        <div className="space-y-4">
                                            {items.map((item: any, idx: number) => (
                                                <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all">
                                                    {/* Sync flash effect for incoming remote changes */}
                                                    <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${item.completedByUserId !== null && item.completedByUserId !== user.id && (new Date().getTime() - new Date(item.updatedAt).getTime() < 3000)
                                                        ? 'bg-blue-500/10' : 'bg-transparent'
                                                        }`} />

                                                    <div className="flex-1">
                                                        <div className="flex items-start gap-3 mb-2">
                                                            <div className="bg-slate-700 text-slate-300 w-6 h-6 rounded flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">{idx + 1}</div>
                                                            <div>
                                                                <h4 className="font-bold text-lg text-white">{item.templateItem?.itemName}</h4>
                                                                {item.templateItem?.itemDescription && (
                                                                    <p className="text-slate-400 text-sm mt-1">{item.templateItem.itemDescription}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Status Toggles */}
                                                        <div className="flex flex-wrap gap-2 mt-4 ml-9">
                                                            {['YES', 'NO', 'NA'].map(option => {
                                                                const colors = {
                                                                    'YES': 'data-[state=active]:bg-green-600 data-[state=active]:border-green-500',
                                                                    'NO': 'data-[state=active]:bg-red-600 data-[state=active]:border-red-500',
                                                                    'NA': 'data-[state=active]:bg-slate-600 data-[state=active]:border-slate-500'
                                                                }[option];

                                                                return (
                                                                    <button
                                                                        key={option}
                                                                        disabled={activeReport.status !== 'Open'}
                                                                        data-state={item.status === option ? 'active' : 'inactive'}
                                                                        onClick={() => handleItemUpdate(item.id, { status: option })}
                                                                        className={`px-4 py-2 rounded font-bold text-sm border-2 transition-all 
                                                                            disabled:opacity-50 disabled:cursor-not-allowed
                                                                            data-[state=inactive]:bg-slate-900/50 data-[state=inactive]:border-slate-700 data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:border-slate-500
                                                                            data-[state=active]:text-white shadow-lg ${colors}`}
                                                                    >
                                                                        {option}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>

                                                        <div className="mt-4 ml-9">
                                                            <input
                                                                type="text"
                                                                disabled={activeReport.status !== 'Open'}
                                                                value={item.comments || ''}
                                                                onChange={(e) => {
                                                                    // Optimistic local update only on typing to prevent jank
                                                                    setActiveReport((prev: any) => ({
                                                                        ...prev,
                                                                        items: prev.items.map((it: any) =>
                                                                            it.id === item.id ? { ...it, comments: e.target.value } : it
                                                                        )
                                                                    }));
                                                                }}
                                                                onBlur={(e) => handleItemUpdate(item.id, { comments: e.target.value })}
                                                                placeholder="Add notes..."
                                                                className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-300 disabled:opacity-50"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Meta & Photo side */}
                                                    <div className="md:w-64 shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
                                                        <div className="text-xs text-slate-500 space-y-1 mb-4 md:mb-0">
                                                            {item.completedByUser ? (
                                                                <>
                                                                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                                                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                                                        Marked by {item.completedByUser.name}
                                                                    </div>
                                                                    {item.completedAt && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Clock className="w-3 h-3" />
                                                                            {format(new Date(item.completedAt), 'hh:mm:ss a')}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="italic">Not checked yet</div>
                                                            )}
                                                        </div>

                                                        {item.templateItem?.adminPhotoUrl && (
                                                            <div className="mt-2 text-center">
                                                                <a
                                                                    href={item.templateItem.adminPhotoUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="block w-full overflow-hidden rounded bg-black/20 border border-slate-700 hover:border-blue-500 transition-colors"
                                                                >
                                                                    <img
                                                                        src={item.templateItem.adminPhotoUrl}
                                                                        alt="Reference"
                                                                        className="max-h-24 w-full object-contain mx-auto"
                                                                    />
                                                                </a>
                                                                <span className="text-[10px] text-slate-500 mt-1 block uppercase tracking-wider font-bold">Ref Photo</span>
                                                            </div>
                                                        )}
                                                    </div>
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

            {/* DASHBOARD REPORTS LIST */}
            <div className="space-y-8">
                {['Open', 'Closed'].map(statusFilter => (
                    <div key={statusFilter} className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            {statusFilter === 'Open' ? <RefreshCw className="w-5 h-5 text-green-400" /> : <Shield className="w-5 h-5 text-slate-400" />}
                            {statusFilter} Reports
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {reports.filter(r => r.status === statusFilter).length === 0 ? (
                                <p className="text-slate-500 italic p-4 text-center border border-dashed border-slate-700 rounded-lg">No {statusFilter.toLowerCase()} reports.</p>
                            ) : (
                                reports.filter(r => r.status === statusFilter).map(r => (
                                    <div key={r.id} onClick={() => openReport(r)} className="bg-slate-900/50 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 cursor-pointer transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-white flex items-center gap-2">
                                                {r.apparatus?.name}
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${r.status === 'Open' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                                    {r.status}
                                                </span>
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                {r.status === 'Open' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Are you sure you want to delete this open report? You will have to create a new one and all progress will be lost.')) {
                                                                fetch(`/api/truck-checks/reports/${r.id}`, { method: 'DELETE' })
                                                                    .then(res => res.ok ? fetchData() : alert('Failed to delete report'))
                                                                    .catch(console.error);
                                                            }
                                                        }}
                                                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                                        title="Delete Open Report"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <Eye className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end text-sm text-slate-400">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5" /> {format(new Date(r.createdAt), 'MMM d, yyyy')}</div>
                                                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(r.createdAt), 'hh:mm a')}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
