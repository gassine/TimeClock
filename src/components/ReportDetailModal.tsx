'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Clock, MapPin, Truck, CheckCircle, Edit2, AlertTriangle, History, FileText } from 'lucide-react';

type ReportDetailModalProps = {
    report: any;
    onClose: () => void;
    onEdit?: () => void; // For Admin or Request Mod
    onStatusChange?: (statusId: string) => Promise<void>; // For Admin
    reportStatuses?: any[]; // For Admin to change status
    readOnly?: boolean; // If true, hide edit/status actions
};

export default function ReportDetailModal({ report, onClose, onEdit, onStatusChange, reportStatuses, readOnly = false }: ReportDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-50 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {report.incidentType.name}
                            <span className={`text-sm px-3 py-1 rounded-full border ${report.status.name === 'Draft' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{report.status.name}</span>
                        </h2>
                        <p className="text-slate-400 mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(report.date.slice(0, 10).replace(/-/g, '/')), 'MMMM d, yyyy')} @ {report.alarmTime}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {report.location}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex border-b border-slate-800 px-6 bg-slate-800/30">
                    <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}><FileText className="w-4 h-4" /> Details</button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}><History className="w-4 h-4" /> History</button>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 flex-1 bg-slate-900 relative">
                    {activeTab === 'details' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-200">
                            <section className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Incident Summary</h3>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800/50 p-4 rounded-xl border border-slate-800">{report.incidentSummary}</p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Apparatus & Personnel</h3>
                                <div className="grid gap-4">
                                    {report.assignedApparatus?.map((assignment: any) => (
                                        <div key={assignment.id} className="bg-slate-800/30 rounded-xl border border-slate-800 p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Truck className="text-blue-400 w-5 h-5" />
                                                <span className="font-bold text-lg">{assignment.apparatus.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${assignment.apparatus.status === 'In Service' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{assignment.apparatus.status}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {assignment.personnel.map((p: any) => (
                                                    <div key={p.id} className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                                                        <span className="text-sm text-slate-300">
                                                            {p.firefighter?.name || 'Unknown User'}
                                                            <span className="text-slate-500 ml-1">({p.firefighterRadioId})</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(!report.assignedApparatus || report.assignedApparatus.length === 0) && <p className="text-slate-500 italic">No apparatus assigned.</p>}
                                </div>
                            </section>

                            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                                <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">District</h3><p className="text-lg font-medium">{report.district}</p></div>
                                <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Officer In Charge</h3><p className="text-lg font-medium">{report.officerInCharge || 'N/A'}</p></div>
                                <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">ESO Report</h3><p className="text-lg font-medium flex items-center gap-2">{report.esoReportCompleted ? <CheckCircle className="text-green-500 w-5 h-5" /> : <X className="text-slate-600 w-5 h-5" />}{report.esoReportCompleted ? 'Completed' : 'Not Completed'}</p></div>
                                <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Reporter</h3><p className="text-lg font-medium">{report.createdByUser?.name}<span className="text-sm text-slate-500 ml-2">({report.createdByRadioId})</span></p></div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                            {!report.auditLogs || report.auditLogs.length === 0 ? (
                                <p className="text-slate-500 italic text-center py-8">No history recorded.</p>
                            ) : (
                                <div className="relative pl-4 space-y-8 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                    {report.auditLogs.map((log: any) => (
                                        <div key={log.id} className="relative z-10">
                                            <div className="absolute -left-[1.35rem] top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-600 ring-4 ring-slate-900" />
                                            <div>
                                                <p className="text-sm text-slate-400 font-mono mb-1">{format(new Date(log.createdAt), 'MMM d, yyyy @ HH:mm')}</p>
                                                <h4 className="font-bold text-white text-lg">{log.action.replace(/_/g, ' ')}</h4>
                                                {log.details && <p className="text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-2">{log.details}</p>}
                                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                                    Action by: <span className="font-mono bg-slate-800 px-1 rounded">{log.actorId}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                            {onStatusChange && reportStatuses && (
                                <select
                                    value={report.statusId}
                                    onChange={(e) => onStatusChange(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2.5"
                                >
                                    {reportStatuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Close</button>
                            {onEdit && (
                                <button onClick={onEdit} className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2">
                                    <Edit2 className="w-4 h-4" /> Edit Report
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {readOnly && (
                    <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Close</button>
                        {onEdit && (
                            <button onClick={onEdit} className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2">
                                <Edit2 className="w-4 h-4" /> Request to Reopen
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
