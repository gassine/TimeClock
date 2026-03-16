import React, { useState, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, FileText, ArrowRight, User, Calendar, MapPin, Clock, Truck } from 'lucide-react';
import { format } from 'date-fns';

type RequestDetailModalProps = {
    request: any;
    onClose: () => void;
    onApprove: (id: string, adminNotes: string) => Promise<void>;
    onDeny: (id: string, adminNotes: string) => Promise<void>;
    incidentTypes: any[];
    firefighters: any[];
    apparatus: any[];
};

export default function RequestDetailModal({ request, onClose, onApprove, onDeny, incidentTypes, firefighters, apparatus }: RequestDetailModalProps) {
    const [viewMode, setViewMode] = useState<'proposed' | 'current'>('proposed');
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const currentReport = request.report;

    // Hydrate proposed report from JSON + Reference Data
    const proposedReport = useMemo(() => {
        if (!request.proposedChanges) return currentReport;

        try {
            const changes = JSON.parse(request.proposedChanges);
            const base = { ...currentReport, ...changes };

            // Hydrate relations
            if (changes.incidentTypeId) {
                base.incidentType = incidentTypes.find(t => t.id === changes.incidentTypeId) || { name: 'Unknown' };
            }
            // Apparatus/Personnel are tricky, stored as array of objects in changes
            if (changes.assignedApparatus) {
                base.assignedApparatus = changes.assignedApparatus.map((app: any) => ({
                    id: 'temp-' + Math.random(),
                    apparatusId: app.apparatusId,
                    apparatus: apparatus.find(a => a.id === app.apparatusId) || { name: 'Unknown', type: 'Unknown' },
                    personnel: app.personnel.map((p: any) => ({
                        id: 'temp-p-' + Math.random(),
                        firefighterId: p.firefighterId,
                        firefighterRadioId: p.firefighterRadioId,
                        // finding name might technically require searching firefighters array
                        // but ReportDetailModal usually expects this structure?
                        // Let's rely on finding name in render if needed, or structured here.
                        // Ideally we attach the firefighter object if ReportDetail uses it.
                    }))
                }));
            }

            return base;
        } catch (e) {
            console.error(e);
            return currentReport;
        }
    }, [request, currentReport, incidentTypes, apparatus]);

    const targetReport = viewMode === 'current' ? currentReport : proposedReport;

    const handleAction = async (action: 'approve' | 'deny') => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessing(true);
        try {
            if (action === 'approve') await onApprove(request.id, adminNotes);
            else await onDeny(request.id, adminNotes);
            onClose();
        } catch (e) {
            console.error(e);
            alert(`Failed to ${action}`);
        } finally {
            setProcessing(false);
        }
    };

    if (!targetReport) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FileText className="text-blue-400" />
                            Modification Request
                            <span className="text-sm font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                {request.requestType === 'general_edit' ? 'General Edit' : request.requestType}
                            </span>
                        </h2>
                        <p className="text-slate-400 mt-2 flex items-center gap-2">
                            Requested by <span className="text-white font-medium">{request.requestedByUser?.name || 'Unknown'}</span>
                            <span className="text-slate-600">•</span>
                            {format(new Date(request.createdAt), 'MMM d, yyyy HH:mm')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>

                {/* Reason & Tabs */}
                <div className="px-8 pt-6 pb-2 space-y-4 bg-slate-900">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Reason for Request</h3>
                        <p className="text-slate-200">{request.reason || 'No reason provided.'}</p>
                    </div>

                    {request.proposedChanges && (
                        <div className="flex bg-slate-800 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => setViewMode('proposed')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'proposed' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Proposed Version
                            </button>
                            <button
                                onClick={() => setViewMode('current')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'current' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Current Version
                            </button>
                        </div>
                    )}
                </div>

                {/* Report Content Preview */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-900 relative">
                    {viewMode === 'current' && <div className="absolute top-4 right-8 text-xs font-bold text-slate-500 uppercase border border-slate-700 px-2 py-1 rounded">Read Only: Current Database Record</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Incident Type</h3>
                            <p className="text-xl font-bold text-white">{targetReport.incidentType?.name || 'Unknown'}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Date & Time</h3>
                            <p className="text-lg text-slate-200 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" /> {targetReport.date ? format(new Date(targetReport.date.slice(0, 10).replace(/-/g, '/')), 'MMMM d, yyyy') : 'N/A'}
                                <Clock className="w-4 h-4 text-slate-400 ml-2" /> {targetReport.alarmTime}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Location</h3>
                            <p className="text-lg text-slate-200 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {targetReport.location}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">District / OIC</h3>
                            <p className="text-lg text-slate-200">{targetReport.district} / {targetReport.officerInCharge || 'N/A'}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Summary</h3>
                        <p className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {targetReport.incidentSummary}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Apparatus & Personnel</h3>
                        <div className="space-y-3">
                            {targetReport.assignedApparatus?.map((app: any, idx: number) => (
                                <div key={idx} className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Truck className="w-5 h-5 text-blue-400" />
                                        <span className="font-bold text-slate-200">{app.apparatus?.name || 'Unknown App'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {app.personnel?.map((p: any, pIdx: number) => (
                                            <div key={pIdx} className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-lg text-sm text-slate-300 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-slate-500" />
                                                {firefighters.find(f => f.id === p.firefighterId)?.name || 'Unknown FF'}
                                                <span className="text-slate-500 text-xs font-mono">({p.firefighterRadioId})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {(!targetReport.assignedApparatus || targetReport.assignedApparatus.length === 0) && <p className="text-slate-500 italic">No apparatus assigned.</p>}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-4">
                    <textarea
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Admin Notes (Optional)..."
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} disabled={processing} className="px-6 py-2 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                        <button onClick={() => handleAction('deny')} disabled={processing} className="px-6 py-2 rounded-lg font-bold bg-slate-800 hover:bg-red-500/20 text-red-400 border border-transparent hover:border-red-500/50 transition-all">Deny Request</button>
                        <button onClick={() => handleAction('approve')} disabled={processing} className="px-6 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                            {processing ? 'Processing...' : <><CheckCircle className="w-4 h-4" /> Approve Request</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
