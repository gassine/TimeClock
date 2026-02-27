'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Clock, Calendar, CheckCircle, AlertCircle, Edit2, X, Save, AlertTriangle, Plus, MessageSquare, Trash2, FileText, ClipboardList, Truck, Users, BookOpen } from 'lucide-react';
import FieldReportForm from './FieldReportForm';
import ReportDetailModal from './ReportDetailModal';
import UserTruckChecks from './UserTruckChecks';
import UserTraining from './UserTraining';
import { format } from 'date-fns';
import { formatPhoneNumber } from '@/lib/utils';

type UserDashboardProps = {
    user: {
        id: string;
        name: string;
        isAdmin: boolean;
        role: string;
    };
};

export default function UserDashboard({ user }: UserDashboardProps) {
    const [stats, setStats] = useState({ weekHours: 0, monthHours: 0, weekCalls: 0, monthCalls: 0 });
    const [entries, setEntries] = useState<any[]>([]);
    const [activePersonnel, setActivePersonnel] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);

    // Request Form
    const [reqDateIn, setReqDateIn] = useState('');
    const [reqTimeIn, setReqTimeIn] = useState('');
    const [reqDateOut, setReqDateOut] = useState('');
    const [reqTimeOut, setReqTimeOut] = useState('');
    const [reqReason, setReqReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Issues State
    // Issues State
    const [issues, setIssues] = useState<any[]>([]);
    const [issueModalOpen, setIssueModalOpen] = useState(false);
    const [issueForm, setIssueForm] = useState({ title: '', description: '' });
    const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<{ id: string, content: string } | null>(null);
    const [editingIssue, setEditingIssue] = useState<{ id: string, title: string, description: string } | null>(null);

    // UI State
    const [activeTab, setActiveTab] = useState<'timesheet' | 'issues' | 'reports' | 'truck-checks' | 'directory' | 'training'>('timesheet');

    // Directory State
    const [directoryData, setDirectoryData] = useState<any[]>([]);
    const [dirSettings, setDirSettings] = useState<any>(null);
    const [directoryLoading, setDirectoryLoading] = useState(false);

    // Field Reports State
    const [drafts, setDrafts] = useState<any[]>([]);
    const [recentReports, setRecentReports] = useState<any[]>([]);
    const [totalRecent, setTotalRecent] = useState(0);
    const [recentPage, setRecentPage] = useState(0);
    const RECENT_LIMIT = 10;

    const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
    const [firefighters, setFirefighters] = useState<any[]>([]);
    const [apparatus, setApparatus] = useState<any[]>([]);
    const [reportStatuses, setReportStatuses] = useState<any[]>([]);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState<any>(null);
    const [selectedSubmittedReport, setSelectedSubmittedReport] = useState<any>(null);
    const [isRequestMode, setIsRequestMode] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Get Time Entries (Last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const res = await fetch(`/api/time-entries?firefighterId=${user.id}&start=${thirtyDaysAgo.toISOString()}`);
            const data = await res.json();

            // Get currently clocked-in personnel
            const activeRes = await fetch('/api/time-entries?activeOnly=true');
            const activeData = await activeRes.json();
            if (Array.isArray(activeData)) {
                setActivePersonnel(activeData);
            }

            // Get Issues
            const issuesRes = await fetch('/api/issues?archived=false');
            const issuesData = await issuesRes.json();
            if (Array.isArray(issuesData)) {
                setIssues(issuesData);
            } else {
                setIssues([]);
                console.error('Failed to load issues:', issuesData.error);
                setIssues([]);
                console.error('Failed to load issues:', issuesData.error);
            }

            // Get Drafts
            const draftsRes = await fetch(`/api/field-reports?isDraft=true&viewerId=${user.id}`);
            const draftsData = await draftsRes.json();
            if (Array.isArray(draftsData.reports)) setDrafts(draftsData.reports);

            // Get Recent Reports (Initial Page)
            const recentRes = await fetch(`/api/field-reports?isDraft=false&limit=10&offset=0`);
            const recentData = await recentRes.json();
            if (Array.isArray(recentData.reports)) {
                setRecentReports(recentData.reports);
                setTotalRecent(recentData.total || 0);
                setRecentPage(0);
            }

            // Get Incident Types
            const typesRes = await fetch('/api/incident-types');
            const typesData = await typesRes.json();
            if (Array.isArray(typesData)) setIncidentTypes(typesData);

            // Get Active Firefighters (for report form)
            const ffRes = await fetch('/api/firefighters?active=true');
            const ffData = await ffRes.json();
            if (Array.isArray(ffData)) setFirefighters(ffData);

            // Get Apparatus (for report form)
            const appRes = await fetch('/api/apparatus');
            const appData = await appRes.json();
            if (Array.isArray(appData)) setApparatus(appData);

            // Get Report Statuses
            const statusRes = await fetch('/api/report-statuses');
            const statusData = await statusRes.json();
            if (Array.isArray(statusData)) setReportStatuses(statusData);

            // Calculate Stats variables
            let week = 0;
            let month = 0;
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
            startOfWeek.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            if (Array.isArray(data)) {
                setEntries(data);
                data.forEach((e: any) => {
                    if (e.clockOut) {
                        const duration = (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / (1000 * 60 * 60);
                        const eDate = new Date(e.clockIn);
                        if (eDate >= startOfWeek) week += duration;
                        if (eDate >= startOfMonth) month += duration;
                    }
                });
            } else {
                setEntries([]);
                console.error('Failed to load entries:', data.error);
            }

            // Get Call Counts
            const weekCallsRes = await fetch(`/api/stats/user-call-counts?firefighterId=${user.id}&start=${startOfWeek.toISOString()}`);
            const weekCallsData = await weekCallsRes.json();
            const weekCalls = weekCallsData[user.id] || 0;

            const monthCallsRes = await fetch(`/api/stats/user-call-counts?firefighterId=${user.id}&start=${startOfMonth.toISOString()}`);
            const monthCallsData = await monthCallsRes.json();
            const monthCalls = monthCallsData[user.id] || 0;

            setStats({ weekHours: week, monthHours: month, weekCalls, monthCalls });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch data', error);
            setLoading(false);
        }
    };

    // Fetch Directory Data
    useEffect(() => {
        if (activeTab === 'directory') {
            const fetchDirectory = async () => {
                setDirectoryLoading(true);
                try {
                    const [ffRes, settingsRes] = await Promise.all([
                        fetch('/api/directory'),
                        fetch('/api/directory-settings'),
                    ]);
                    const ffData = await ffRes.json();
                    const settingsData = await settingsRes.json();
                    if (Array.isArray(ffData)) setDirectoryData(ffData);
                    setDirSettings(settingsData);
                } catch (error) {
                    console.error('Failed to load directory', error);
                } finally {
                    setDirectoryLoading(false);
                }
            };
            fetchDirectory();
        }
    }, [activeTab]);

    const loadMoreRecent = async () => {
        try {
            const nextOffset = (recentPage + 1) * RECENT_LIMIT;
            const res = await fetch(`/api/field-reports?isDraft=false&limit=${RECENT_LIMIT}&offset=${nextOffset}`);
            const data = await res.json();
            if (Array.isArray(data.reports)) {
                setRecentReports(prev => [...prev, ...data.reports]);
                setRecentPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Failed to load more reports', error);
        }
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const handleSaveReport = async (data: any) => {
        try {
            const endpoint = editingReport ? `/api/field-reports/${editingReport.id}` : '/api/field-reports';
            const method = editingReport ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, updatedByUserId: user.id })
            });

            if (res.ok) {
                setReportModalOpen(false);
                setEditingReport(null);
                fetchData(); // Refresh list
            } else {
                alert('Failed to save report');
            }
        } catch (error) {
            console.error('Error saving report:', error);
            alert('Error saving report');
        }
    };

    const handleSubmitFieldReportRequest = async (data: any, reason: string) => {
        try {
            const res = await fetch('/api/field-report-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportId: editingReport.id,
                    requestedByUserId: user.id,
                    requestedByRadioId: (user as any).radioId || 'N/A', // Check if user has this structure, actually user prop in UserDashboard might verify
                    requestType: 'general_edit',
                    reason,
                    proposedChanges: data
                })
            });

            if (res.ok) {
                setReportModalOpen(false);
                setEditingReport(null);
                setIsRequestMode(false);
                alert('Request submitted successfully!');
            } else {
                alert('Failed to submit request');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Error submitting request');
        }
    };

    const handleDeleteReport = async (id: string) => {
        if (!confirm('Delete this report?')) return;
        try {
            const res = await fetch(`/api/field-reports/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) { console.error(error); }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    };

    const openRequestModal = (entry: any) => {
        setSelectedEntry(entry);
        // Pre-fill
        if (entry) {
            const dIn = new Date(entry.clockIn);
            setReqDateIn(format(dIn, "yyyy-MM-dd'T'HH:mm"));

            if (entry.clockOut) {
                const dOut = new Date(entry.clockOut);
                setReqDateOut(format(dOut, "yyyy-MM-dd'T'HH:mm"));
            } else {
                setReqDateOut('');
            }
        } else {
            // New Entry Request (Not primarily supported by UI yet but logical)
            setReqDateIn('');
            setReqDateOut('');
        }
        setReqReason('');
        setRequestModalOpen(true);
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const requestedClockIn = new Date(reqDateIn).toISOString();
            const requestedClockOut = reqDateOut ? new Date(reqDateOut).toISOString() : null;

            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firefighterId: user.id,
                    timeEntryId: selectedEntry?.id,
                    requestedClockIn,
                    requestedClockOut,
                    reason: reqReason
                })
            });

            if (!res.ok) throw new Error('Failed to submit request');

            alert('Request submitted successfully!');
            setRequestModalOpen(false);
            // Optionally refresh or show pending status
        } catch (err) {
            alert('Error submitting request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReportIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: issueForm.title,
                    description: issueForm.description,
                    reportedById: user.id
                })
            });

            if (!res.ok) throw new Error('Failed to report issue');

            alert('Issue reported successfully!');
            setIssueModalOpen(false);
            setIssueForm({ title: '', description: '' });
            fetchData(); // Refresh list
        } catch (error) {
            console.error(error);
            alert('Failed to report issue');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleComments = (issueId: string) => {
        if (expandedIssueId === issueId) {
            setExpandedIssueId(null);
            setNewComment('');
        } else {
            setExpandedIssueId(issueId);
        }
    };

    const handleAddComment = async (issueId: string) => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newComment,
                    issueId,
                    authorId: user.id
                })
            });
            if (res.ok) {
                setNewComment('');
                fetchData();
            }
        } catch (error) {
            console.error('Failed to add comment', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            const res = await fetch(`/api/comments/${commentId}?authorId=${user.id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Failed to delete comment', error);
        }
    };

    const handleEditComment = async () => {
        if (!editingComment) return;
        try {
            const res = await fetch(`/api/comments/${editingComment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editingComment.content, authorId: user.id })
            });
            if (res.ok) {
                setEditingComment(null);
                fetchData();
            }
        } catch (error) {
            console.error('Failed to update comment', error);
        }
    };

    const handleDeleteIssue = async (issueId: string) => {
        if (!confirm('Delete this issue?')) return;
        try {
            const res = await fetch(`/api/issues/${issueId}?reportedById=${user.id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Failed to delete issue', error);
        }
    };

    const handleSaveIssue = async () => {
        if (!editingIssue) return;
        try {
            const res = await fetch(`/api/issues/${editingIssue.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingIssue.title,
                    description: editingIssue.description,
                    reportedById: user.id
                })
            });
            if (res.ok) {
                setEditingIssue(null);
                fetchData();
            }
        } catch (error) {
            console.error('Failed to update issue', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6 overflow-x-hidden">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-700 pb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="text-blue-400" /> My Dashboard
                    </h1>
                    <p className="text-slate-400">Welcome back, {user.name}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-600"
                >
                    <LogOut className="w-4 h-4" /> Log Out
                </button>
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-slate-700 mb-6 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <button
                    onClick={() => setActiveTab('timesheet')}
                    className={`pb-4 px-2 font-bold whitespace-nowrap transition-all ${activeTab === 'timesheet' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    My Timesheet
                </button>
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`pb-3 px-2 font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'directory' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
                >
                    <Users className="w-5 h-5" />
                    Directory
                </button>
                <button
                    onClick={() => setActiveTab('training')}
                    className={`pb-3 px-2 font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'training' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
                >
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    Knowledge Base
                </button>
                <button
                    onClick={() => setActiveTab('issues')}
                    className={`pb-4 px-2 font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'issues' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Issues
                    {issues.length > 0 && (
                        <span className="bg-yellow-500 text-slate-900 text-xs font-extra-bold px-2 py-0.5 rounded-full">
                            {issues.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`pb-4 px-2 font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <ClipboardList className="w-5 h-5" /> Field Reports
                    {drafts.length > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-extra-bold px-2 py-0.5 rounded-full">
                            {drafts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('truck-checks')}
                    className={`pb-3 px-2 font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'truck-checks' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
                >
                    <Truck className="w-5 h-5 text-blue-400" />
                    Truck Checks
                </button>
            </div>

            {/* TIMESHEET TAB */}
            {activeTab === 'timesheet' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Clocked-In Personnel */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden w-full">
                        <div className="p-4 md:p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <CheckCircle className="text-green-400" /> Currently On Shift
                            </h2>
                        </div>
                        <div className="p-4 md:p-6">
                            {activePersonnel.length === 0 ? (
                                <p className="text-slate-500 italic">No personnel currently clocked in.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activePersonnel.map((entry: any) => (
                                        <div key={entry.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-base truncate">{entry.firefighter?.name}</div>
                                                <div className="text-xs text-slate-400 truncate">{entry.firefighter?.role?.name || 'Firefighter'}</div>
                                            </div>
                                            <div className="ml-2 text-xs font-mono text-slate-500 shrink-0">
                                                In: {format(new Date(entry.clockIn), 'hh:mm a')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm font-medium mb-1">Activity This Week</h3>
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-3xl font-bold text-green-400">{stats.weekHours.toFixed(1)} <span className="text-lg font-normal text-slate-500">hrs</span></p>
                                </div>
                                <div className="border-l border-slate-700 pl-6">
                                    <p className="text-3xl font-bold text-blue-400">{stats.weekCalls} <span className="text-lg font-normal text-slate-500">calls</span></p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm font-medium mb-1">Activity This Month</h3>
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-3xl font-bold text-green-400">{stats.monthHours.toFixed(1)} <span className="text-lg font-normal text-slate-500">hrs</span></p>
                                </div>
                                <div className="border-l border-slate-700 pl-6">
                                    <p className="text-3xl font-bold text-blue-400">{stats.monthCalls} <span className="text-lg font-normal text-slate-500">calls</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden w-full">
                        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="text-purple-400" /> Recent Shifts
                            </h2>
                        </div>

                        <div className="overflow-x-auto w-full scrollbar-thin">
                            <table className="w-full text-left whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                <thead className="bg-slate-900/50 text-slate-400 text-sm">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Clock In</th>
                                        <th className="p-4">Clock Out</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading history...</td></tr>
                                    ) : entries.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No recent shifts found.</td></tr>
                                    ) : (
                                        entries.map(entry => {
                                            const start = new Date(entry.clockIn);
                                            const end = entry.clockOut ? new Date(entry.clockOut) : null;
                                            const duration = end ? ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2) : '-';

                                            return (
                                                <tr key={entry.id} className="hover:bg-slate-700/50 transition-colors">
                                                    <td className="p-4 text-slate-300">{format(start, 'MMM dd, yyyy')}</td>
                                                    <td className="p-4 font-mono text-green-400">{format(start, 'hh:mm a')}</td>
                                                    <td className="p-4 font-mono text-red-400">{end ? format(end, 'hh:mm a') : 'Active'}</td>
                                                    <td className="p-4">{duration} hrs</td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => openRequestModal(entry)}
                                                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                                                        >
                                                            Request Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* FIELD REPORTS TAB */}
            {activeTab === 'reports' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><ClipboardList className="text-blue-400" /> Field Reports</h2>
                        <button onClick={() => { setEditingReport(null); setIsRequestMode(false); setReportModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all">
                            <Plus className="w-5 h-5" /> New Report
                        </button>
                    </div>

                    <div className="flex flex-col gap-8">
                        {/* My Drafts section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-400 flex items-center gap-2"><Edit2 className="w-4 h-4" /> My Drafts</h3>
                            {drafts.length === 0 ? (
                                <p className="text-slate-500 italic py-4 bg-slate-800/30 rounded-xl px-4 border border-slate-800">No drafts pending.</p>
                            ) : (
                                drafts.map(report => (
                                    <div key={report.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group" onClick={() => { setEditingReport(report); setIsRequestMode(false); setReportModalOpen(true); }}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="bg-yellow-500/10 text-yellow-500 text-xs font-bold px-2 py-1 rounded border border-yellow-500/20">{report.status.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="font-bold text-lg mb-1">{report.incidentType.name}</div>
                                        <div className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                                            <Calendar className="w-3 h-3" /> {format(new Date(report.date), 'MMM d, yyyy')}
                                            <Clock className="w-3 h-3 ml-2" /> {formatTime(report.alarmTime)}
                                        </div>
                                        <div className="text-slate-500 text-sm truncate">{report.location}</div>
                                        <div className="mt-3 space-y-2">
                                            {report.assignedApparatus?.map((app: any, idx: number) => (
                                                <div key={idx} className="bg-slate-900/40 rounded p-2 text-xs border border-slate-700/50">
                                                    <div className="font-bold text-slate-300 flex items-center gap-1">
                                                        <Truck className="w-3 h-3 text-blue-400" /> {app.apparatus?.name}
                                                    </div>
                                                    <div className="text-slate-500 pl-4 mt-1">
                                                        {app.personnel?.map((p: any) => p.firefighter?.name || 'Unknown').join(', ') || 'No personnel'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Recent Submitted Reports */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                                <h3 className="text-lg font-bold text-slate-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Recent Reports</h3>
                                <span className="text-xs text-slate-500">Showing {recentReports.length} of {totalRecent}</span>
                            </div>

                            {recentReports.length === 0 ? (
                                <p className="text-slate-500 italic py-4">No recent reports found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {recentReports.map(report => (
                                        <div key={report.id} onClick={() => setSelectedSubmittedReport(report)} className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 rounded border border-blue-500/20">{report.status.name}</span>
                                                    <span className="text-slate-500 text-xs flex items-center gap-1">by <span className="text-slate-300">{report.createdByUser?.name}</span></span>
                                                </div>
                                            </div>
                                            <div className="font-bold text-lg mb-1">{report.incidentType.name}</div>
                                            <div className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                                                <Calendar className="w-3 h-3" /> {format(new Date(report.date), 'MMM d, yyyy')}
                                                <Clock className="w-3 h-3 ml-2" /> {formatTime(report.alarmTime)}
                                            </div>
                                            <div className="text-slate-500 text-sm truncate">{report.location}</div>
                                            <div className="mt-3 space-y-2">
                                                {report.assignedApparatus?.map((app: any, idx: number) => (
                                                    <div key={idx} className="bg-slate-900/40 rounded p-2 text-xs border border-slate-700/50">
                                                        <div className="font-bold text-slate-300 flex items-center gap-1">
                                                            <Truck className="w-3 h-3 text-blue-400" /> {app.apparatus?.name}
                                                        </div>
                                                        <div className="text-slate-500 pl-4 mt-1">
                                                            {app.personnel?.map((p: any) => p.firefighter?.name || 'Unknown').join(', ') || 'No personnel'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {recentReports.length < totalRecent && (
                                <button
                                    onClick={loadMoreRecent}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold rounded-xl transition-colors flex justify-center items-center gap-2"
                                >
                                    Load More Reports ({totalRecent - recentReports.length} remaining)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Field Report Modal (Edit/Create Draft/Request) */}
            {reportModalOpen && (
                <FieldReportForm
                    initialData={editingReport}
                    onSubmit={handleSaveReport}
                    onRequestSubmit={handleSubmitFieldReportRequest}
                    onCancel={() => { setReportModalOpen(false); setEditingReport(null); setIsRequestMode(false); }}
                    incidentTypes={incidentTypes}
                    firefighters={firefighters}
                    apparatus={apparatus}
                    reportStatuses={reportStatuses}
                    user={user}
                    mode={isRequestMode ? 'request' : (editingReport ? 'edit' : 'create')}
                />
            )}

            {/* View Submitted Report Modal */}
            {selectedSubmittedReport && (
                <ReportDetailModal
                    report={selectedSubmittedReport}
                    onClose={() => setSelectedSubmittedReport(null)}
                    readOnly={true}
                    isAuthor={user.id === selectedSubmittedReport.createdByUserId}
                    onEdit={() => {
                        setEditingReport(selectedSubmittedReport);
                        setIsRequestMode(true);
                        setSelectedSubmittedReport(null);
                        setReportModalOpen(true);
                    }}
                />
            )}

            {/* ISSUES TAB */}
            {activeTab === 'issues' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><AlertCircle className="text-yellow-400" /> Known Issues</h2>
                        <button onClick={() => setIssueModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all">
                            <Plus className="w-5 h-5" /> Report Issue
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {issues.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">No active issues reported.</p>
                        ) : (
                            <div className="grid gap-4">
                                {issues.map(issue => (
                                    <div key={issue.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                                        {editingIssue?.id === issue.id ? (
                                            <div className="space-y-3">
                                                <input
                                                    value={editingIssue?.title || ''}
                                                    onChange={e => editingIssue && setEditingIssue({ ...editingIssue, title: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                                                />
                                                <textarea
                                                    value={editingIssue?.description || ''}
                                                    onChange={e => editingIssue && setEditingIssue({ ...editingIssue, description: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white h-24"
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setEditingIssue(null)} className="text-slate-400 hover:text-white px-3 py-1">Cancel</button>
                                                    <button onClick={handleSaveIssue} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-lg">{issue.title}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${issue.status?.color?.includes('bg-') ? `${issue.status.color}/20 text-${issue.status.color.replace('bg-', '')}-400` : 'bg-slate-700 text-slate-300'}`}>
                                                            {issue.status?.name}
                                                        </span>
                                                        {user.id === issue.reportedById && (
                                                            <div className="flex gap-1 ml-2">
                                                                <button onClick={() => setEditingIssue(issue)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeleteIssue(issue.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-slate-400 text-sm whitespace-pre-wrap">{issue.description}</p>
                                                <div className="mt-2 text-xs text-slate-500 flex justify-between items-center">
                                                    <span>Reported by: {issue.reportedBy?.name}</span>
                                                    <span>{format(new Date(issue.createdAt), 'MMM dd, yyyy')}</span>
                                                </div>

                                                {/* Comments Section */}
                                                <div className="mt-4 pt-4 border-t border-slate-800">
                                                    <button
                                                        onClick={() => toggleComments(issue.id)}
                                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        {expandedIssueId === issue.id ? 'Hide Comments' : `View Comments (${issue.comments?.length || 0})`}
                                                    </button>
                                                </div>

                                                {expandedIssueId === issue.id && (
                                                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                                        {issue.comments?.length > 0 ? (
                                                            issue.comments.map((comment: any) => (
                                                                <div key={comment.id} className="bg-slate-800 rounded-lg p-3 text-sm">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className="font-bold text-slate-300">{comment.author?.name}</span>
                                                                        <span className="text-xs text-slate-500">{format(new Date(comment.createdAt), 'hh:mm a')}</span>
                                                                    </div>
                                                                    {editingComment?.id === comment.id ? (
                                                                        <div className="space-y-2 mt-2">
                                                                            <input
                                                                                value={editingComment?.content || ''}
                                                                                onChange={e => editingComment && setEditingComment({ ...editingComment, content: e.target.value })}
                                                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                                                                            />
                                                                            <div className="flex gap-2 justify-end">
                                                                                <button onClick={() => setEditingComment(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                                                                                <button onClick={handleEditComment} className="text-xs bg-blue-600 px-2 py-1 rounded text-white">Save</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <p className="text-slate-400 mt-1">{comment.content}</p>
                                                                            {user.id === comment.authorId && (
                                                                                <div className="flex gap-2 mt-2 justify-end">
                                                                                    <button onClick={() => setEditingComment(comment)} className="text-xs text-slate-500 hover:text-blue-400">Edit</button>
                                                                                    <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-slate-500 hover:text-red-400">Delete</button>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-slate-600 text-center text-sm italic">No comments yet.</p>
                                                        )}

                                                        <div className="flex gap-2 mt-4">
                                                            <input
                                                                placeholder="Write a comment..."
                                                                value={newComment}
                                                                onChange={e => setNewComment(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddComment(issue.id)}
                                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                            <button
                                                                onClick={() => handleAddComment(issue.id)}
                                                                disabled={!newComment.trim() || submitting}
                                                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                                            >
                                                                Post
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {requestModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg p-6 border border-slate-700 shadow-xl relative">
                        <button
                            onClick={() => setRequestModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Edit2 className="text-blue-400" /> Request Time Change
                        </h2>

                        <form onSubmit={handleSubmitRequest} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Requested In</label>
                                    <input
                                        type="datetime-local"
                                        value={reqDateIn}
                                        onChange={e => setReqDateIn(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Requested Out</label>
                                    <input
                                        type="datetime-local"
                                        value={reqDateOut}
                                        onChange={e => setReqDateOut(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Reason for Change</label>
                                <textarea
                                    value={reqReason}
                                    onChange={e => setReqReason(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500 outline-none block"
                                    placeholder="e.g. Forgot to clock out, system down..."
                                    required
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !reqReason}
                                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRequestModalOpen(false)}
                                    className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 py-2 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Issue Reporting Modal */}
            {issueModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg p-6 border border-slate-700 shadow-xl relative">
                        <button
                            onClick={() => setIssueModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <AlertTriangle className="text-yellow-400" /> Report an Issue
                        </h2>

                        <form onSubmit={handleReportIssue} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title</label>
                                <input
                                    required
                                    value={issueForm.title}
                                    onChange={e => setIssueForm({ ...issueForm, title: e.target.value })}
                                    placeholder="Brief summary of the issue"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Description</label>
                                <textarea
                                    required
                                    value={issueForm.description}
                                    onChange={e => setIssueForm({ ...issueForm, description: e.target.value })}
                                    placeholder="Describe the issue in detail..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 h-32"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full sm:flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Report'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIssueModalOpen(false)}
                                    className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 py-2 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TRUCK CHECKS TAB */}
            {activeTab === 'truck-checks' && (
                <div className="animate-in fade-in duration-300">
                    <UserTruckChecks user={user} />
                </div>
            )}

            {/* TRAINING TAB */}
            {activeTab === 'training' && (
                <div className="animate-in fade-in duration-300">
                    <UserTraining currentUser={user} />
                </div>
            )}

            {/* DIRECTORY TAB */}
            {activeTab === 'directory' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                    <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><Users className="text-emerald-400" /> Firefighter Directory</h2>
                        {directoryLoading ? (
                            <p className="text-slate-400">Loading directory...</p>
                        ) : directoryData.length === 0 ? (
                            <p className="text-slate-500">No firefighters found in directory.</p>
                        ) : (() => {
                            // Group by station, then shift, sort by role order
                            const roleOrder: string[] = dirSettings?.roleOrder || [];
                            const getRolePriority = (roleId: string) => {
                                const idx = roleOrder.indexOf(roleId);
                                return idx >= 0 ? idx : 9999;
                            };

                            const stationGroups: Record<string, any[]> = {};
                            directoryData.forEach((ff: any) => {
                                const stationName = ff.station?.name || 'Unassigned';
                                if (!stationGroups[stationName]) stationGroups[stationName] = [];
                                stationGroups[stationName].push(ff);
                            });

                            const stationOrder: string[] = dirSettings?.stationOrder || [];

                            const stationNames = Object.keys(stationGroups).sort((a, b) => {
                                if (a === 'Unassigned') return 1;
                                if (b === 'Unassigned') return -1;

                                // To sort by the Custom Station Order array, we need the Station ID, 
                                // but we grouped by Station Name. Let's find the ID for these names:
                                const idA = stationGroups[a][0]?.station?.id;
                                const idB = stationGroups[b][0]?.station?.id;

                                const idxA = idA ? stationOrder.indexOf(idA) : -1;
                                const idxB = idB ? stationOrder.indexOf(idB) : -1;

                                // If both are in the configured order array, sort by priority
                                if (idxA >= 0 && idxB >= 0) return idxA - idxB;
                                // If only A is configured, A goes first
                                if (idxA >= 0) return -1;
                                // If only B is configured, B goes first
                                if (idxB >= 0) return 1;

                                // If neither are explicitly ordered, fallback to alphabetical
                                return a.localeCompare(b);
                            });

                            const s = dirSettings || {};

                            return (
                                <div className="space-y-8">
                                    {stationNames.map(stationName => {
                                        const members = stationGroups[stationName];
                                        // Group by shift
                                        const shiftGroups: Record<string, any[]> = {};
                                        members.forEach((ff: any) => {
                                            const shiftName = ff.shift?.name || 'Unassigned';
                                            if (!shiftGroups[shiftName]) shiftGroups[shiftName] = [];
                                            shiftGroups[shiftName].push(ff);
                                        });

                                        const shiftNames = Object.keys(shiftGroups).sort((a, b) => {
                                            if (a === 'Unassigned') return 1;
                                            if (b === 'Unassigned') return -1;
                                            return a.localeCompare(b);
                                        });

                                        return (
                                            <div key={stationName} className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                                                <div className="bg-slate-700/50 px-5 py-3 border-b border-slate-600">
                                                    <h3 className="text-lg font-bold text-emerald-400">{stationName}</h3>
                                                </div>
                                                {shiftNames.map(shiftName => {
                                                    const shiftMembers = [...shiftGroups[shiftName]].sort(
                                                        (a, b) => getRolePriority(a.role?.id || '') - getRolePriority(b.role?.id || '') || a.name.localeCompare(b.name)
                                                    );

                                                    return (
                                                        <div key={shiftName} className="border-b border-slate-700/50 last:border-b-0">
                                                            <div className="px-5 py-2 bg-slate-800/50">
                                                                <span className="text-sm font-semibold text-cyan-400">{shiftName}</span>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left table-fixed">
                                                                    <thead>
                                                                        <tr className="text-slate-400 text-xs border-b border-slate-700/50">
                                                                            {s.showRadioId !== false && <th className="px-4 py-2 w-[12%]">Radio ID</th>}
                                                                            {s.showName !== false && <th className="px-4 py-2 w-[22%]">Name</th>}
                                                                            {s.showRole !== false && <th className="px-4 py-2 w-[18%]">Role</th>}
                                                                            {s.showStation !== false && <th className="px-4 py-2 w-[12%]">Station</th>}
                                                                            {s.showShift !== false && <th className="px-4 py-2 w-[12%]">Shift</th>}
                                                                            {s.showPhone !== false && <th className="px-4 py-2 w-[14%]">Phone</th>}
                                                                            {s.showStartDate !== false && <th className="px-4 py-2 w-[10%]">Start Date</th>}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-700/30">
                                                                        {shiftMembers.map((ff: any) => (
                                                                            <tr key={ff.id} className="hover:bg-slate-700/30 transition-colors">
                                                                                {s.showRadioId !== false && <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{ff.pin}</td>}
                                                                                {s.showName !== false && <td className="px-4 py-2.5 text-sm font-medium">{ff.name}</td>}
                                                                                {s.showRole !== false && <td className="px-4 py-2.5 text-sm text-slate-400">{ff.role?.name || '-'}</td>}
                                                                                {s.showStation !== false && <td className="px-4 py-2.5 text-sm text-slate-400">{ff.station?.name || '-'}</td>}
                                                                                {s.showShift !== false && <td className="px-4 py-2.5 text-sm text-slate-400">{ff.shift?.name || '-'}</td>}
                                                                                {s.showPhone !== false && <td className="px-4 py-2.5 text-sm text-slate-400">{formatPhoneNumber(ff.phoneNumber) || '-'}</td>}
                                                                                {s.showStartDate !== false && <td className="px-4 py-2.5 text-sm text-slate-400">{ff.startDate ? new Date(ff.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '-'}</td>}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
