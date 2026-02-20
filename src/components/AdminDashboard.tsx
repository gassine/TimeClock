'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Clock, Calendar, CheckCircle, AlertCircle, Edit2, X, Save, AlertTriangle, Plus, MessageSquare, Trash2, FileText, ClipboardList, Truck, ChevronRight, ChevronDown, User, Shield, Briefcase, MapPin, Users, List, UserPlus, RefreshCw, GitPullRequest, Settings, Search, Filter, ChevronLeft, BarChart3, Loader2 } from 'lucide-react';
import FieldReportForm from './FieldReportForm';
import ReportDetailModal from './ReportDetailModal';
import RequestDetailModal from './RequestDetailModal';
import AdminTruckChecks from './AdminTruckChecks';
import { format } from 'date-fns';
import LogsTable from './LogsTable';

type Role = {
    id: string;
    name: string;
    isAdmin: boolean;
    createdAt: string;
};

type Station = {
    id: string;
    name: string;
    address: string | null;
    createdAt: string;
};

type Apparatus = {
    id: string;
    name: string;
    stationId: string;
    station: Station;
    status: string;
    createdAt: string;
};

type Firefighter = {
    id: string;
    name: string;
    roleId: string;
    role: Role;
    stationId: string | null;
    station?: Station | null;
    pin: string;
    isActive: boolean;
    createdAt: string;
};

type TimeEntry = {
    id: string;
    firefighterId: string;
    firefighter: { name: string };
    clockIn: string;
    clockOut: string | null;
};

type IssueStatus = {
    id: string;
    name: string;
    color: string;
    order: number;
    isDefault: boolean;
};

type Issue = {
    id: string;
    title: string;
    description: string;
    reportedBy: { name: string };
    statusId: string;
    status: IssueStatus;
    isArchived: boolean;
    createdAt: string;
    comments: {
        id: string;
        content: string;
        author: { name: string };
        createdAt: string;
    }[];
};



type AdminDashboardProps = {
    initialFirefighters: Firefighter[];
    initialRoles: Role[];
    initialStations: Station[];
    currentUser: { id: string; name: string };
};

export default function AdminDashboard({ initialFirefighters, initialRoles, initialStations, currentUser }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'firefighters' | 'roles' | 'stations' | 'apparatus' | 'reports' | 'requests' | 'logs' | 'issues' | 'field-reports' | 'truck-checks'>('firefighters');

    // Data States
    const [firefighters, setFirefighters] = useState<Firefighter[]>(initialFirefighters);
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    const [stations, setStations] = useState<Station[]>(initialStations);
    const [apparatus, setApparatus] = useState<Apparatus[]>([]);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [requests, setRequests] = useState<any[]>([]);

    // Issue State
    const [issues, setIssues] = useState<Issue[]>([]);
    const [issueStatuses, setIssueStatuses] = useState<IssueStatus[]>([]);
    const [issueSubTab, setIssueSubTab] = useState<'active' | 'past' | 'statuses'>('active');
    const [editingIssueStatus, setEditingIssueStatus] = useState<IssueStatus | null>(null);
    const [newIssueStatus, setNewIssueStatus] = useState({ name: '', color: 'bg-blue-500', order: 0 });
    const [newComment, setNewComment] = useState<Record<string, string>>({});

    // Field Reports State
    const [fieldReportTab, setFieldReportTab] = useState<'reports' | 'types' | 'statuses' | 'requests'>('reports');
    const [editingFieldReport, setEditingFieldReport] = useState<any>(null);
    const [fieldReportRequests, setFieldReportRequests] = useState<any[]>([]);
    const [selectedModRequest, setSelectedModRequest] = useState<any>(null);
    const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
    const [reportStatuses, setReportStatuses] = useState<any[]>([]);
    const [fieldReports, setFieldReports] = useState<any[]>([]);
    const [callCounts, setCallCounts] = useState<Record<string, number>>({});
    const [totalReportsCount, setTotalReportsCount] = useState(0);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [newIncidentType, setNewIncidentType] = useState('');
    const [newReportStatus, setNewReportStatus] = useState({ name: '', isDraftLike: false, userCanEditOwn: false, isFinal: false, order: 0 });
    const [editingReportStatus, setEditingReportStatus] = useState<any>(null);

    const handleAddComment = async (issueId: string) => {
        if (!newComment[issueId]?.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newComment[issueId],
                    issueId,
                    authorId: currentUser.id
                })
            });
            if (!res.ok) throw new Error('Failed to add comment');
            await fetchIssues();
            setNewComment(prev => ({ ...prev, [issueId]: '' }));
            setMessage('Comment added');
        } catch (error) {
            setMessage('Failed to add comment');
        } finally {
            setLoading(false);
        }
    };



    // Password Modal State
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordFirefighter, setPasswordFirefighter] = useState<Firefighter | null>(null);
    const [newPassword, setNewPassword] = useState('');

    const [showArchived, setShowArchived] = useState(false);

    // Derived State: Stable Sort (by createdAt)
    // This ensures that editing a name doesn't cause the item to jump in the list.
    // Also handling filtering for archived users
    const sortedFirefighters = [...firefighters]
        .filter(f => showArchived ? true : f.isActive)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const sortedRoles = [...roles].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const sortedStations = [...stations].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const sortedApparatus = [...apparatus].sort((a, b) => a.name.localeCompare(b.name));

    // Form States
    const [newFirefighter, setNewFirefighter] = useState<{ name: string; roleId: string; stationId: string | null; pin: string; password: string }>({ name: '', roleId: '', stationId: null, pin: '', password: '' });
    const [editingPassword, setEditingPassword] = useState('');
    const [newRole, setNewRole] = useState({ name: '', isAdmin: false });
    const [newStation, setNewStation] = useState({ name: '', address: '' });

    // Apparatus State
    const [editingApparatus, setEditingApparatus] = useState<Apparatus | null>(null);
    const [newApparatus, setNewApparatus] = useState({ name: '', stationId: '', status: 'In Service' });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Filter States
    const [filterFirefighterId, setFilterFirefighterId] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string; end: string; label: string }>({
        start: '',
        end: '',
        label: 'Recent (Last 50)',
    });

    // Helper to set date ranges
    const setPresetRange = (range: 'week' | 'month' | 'year' | 'lastYear' | 'recent') => {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        let label = '';

        switch (range) {
            case 'week':
                // Monday of current week
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                label = 'This Week';
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                label = 'This Month';
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                label = 'This Year';
                break;
            case 'lastYear':
                start = new Date(now.getFullYear() - 1, 0, 1);
                end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                label = 'Last Year';
                break;
            case 'recent':
                setDateRange({ start: '', end: '', label: 'Recent (Last 50)' });
                return;
        }
        setDateRange({ start: start.toISOString(), end: end.toISOString(), label });
    };

    // Calculate Summary Stats
    const summaryStats = timeEntries.reduce((acc, entry) => {
        const id = entry.firefighterId;
        if (!acc[id]) {
            acc[id] = { name: entry.firefighter.name, count: 0, totalMs: 0 };
        }

        if (entry.clockOut) {
            const duration = new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime();
            acc[id].totalMs += duration;
            acc[id].count += 1;
        }
        return acc;
    }, {} as Record<string, { name: string; count: number; totalMs: number }>);

    // Fetch time entries and call counts when tab/filters change
    useEffect(() => {
        if (activeTab === 'reports') {
            const params = new URLSearchParams();
            if (filterFirefighterId) params.append('firefighterId', filterFirefighterId);
            if (dateRange.start) params.append('start', dateRange.start);
            if (dateRange.end) params.append('end', dateRange.end);

            // Fetch Time Entries
            fetch(`/api/time-entries?${params.toString()}`)
                .then((res) => res.json())
                .then((data) => Array.isArray(data) && setTimeEntries(data))
                .catch(console.error);

            // Fetch Call Counts
            const callCountParams = new URLSearchParams(params);
            if (!callCountParams.has('start')) {
                // If "Recent" is selected (no start date), default call counts to last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                callCountParams.append('start', thirtyDaysAgo.toISOString());
            }

            fetch(`/api/stats/user-call-counts?${callCountParams.toString()}`)
                .then(res => res.json())
                .then(data => setCallCounts(data))
                .catch(console.error);

            // Fetch Total Unique Reports Count
            // We use the field-reports API with limit=1 just to get the 'total' field from the metadata
            const reportParams = new URLSearchParams();
            if (dateRange.start) reportParams.append('start', dateRange.start);
            if (dateRange.end) reportParams.append('end', dateRange.end);
            reportParams.append('isDraft', 'false'); // Only count submitted reports
            reportParams.append('limit', '1'); // Minimized payload

            fetch(`/api/field-reports?${reportParams.toString()}`)
                .then(res => res.json())
                .then(data => setTotalReportsCount(data.total || 0))
                .catch(console.error);

        }
    }, [activeTab, filterFirefighterId, dateRange]);

    // Fetch requests when tab changes
    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        }
        if (activeTab === 'apparatus') {
            fetchApparatus();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'issues') {
            fetchIssues();
            fetchIssueStatuses();
        }
        if (activeTab === 'field-reports') {
            fetchFieldReportConfig();
            if (fieldReportTab === 'reports') {
                fetchFieldReports();
            }
        }
    }, [activeTab, issueSubTab, fieldReportTab]);

    const fetchFieldReports = async () => {
        try {
            const res = await fetch('/api/field-reports?limit=50');
            const data = await res.json();
            if (data.reports) setFieldReports(data.reports);
        } catch (error) {
            console.error('Failed to fetch reports', error);
        }
    };

    const fetchFieldReportRequests = async () => {
        try {
            const res = await fetch('/api/field-report-requests?status=PENDING');
            if (res.ok) {
                const data = await res.json();
                setFieldReportRequests(data);
            }
        } catch (error) {
            console.error('Failed to fetch requests', error);
        }
    };

    const handleModRequestAction = async (id: string, status: 'APPROVED' | 'DENIED', adminNotes: string) => {
        try {
            const res = await fetch(`/api/field-report-requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminNotes, updatedByUserId: currentUser.id })
            });

            if (res.ok) {
                setMessage(`Request ${status.toLowerCase()} successfully`);
                fetchFieldReportRequests();
                fetchFieldReports(); // Refresh reports as they might have changed
            } else {
                alert('Failed to update request');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating request');
        }
    };

    const handleSaveFieldReport = async (data: any) => {
        try {
            const endpoint = editingFieldReport ? `/api/field-reports/${editingFieldReport.id}` : '/api/field-reports';
            const method = editingFieldReport ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, updatedByUserId: currentUser.id })
            });

            if (res.ok) {
                setEditingFieldReport(null);
                fetchFieldReports();
                setMessage('Field Report saved successfully!');
            } else {
                const errorData = await res.json();
                setMessage(`Failed to save report: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving report:', error);
            setMessage('Error saving report');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateReportStatus = async (reportId: string, statusId: string) => {
        if (!confirm('Change report status?')) return;
        try {
            const res = await fetch(`/api/field-reports/${reportId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statusId, updatedByUserId: currentUser.id })
            });
            if (res.ok) {
                const updated = await res.json();
                if (selectedReport && selectedReport.id === reportId) {
                    setSelectedReport({ ...selectedReport, status: updated.status, statusId: updated.statusId });
                }
                fetchFieldReports();
                setMessage('Report status updated successfully!');
            } else {
                const errorData = await res.json();
                setMessage(`Failed to update report status: ${errorData.error || 'Unknown error'}`);
            }
        } catch (e) {
            console.error(e);
            setMessage('Error updating report status');
        } finally {
            setLoading(false);
        }
    };

    const fetchFieldReportConfig = async () => {
        try {
            const [typesRes, statusesRes] = await Promise.all([
                fetch('/api/incident-types'),
                fetch('/api/report-statuses')
            ]);
            if (typesRes.ok) setIncidentTypes(await typesRes.json());
            if (statusesRes.ok) setReportStatuses(await statusesRes.json());
        } catch (error) {
            console.error('Failed to fetch field report config');
        }
    };

    const handleAddIncidentType = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/incident-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newIncidentType })
            });
            if (res.ok) {
                setNewIncidentType('');
                fetchFieldReportConfig();
                setMessage('Incident Type added');
            }
        } catch (error) {
            setMessage('Failed to add incident type');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteIncidentType = async (id: string) => {
        if (!confirm('Delete this type?')) return;
        setLoading(true);
        try {
            await fetch(`/api/incident-types/${id}`, { method: 'DELETE' });
            fetchFieldReportConfig();
            setMessage('Incident Type deleted');
        } catch (error) {
            setMessage('Failed to delete type');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReportStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = editingReportStatus ? `/api/report-statuses/${editingReportStatus.id}` : '/api/report-statuses';
            const method = editingReportStatus ? 'PUT' : 'POST';
            const body = editingReportStatus || newReportStatus;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setEditingReportStatus(null);
                setNewReportStatus({ name: '', isDraftLike: false, userCanEditOwn: false, isFinal: false, order: 0 });
                fetchFieldReportConfig();
                setMessage('Report Status saved');
            }
        } catch (error) {
            setMessage('Failed to save status');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReportStatus = async (id: string) => {
        if (!confirm('Delete this status?')) return;
        setLoading(true);
        try {
            await fetch(`/api/report-statuses/${id}`, { method: 'DELETE' });
            fetchFieldReportConfig();
            setMessage('Status deleted');
        } catch (error) {
            setMessage('Failed to delete status');
        } finally {
            setLoading(false);
        }
    };

    const fetchIssues = async () => {
        try {
            const archived = issueSubTab === 'past' ? 'true' : 'false';
            const res = await fetch(`/api/issues?archived=${archived}`);
            const data = await res.json();
            if (Array.isArray(data)) setIssues(data);
        } catch (error) {
            console.error('Failed to fetch issues');
        }
    };

    const fetchIssueStatuses = async () => {
        try {
            const res = await fetch('/api/issue-statuses');
            const data = await res.json();
            if (Array.isArray(data)) setIssueStatuses(data);
        } catch (error) {
            console.error('Failed to fetch statuses');
        }
    };



    const fetchApparatus = async () => {
        try {
            const res = await fetch('/api/apparatus');
            const data = await res.json();
            if (Array.isArray(data)) setApparatus(data);
        } catch (error) {
            console.error('Failed to fetch apparatus', error);
        }
    };

    const handleAddApparatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/apparatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newApparatus)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setApparatus([...apparatus, data]);
            setNewApparatus({ name: '', stationId: '', status: 'In Service' });
            setMessage('Apparatus added successfully');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateApparatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingApparatus) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/apparatus/${editingApparatus.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingApparatus)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setApparatus(apparatus.map(a => a.id === data.id ? data : a));
            setEditingApparatus(null);
            setMessage('Apparatus updated successfully');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApparatus = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/apparatus/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setApparatus(apparatus.filter(a => a.id !== id));
            setMessage('Apparatus deleted');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/requests?status=PENDING');
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch requests', error);
        }
    };

    const handleRequestAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, adminComment: status === 'APPROVED' ? 'Approved by Admin' : 'Rejected by Admin' })
            });
            if (res.ok) {
                fetchRequests();
                // Refresh reports too if Approved
                if (status === 'APPROVED') {
                    // Trigger report refresh if needed, usually via dependency change or manual call
                    // For now, simpler to just let user refresh if they switch tabs.
                }
            }
        } catch (error) {
            console.error('Failed to update request', error);
        }
    };

    const handleSetPassword = async () => {
        if (!passwordFirefighter) return;
        try {
            const res = await fetch(`/api/firefighters/${passwordFirefighter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: passwordFirefighter.name,
                    roleId: passwordFirefighter.roleId,
                    stationId: passwordFirefighter.stationId,
                    pin: passwordFirefighter.pin,
                    isActive: passwordFirefighter.isActive,
                    password: newPassword
                }),
            });

            if (res.ok) {
                setMessage('Password updated successfully');
                setPasswordModalOpen(false);
                setNewPassword('');
                setPasswordFirefighter(null);
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to set password');
            }
        } catch (e) {
            setMessage('Failed to set password');
        }
    }

    const [editingFirefighter, setEditingFirefighter] = useState<Firefighter | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editingStation, setEditingStation] = useState<Station | null>(null);

    // TIME ENTRY EDITING STATES
    const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);

    // Handlers
    const handleUpdateTimeEntry = async () => {
        if (!editingTimeEntry) return;
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/time-entries/${editingTimeEntry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clockIn: editingTimeEntry.clockIn,
                    clockOut: editingTimeEntry.clockOut
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update time entry');

            // Update local state
            setTimeEntries(timeEntries.map(entry => entry.id === data.id ? data : entry));
            setEditingTimeEntry(null);
            setMessage('Time entry updated successfully.');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTimeEntry = async (id: string) => {
        if (!confirm('Are you sure you want to delete this time entry?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete time entry');

            setTimeEntries(timeEntries.filter(t => t.id !== id));
            setEditingTimeEntry(null);
            setMessage('Time entry deleted successfully.');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleArchiveFirefighter = async (firefighter: Firefighter) => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/firefighters/${firefighter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: firefighter.name,
                    roleId: firefighter.roleId,
                    stationId: firefighter.stationId,
                    pin: firefighter.pin,
                    isActive: !firefighter.isActive
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update user status');

            setFirefighters(firefighters.map(f => f.id === firefighter.id ? { ...f, isActive: !f.isActive } : f));
            setMessage(`User ${firefighter.isActive ? 'archived' : 'restored'} successfully.`);
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFirefighter = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/firefighters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFirefighter),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create firefighter');

            setFirefighters([...firefighters, data]);
            setNewFirefighter({ name: '', roleId: '', stationId: '', pin: '', password: '' });
            setMessage('Firefighter added successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateFirefighter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFirefighter) return;
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch(`/api/firefighters/${editingFirefighter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingFirefighter.name,
                    roleId: editingFirefighter.roleId,
                    stationId: editingFirefighter.stationId,
                    pin: editingFirefighter.pin,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update firefighter');

            setFirefighters(firefighters.map(f => f.id === data.id ? data : f));
            setEditingFirefighter(null);
            setMessage('Firefighter updated successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFirefighter = async (id: string) => {
        if (!confirm('Are you sure you want to delete this firefighter?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/firefighters/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            setFirefighters(firefighters.filter(f => f.id !== id));
            setMessage('Firefighter deleted successfully');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ROLE HANDLERS
    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRole),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create role');
            setRoles([data, ...roles]);
            setNewRole({ name: '', isAdmin: false });
            setMessage('Role added successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/roles/${editingRole.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingRole.name, isAdmin: editingRole.isAdmin }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update role');
            setRoles(roles.map(r => r.id === data.id ? data : r));
            setEditingRole(null);
            setMessage('Role updated successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete role');
            setRoles(roles.filter(r => r.id !== id));
            setMessage('Role deleted successfully');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    // STATION HANDLERS
    const handleAddStation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStation),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create station');
            setStations([data, ...stations]);
            setNewStation({ name: '', address: '' });
            setMessage('Station added successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStation) return;
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/stations/${editingStation.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingStation.name, address: editingStation.address }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update station');
            setStations(stations.map(s => s.id === data.id ? data : s));
            setEditingStation(null);
            setMessage('Station updated successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStation = async (id: string) => {
        if (!confirm('Are you sure you want to delete this station?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/stations/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete station');
            setStations(stations.filter(s => s.id !== id));
            setMessage('Station deleted successfully');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ISSUE HANDLERS
    const handleUpdateIssue = async (issue: Issue, updates: Partial<Issue>) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/issues/${issue.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update issue');

            // Refresh
            fetchIssues();
            setMessage('Issue updated successfully');
        } catch (error: any) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = editingIssueStatus ? `/api/issue-statuses/${editingIssueStatus.id}` : '/api/issue-statuses';
            const method = editingIssueStatus ? 'PUT' : 'POST';
            const body = editingIssueStatus
                ? { name: editingIssueStatus.name, color: editingIssueStatus.color, order: editingIssueStatus.order }
                : newIssueStatus;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Failed to save status');

            fetchIssueStatuses();
            setEditingIssueStatus(null);
            setNewIssueStatus({ name: '', color: 'bg-blue-500', order: 0 });
            setMessage('Status saved successfully');
        } catch (error: any) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStatus = async (id: string) => {
        if (!confirm('Delete this status?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/issue-statuses/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete status');
            }
            fetchIssueStatuses();
            setMessage('Status deleted');
        } catch (error: any) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto w-full whitespace-normal">
                <div className="flex flex-col gap-6 mb-8">
                    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                            <Shield className="text-red-500" />
                            Station Administration
                        </h1>
                        <button
                            onClick={async () => {
                                await fetch('/api/auth/logout', { method: 'POST' });
                                window.location.href = '/';
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 border border-red-500/30"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </header>

                    <nav className="flex flex-wrap gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                        {[
                            { id: 'firefighters', label: 'Roster', icon: Users },
                            { id: 'roles', label: 'Roles', icon: Shield },
                            { id: 'stations', label: 'Stations', icon: MapPin },
                            { id: 'apparatus', label: 'Apparatus', icon: Truck },
                            { id: 'reports', label: 'Time Reports', icon: FileText },
                            { id: 'requests', label: 'Requests', icon: FileText },
                            { id: 'issues', label: 'Issues', icon: AlertTriangle },
                            { id: 'field-reports', label: 'Field Reports', icon: ClipboardList },
                            { id: 'truck-checks', label: 'Truck Checks', icon: Truck, badge: requests.length > 0 ? requests.length : null },
                            { id: 'logs', label: 'Audit Logs', icon: List },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.badge ? (
                                    <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        {tab.badge}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="grid gap-8">
                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.includes('success') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {message.includes('success') ? <FileText className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <p className="font-medium">{message}</p>
                        </div>
                    )}

                    {/* FIREFIGHTERS TAB */}
                    {activeTab === 'firefighters' && (
                        <div className="space-y-8">
                            {/* Add/Edit Firefighter Form */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <UserPlus className="text-blue-400" />
                                        {editingFirefighter ? 'Edit Personnel' : 'Add New Personnel'}
                                    </h2>
                                    {editingFirefighter && (
                                        <button
                                            onClick={() => {
                                                setEditingFirefighter(null);
                                                setNewFirefighter({ name: '', roleId: '', stationId: null, pin: '', password: '' });
                                                setEditingPassword('');
                                            }}
                                            className="text-sm text-slate-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                                <form onSubmit={editingFirefighter ? handleUpdateFirefighter : handleAddFirefighter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <input
                                        placeholder="Full Name"
                                        value={editingFirefighter ? editingFirefighter.name : newFirefighter.name}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, name: e.target.value })
                                            : setNewFirefighter({ ...newFirefighter, name: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                    <input
                                        placeholder="Radio ID (PIN)"
                                        value={editingFirefighter ? editingFirefighter.pin : newFirefighter.pin}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, pin: e.target.value })
                                            : setNewFirefighter({ ...newFirefighter, pin: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                    {editingFirefighter && (
                                        <input
                                            type="password"
                                            placeholder="New Password (Optional)"
                                            value={editingPassword}
                                            onChange={(e) => setEditingPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    )}
                                    <select
                                        value={editingFirefighter ? editingFirefighter.roleId : newFirefighter.roleId}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, roleId: e.target.value })
                                            : setNewFirefighter({ ...newFirefighter, roleId: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    >
                                        <option value="">Select Role</option>
                                        {sortedRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <select
                                        value={editingFirefighter ? (editingFirefighter.stationId || '') : (newFirefighter.stationId || '')}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, stationId: e.target.value || null })
                                            : setNewFirefighter({ ...newFirefighter, stationId: e.target.value || null })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select Station (Optional)</option>
                                        {sortedStations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button type="submit" disabled={loading} className="w-full sm:col-span-2 lg:col-span-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                                        {editingFirefighter ? 'Update Personnel' : 'Save Personnel'}
                                    </button>
                                </form>
                            </div>


                            {/* Personnel List */}
                            <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-purple-400" /> Personnel Roster</h2>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-slate-400">Show Archived</label>
                                        <button
                                            onClick={() => setShowArchived(!showArchived)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${showArchived ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showArchived ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto w-full scrollbar-thin">
                                    <table className="w-full text-left border-collapse whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                        <thead>
                                            <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                                <th className="pb-3 px-4">Name</th>
                                                <th className="pb-3 px-4">Role</th>
                                                <th className="pb-3 px-4">Station</th>
                                                <th className="pb-3 px-4">PIN</th>
                                                <th className="pb-3 px-4">Status</th>
                                                <th className="pb-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {sortedFirefighters.filter(ff => showArchived || ff.isActive).map((ff) => (
                                                <tr key={ff.id} className={`hover:bg-slate-700/50 transition-colors ${!ff.isActive ? 'opacity-60 bg-slate-900/30' : ''}`}>
                                                    <td className="py-3 px-4 font-medium">{ff.name}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="bg-slate-700 px-2 py-1 rounded text-xs">{ff.role?.name}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400">{ff.station?.name || '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-slate-500">{ff.pin}</td>
                                                    <td className="py-3 px-4">
                                                        {ff.isActive ?
                                                            <span className="text-green-400 text-xs font-bold">Active</span> :
                                                            <span className="text-slate-500 text-xs font-bold">Archived</span>
                                                        }
                                                    </td>
                                                    <td className="py-3 px-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleToggleArchiveFirefighter(ff)}
                                                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                                                            title={ff.isActive ? "Archive User" : "Restore User"}
                                                        >
                                                            {ff.isActive ? <div className="w-4 h-4 border-2 border-orange-400 rounded-sm" /> : <RefreshCw className="w-4 h-4 text-green-400" />}
                                                        </button>
                                                        <button onClick={() => setEditingFirefighter(ff)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-blue-400">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteFirefighter(ff.id)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-red-400">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setPasswordFirefighter(ff);
                                                                setPasswordModalOpen(true);
                                                            }}
                                                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-yellow-400"
                                                            title="Set Password"
                                                        >
                                                            <Shield className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ROLES TAB */}
                    {activeTab === 'roles' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Shield className="text-purple-400" /> {editingRole ? 'Edit Role' : 'New Role'}</h2>
                                <form onSubmit={editingRole ? handleUpdateRole : handleAddRole} className="space-y-4">
                                    <input
                                        required
                                        placeholder="Role Name"
                                        value={editingRole ? editingRole.name : newRole.name}
                                        onChange={(e) => editingRole
                                            ? setEditingRole({ ...editingRole, name: e.target.value })
                                            : setNewRole({ ...newRole, name: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingRole ? editingRole.isAdmin : newRole.isAdmin}
                                            onChange={(e) => editingRole
                                                ? setEditingRole({ ...editingRole, isAdmin: e.target.checked })
                                                : setNewRole({ ...newRole, isAdmin: e.target.checked })
                                            }
                                            className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-purple-500"
                                        />
                                        <span className="text-slate-300">Is Admin?</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <button disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                                            {loading ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
                                        </button>
                                        {editingRole && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingRole(null)}
                                                className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-xl"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <table className="w-full text-left">
                                    <thead><tr className="border-b border-slate-700 text-slate-400 text-sm"><th className="pb-3 px-4">Name</th><th className="pb-3 px-4">Type</th><th className="pb-3 px-4">Actions</th></tr></thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {sortedRoles.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-700/50">
                                                <td className="py-3 px-4 font-medium">{r.name}</td>
                                                <td className="py-3 px-4">{r.isAdmin ? <span className="text-red-400 font-bold text-xs border border-red-500/30 px-2 py-0.5 rounded">ADMIN</span> : <span className="text-slate-500 text-xs">STANDARD</span>}</td>
                                                <td className="py-3 px-4 flex gap-2">
                                                    <button onClick={() => setEditingRole(r)} className="text-purple-400 hover:text-purple-300 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeleteRole(r.id)} className="text-red-400 hover:text-red-300 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STATIONS TAB */}
                    {activeTab === 'stations' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-emerald-400" /> {editingStation ? 'Edit Station' : 'New Station'}</h2>
                                <form onSubmit={editingStation ? handleUpdateStation : handleAddStation} className="space-y-4">
                                    <input
                                        required
                                        placeholder="Station Name"
                                        value={editingStation ? editingStation.name : newStation.name}
                                        onChange={(e) => editingStation
                                            ? setEditingStation({ ...editingStation, name: e.target.value })
                                            : setNewStation({ ...newStation, name: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <input
                                        placeholder="Address (Optional)"
                                        value={editingStation ? (editingStation.address || '') : newStation.address}
                                        onChange={(e) => editingStation
                                            ? setEditingStation({ ...editingStation, address: e.target.value })
                                            : setNewStation({ ...newStation, address: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                                            {loading ? 'Saving...' : (editingStation ? 'Update Station' : 'Create Station')}
                                        </button>
                                        {editingStation && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingStation(null)}
                                                className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-xl"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <table className="w-full text-left">
                                    <thead><tr className="border-b border-slate-700 text-slate-400 text-sm"><th className="pb-3 px-4">Name</th><th className="pb-3 px-4">Address</th><th className="pb-3 px-4">Actions</th></tr></thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {sortedStations.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-700/50">
                                                <td className="py-3 px-4 font-medium">{s.name}</td>
                                                <td className="py-3 px-4 text-slate-400">{s.address || '-'}</td>
                                                <td className="py-3 px-4 flex gap-2">
                                                    <button onClick={() => setEditingStation(s)} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeleteStation(s.id)} className="text-red-400 hover:text-red-300 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* APPARATUS TAB */}
                    {activeTab === 'apparatus' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Truck className="text-orange-400" /> {editingApparatus ? 'Edit Apparatus' : 'New Apparatus'}</h2>
                                <form onSubmit={editingApparatus ? handleUpdateApparatus : handleAddApparatus} className="space-y-4">
                                    <input
                                        required
                                        placeholder="Apparatus Name (e.g., Engine 1)"
                                        value={editingApparatus ? editingApparatus.name : newApparatus.name}
                                        onChange={(e) => editingApparatus
                                            ? setEditingApparatus({ ...editingApparatus, name: e.target.value })
                                            : setNewApparatus({ ...newApparatus, name: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                    <select
                                        required
                                        value={editingApparatus ? editingApparatus.stationId : newApparatus.stationId}
                                        onChange={(e) => editingApparatus
                                            ? setEditingApparatus({ ...editingApparatus, stationId: e.target.value })
                                            : setNewApparatus({ ...newApparatus, stationId: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                    >
                                        <option value="">Select Station</option>
                                        {sortedStations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select
                                        value={editingApparatus ? editingApparatus.status : newApparatus.status}
                                        onChange={(e) => editingApparatus
                                            ? setEditingApparatus({ ...editingApparatus, status: e.target.value })
                                            : setNewApparatus({ ...newApparatus, status: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                    >
                                        <option value="In Service">In Service</option>
                                        <option value="Out of Service">Out of Service</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>

                                    <div className="flex gap-2">
                                        <button disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                                            {loading ? 'Saving...' : (editingApparatus ? 'Update' : 'Create')}
                                        </button>
                                        {editingApparatus && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingApparatus(null)}
                                                className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-xl"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                            <th className="pb-3 px-4">Name</th>
                                            <th className="pb-3 px-4">Station</th>
                                            <th className="pb-3 px-4">Status</th>
                                            <th className="pb-3 px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {sortedApparatus.map((a) => (
                                            <tr key={a.id} className="hover:bg-slate-700/50">
                                                <td className="py-3 px-4 font-medium">{a.name}</td>
                                                <td className="py-3 px-4 text-slate-400">{a.station?.name}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${a.status === 'In Service' ? 'bg-green-500/20 text-green-400' :
                                                        a.status === 'Out of Service' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 flex gap-2">
                                                    <button onClick={() => setEditingApparatus(a)} className="text-orange-400 hover:text-orange-300 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeleteApparatus(a.id)} className="text-red-400 hover:text-red-300 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedApparatus.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-500">No apparatus found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* REPORTS TAB */}
                    {activeTab === 'reports' && (
                        <div className="space-y-8">
                            {/* Filters */}
                            <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="text-blue-400" /> Report Filters</h2>
                                <div className="flex flex-col gap-4">
                                    {/* Presets */}
                                    <div className="flex gap-2 flex-wrap mb-2">
                                        {[
                                            { id: 'recent', label: 'Recent' },
                                            { id: 'week', label: 'This Week' },
                                            { id: 'month', label: 'This Month' },
                                            { id: 'year', label: 'This Year' },
                                            { id: 'lastYear', label: 'Last Year' },
                                        ].map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPresetRange(p.id as any)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${dateRange.label === p.label ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Firefighter Filter and Dates Container */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Firefighter Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Employee</label>
                                            <select
                                                value={filterFirefighterId}
                                                onChange={(e) => setFilterFirefighterId(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">All Employees</option>
                                                {sortedFirefighters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Custom Date Range */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={dateRange.start ? dateRange.start.split('T')[0] : ''}
                                                onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value).toISOString(), label: 'Custom' })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={dateRange.end ? dateRange.end.split('T')[0] : ''}
                                                onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value).toISOString(), label: 'Custom' })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hours Summary */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock className="text-green-400" /> Hours Summary ({dateRange.label})</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* All Personnel Card */}
                                    {(() => {
                                        const totalMs = Object.values(summaryStats).reduce((acc, curr) => acc + curr.totalMs, 0);
                                        // Use the fetched unique report count instead of summing user participations
                                        const totalCalls = totalReportsCount;
                                        const totalShifts = Object.values(summaryStats).reduce((acc, curr) => acc + curr.count, 0);

                                        const totalHours = totalMs / (1000 * 60 * 60);
                                        const hours = Math.floor(totalHours);
                                        const minutes = Math.floor((totalHours - hours) * 60);

                                        return (
                                            <div className="bg-slate-700/50 p-4 rounded-xl border-2 border-slate-600 flex justify-between items-center shadow-lg">
                                                <div>
                                                    <p className="font-bold text-lg text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> All Personnel</p>
                                                    <div className="flex gap-4 text-xs sm:text-sm text-slate-300 mt-1">
                                                        <span>{totalShifts} shifts</span>
                                                        <span className="flex items-center gap-1 text-blue-300 font-bold"><Truck className="w-3 h-3" /> {totalCalls} calls</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl sm:text-3xl font-mono text-green-400 bg-slate-800 px-2 py-1 rounded inline-block whitespace-nowrap">{hours}h {minutes}m</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {Object.entries(summaryStats).map(([id, stats]) => {
                                        const totalHours = stats.totalMs / (1000 * 60 * 60);
                                        const hours = Math.floor(totalHours);
                                        const minutes = Math.floor((totalHours - hours) * 60);
                                        const calls = callCounts[id] || 0;

                                        return (
                                            <div key={id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-base sm:text-lg">{stats.name}</p>
                                                    <div className="flex gap-4 text-xs sm:text-sm text-slate-400">
                                                        <span>{stats.count} shifts</span>
                                                        <span className="flex items-center gap-1 text-blue-400 font-bold"><Truck className="w-3 h-3" /> {calls} calls</span>
                                                    </div>
                                                </div>
                                                <div className="text-right pl-2">
                                                    <p className="text-lg sm:text-2xl font-mono text-green-400 whitespace-nowrap">{hours}h {minutes}m</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {Object.keys(summaryStats).length === 0 && (
                                        <p className="text-slate-400 col-span-full">No completed shifts in this period.</p>
                                    )}
                                </div>
                            </div>

                            {/* Activity Log */}
                            <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FileText className="text-orange-400" /> Detailed Activity Log</h2>
                                <div className="overflow-x-auto w-full scrollbar-thin">
                                    <table className="w-full text-left whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                        <thead>
                                            <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                                <th className="pb-3 px-4">Person</th>
                                                <th className="pb-3 px-4">Clock In</th>
                                                <th className="pb-3 px-4">Clock Out</th>
                                                <th className="pb-3 px-4">Duration</th>
                                                <th className="pb-3 px-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {timeEntries.map((entry) => {
                                                const start = new Date(entry.clockIn);
                                                const end = entry.clockOut ? new Date(entry.clockOut) : null;
                                                let duration = '-';
                                                if (end) {
                                                    const diff = end.getTime() - start.getTime();
                                                    const hours = Math.floor(diff / (1000 * 60 * 60));
                                                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                    duration = `${hours}h ${minutes}m`;
                                                }
                                                return (
                                                    <tr key={entry.id} className="hover:bg-slate-700/50 transition-colors">
                                                        <td className="py-3 px-4 font-medium">{entry.firefighter.name}</td>
                                                        <td className="py-3 px-4 text-slate-300">{format(start, 'MM/dd/yy - hh:mm a')}</td>
                                                        <td className="py-3 px-4 text-slate-300">
                                                            {end ? format(end, 'MM/dd/yy - hh:mm a') : <span className="text-green-400 font-bold animate-pulse">Active</span>}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-500 font-mono">
                                                            {duration === '0h 0m' ? '< 1m' : duration}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <button
                                                                onClick={() => setEditingTimeEntry(entry)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><FileText className="text-yellow-400" /> Pending Time Change Requests</h2>
                            {requests.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No pending requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {requests.map((req: any) => (
                                        <div key={req.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-bold text-lg">{req.firefighter.name}</span>
                                                    <span className="text-slate-500 text-sm">requested changes for</span>
                                                    <span className="text-blue-400 font-mono">{req.timeEntry ? format(new Date(req.timeEntry.clockIn), 'MMM dd, yyyy') : 'New Entry'}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                    <div>
                                                        <p className="text-slate-500">Requested In</p>
                                                        <p className="font-mono text-green-400">{req.requestedClockIn ? format(new Date(req.requestedClockIn), 'MM/dd/yy - hh:mm a') : '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500">Requested Out</p>
                                                        <p className="font-mono text-red-400">{req.requestedClockOut ? format(new Date(req.requestedClockOut), 'MM/dd/yy - hh:mm a') : 'Active'}</p>
                                                    </div>
                                                    <div className="md:col-span-2 mt-2">
                                                        <p className="text-slate-500">Reason</p>
                                                        <p className="text-white italic">"{req.reason}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRequestAction(req.id, 'APPROVED')}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRequestAction(req.id, 'REJECTED')}
                                                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                                                >
                                                    <AlertCircle className="w-4 h-4" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><List className="text-slate-400" /> Audit Logs</h2>
                            <div className="overflow-x-auto w-full scrollbar-thin">
                                <table className="w-full text-left border-collapse whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                    <thead className="bg-slate-900/50 text-slate-400 text-sm">
                                        <tr>
                                            <th className="p-4 rounded-tl-lg">Time</th>
                                            <th className="p-4">Admin</th>
                                            <th className="p-4">Action</th>
                                            <th className="p-4">Model</th>
                                            <th className="p-4">Details</th>
                                            <th className="p-4 rounded-tr-lg">IP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        <LogsTable />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ISSUES TAB */}
                    {activeTab === 'issues' && (
                        <div className="space-y-6">
                            <div className="flex gap-4 border-b border-slate-700 pb-4">
                                <button onClick={() => setIssueSubTab('active')} className={`px-4 py-2 rounded-lg font-bold ${issueSubTab === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Active Issues</button>
                                <button onClick={() => setIssueSubTab('past')} className={`px-4 py-2 rounded-lg font-bold ${issueSubTab === 'past' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Past Issues</button>
                                <button onClick={() => setIssueSubTab('statuses')} className={`px-4 py-2 rounded-lg font-bold ${issueSubTab === 'statuses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Manage Statuses</button>
                            </div>

                            {issueSubTab === 'statuses' ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                        <h3 className="text-xl font-bold mb-4">{editingIssueStatus ? 'Edit Status' : 'New Status'}</h3>
                                        <form onSubmit={handleSaveStatus} className="space-y-4">
                                            <input
                                                placeholder="Status Name"
                                                value={editingIssueStatus ? editingIssueStatus.name : newIssueStatus.name}
                                                onChange={e => editingIssueStatus ? setEditingIssueStatus({ ...editingIssueStatus, name: e.target.value }) : setNewIssueStatus({ ...newIssueStatus, name: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required
                                            />
                                            <div className="space-y-2">
                                                <label className="text-sm text-slate-400">Status Color</label>
                                                <div className="grid grid-cols-6 gap-2">
                                                    {['bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'].map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => editingIssueStatus ? setEditingIssueStatus({ ...editingIssueStatus, color }) : setNewIssueStatus({ ...newIssueStatus, color })}
                                                            className={`w-8 h-8 rounded-full ${color} transition-all ${((editingIssueStatus ? editingIssueStatus.color : newIssueStatus.color) === color) ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                                                            title={color.replace('bg-', '').replace('-500', '')}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="Order"
                                                value={editingIssueStatus ? editingIssueStatus.order : newIssueStatus.order}
                                                onChange={e => editingIssueStatus ? setEditingIssueStatus({ ...editingIssueStatus, order: parseInt(e.target.value) }) : setNewIssueStatus({ ...newIssueStatus, order: parseInt(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required
                                            />
                                            <div className="flex gap-2">
                                                <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">Save</button>
                                                {editingIssueStatus && <button type="button" onClick={() => setEditingIssueStatus(null)} className="bg-slate-700 px-4 rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>}
                                            </div>
                                        </form>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                        <table className="w-full text-left">
                                            <thead><tr className="border-b border-slate-700 text-slate-400"><th className="p-2">Name</th><th className="p-2">Color</th><th className="p-2">Order</th><th className="p-2">Actions</th></tr></thead>
                                            <tbody>
                                                {issueStatuses.map(s => (
                                                    <tr key={s.id} className="border-b border-slate-700/50">
                                                        <td className="p-2 font-bold">{s.name}</td>
                                                        <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${s.color.includes('bg-') ? `${s.color}/20 text-${s.color.replace('bg-', '')}-400` : ''}`}>{s.color}</span></td>
                                                        <td className="p-2">{s.order}</td>
                                                        <td className="p-2 flex gap-2">
                                                            <button onClick={() => setEditingIssueStatus(s)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteStatus(s.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {issues.length === 0 && <p className="text-slate-500 text-center py-8">No issues found.</p>}
                                    {issues.map(issue => (
                                        <div key={issue.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col gap-4">
                                            <div className="flex justify-between items-start w-full">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-lg">{issue.title}</h3>
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${issue.status.color.includes('bg-') ? `${issue.status.color}/20 text-${issue.status.color.replace('bg-', '')}-400` : 'bg-slate-700'}`}>
                                                            {issue.status.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-300 mb-4">{issue.description}</p>
                                                    <div className="text-xs text-slate-500 flex gap-4">
                                                        <span>Reported by: <span className="text-slate-400">{issue.reportedBy.name}</span></span>
                                                        <span>{format(new Date(issue.createdAt), 'MMM dd, yyyy hh:mm a')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 items-end">
                                                    <select
                                                        value={issue.statusId}
                                                        onChange={(e) => handleUpdateIssue(issue, { statusId: e.target.value })}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        {issueStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                    <button
                                                        onClick={() => handleUpdateIssue(issue, { isArchived: !issue.isArchived })}
                                                        className={`px-3 py-1 rounded-lg text-sm font-bold border transition-colors ${issue.isArchived ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                                                    >
                                                        {issue.isArchived ? 'Unarchive' : 'Archive'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Comments Section */}
                                            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                                                <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Comments</h4>
                                                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                                    {issue.comments?.length > 0 ? (
                                                        issue.comments.map(comment => (
                                                            <div key={comment.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="font-bold text-blue-400 text-sm">{comment.author.name}</span>
                                                                    <span className="text-xs text-slate-500">{format(new Date(comment.createdAt), 'MMM dd, hh:mm a')}</span>
                                                                </div>
                                                                <p className="text-slate-300 text-sm">{comment.content}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-slate-500 text-sm italic">No comments yet.</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        placeholder="Add a comment..."
                                                        value={newComment[issue.id] || ''}
                                                        onChange={e => setNewComment({ ...newComment, [issue.id]: e.target.value })}
                                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleAddComment(issue.id);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleAddComment(issue.id)}
                                                        disabled={!newComment[issue.id]?.trim()}
                                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                                    >
                                                        Post
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}


                    {/* FIELD REPORTS TAB */}
                    {activeTab === 'field-reports' && (
                        <div className="space-y-6">
                            <div className="flex gap-4 border-b border-slate-700 pb-4 mb-6">
                                <button onClick={() => setFieldReportTab('reports')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${fieldReportTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><FileText className="w-4 h-4" /> Reports</button>
                                <button onClick={() => { setFieldReportTab('requests'); fetchFieldReportRequests(); }} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${fieldReportTab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><GitPullRequest className="w-4 h-4" /> Requests {fieldReportRequests.filter(r => r.status === 'PENDING').length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{fieldReportRequests.filter(r => r.status === 'PENDING').length}</span>}</button>
                                <button onClick={() => setFieldReportTab('types')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${fieldReportTab === 'types' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings className="w-4 h-4" /> Incident Types</button>
                                <button onClick={() => setFieldReportTab('statuses')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${fieldReportTab === 'statuses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><List className="w-4 h-4" /> Statuses</button>
                            </div>

                            {fieldReportTab === 'types' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                        <h3 className="text-xl font-bold mb-4">New Incident Type</h3>
                                        <form onSubmit={handleAddIncidentType} className="space-y-4">
                                            <input
                                                placeholder="Type Name"
                                                value={newIncidentType}
                                                onChange={e => setNewIncidentType(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required
                                            />
                                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">Add Type</button>
                                        </form>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                        <table className="w-full text-left">
                                            <thead><tr className="border-b border-slate-700 text-slate-400"><th className="p-2">Name</th><th className="p-2">Actions</th></tr></thead>
                                            <tbody>
                                                {incidentTypes.map(t => (
                                                    <tr key={t.id} className="border-b border-slate-700/50">
                                                        <td className="p-2 font-bold">{t.name}</td>
                                                        <td className="p-2">
                                                            <button onClick={() => handleDeleteIncidentType(t.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {fieldReportTab === 'statuses' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                        <h3 className="text-xl font-bold mb-4">{editingReportStatus ? 'Edit Status' : 'New Status'}</h3>
                                        <form onSubmit={handleSaveReportStatus} className="space-y-4">
                                            <input
                                                placeholder="Status Name"
                                                value={editingReportStatus ? editingReportStatus.name : newReportStatus.name}
                                                onChange={e => editingReportStatus ? setEditingReportStatus({ ...editingReportStatus, name: e.target.value }) : setNewReportStatus({ ...newReportStatus, name: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required
                                            />
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={editingReportStatus ? editingReportStatus.isDraftLike : newReportStatus.isDraftLike} onChange={e => editingReportStatus ? setEditingReportStatus({ ...editingReportStatus, isDraftLike: e.target.checked }) : setNewReportStatus({ ...newReportStatus, isDraftLike: e.target.checked })} />
                                                <label className="text-sm text-slate-300">Is Draft-Like (Private)</label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={editingReportStatus ? editingReportStatus.userCanEditOwn : newReportStatus.userCanEditOwn} onChange={e => editingReportStatus ? setEditingReportStatus({ ...editingReportStatus, userCanEditOwn: e.target.checked }) : setNewReportStatus({ ...newReportStatus, userCanEditOwn: e.target.checked })} />
                                                <label className="text-sm text-slate-300">User Can Edit Own</label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={editingReportStatus ? editingReportStatus.isFinal : newReportStatus.isFinal} onChange={e => editingReportStatus ? setEditingReportStatus({ ...editingReportStatus, isFinal: e.target.checked }) : setNewReportStatus({ ...newReportStatus, isFinal: e.target.checked })} />
                                                <label className="text-sm text-slate-300">Is Final (Locked)</label>
                                            </div>
                                            <input
                                                type="number" placeholder="Order"
                                                value={editingReportStatus ? editingReportStatus.order : newReportStatus.order}
                                                onChange={e => editingReportStatus ? setEditingReportStatus({ ...editingReportStatus, order: parseInt(e.target.value) }) : setNewReportStatus({ ...newReportStatus, order: parseInt(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required
                                            />
                                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">Save</button>
                                        </form>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                        <table className="w-full text-left">
                                            <thead><tr className="border-b border-slate-700 text-slate-400"><th className="p-2">Name</th><th className="p-2">Flags</th><th className="p-2">Order</th><th className="p-2">Actions</th></tr></thead>
                                            <tbody>
                                                {reportStatuses.map(s => (
                                                    <tr key={s.id} className="border-b border-slate-700/50">
                                                        <td className="p-2 font-bold">{s.name}</td>
                                                        <td className="p-2 text-xs text-slate-400 space-x-1">
                                                            {s.isDraftLike && <span className="bg-yellow-500/10 text-yellow-500 px-1 rounded">Draft</span>}
                                                            {s.isFinal && <span className="bg-green-500/10 text-green-500 px-1 rounded">Final</span>}
                                                        </td>
                                                        <td className="p-2">{s.order}</td>
                                                        <td className="p-2 flex gap-2">
                                                            <button onClick={() => setEditingReportStatus(s)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteReportStatus(s.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {fieldReportTab === 'reports' && (
                                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 sm:p-6 border-b border-slate-700 flex justify-between items-center flex-wrap gap-4">
                                        <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="text-blue-400" /> All Reports</h3>
                                        <button onClick={fetchFieldReports} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"><RefreshCw className="w-4 h-4" /></button>
                                    </div>
                                    <div className="overflow-x-auto w-full scrollbar-thin">
                                        <table className="w-full text-left border-collapse whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                            <thead>
                                                <tr className="bg-slate-900/50 text-slate-400 text-sm">
                                                    <th className="p-4 font-semibold">Date</th>
                                                    <th className="p-4 font-semibold">Type</th>
                                                    <th className="p-4 font-semibold">Location</th>
                                                    <th className="p-4 font-semibold">Status</th>
                                                    <th className="p-4 font-semibold">Author</th>
                                                    <th className="p-4 font-semibold">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {fieldReports.map((report) => (
                                                    <tr key={report.id} className="hover:bg-slate-700/30 transition-colors">
                                                        <td className="p-4 text-slate-300">
                                                            {format(new Date(report.date), 'MMM d, yyyy')}
                                                            <div className="text-xs text-slate-500">{report.alarmTime}</div>
                                                        </td>
                                                        <td className="p-4 font-medium text-white">{report.incidentType.name}</td>
                                                        <td className="p-4 text-slate-400 max-w-xs truncate" title={report.location}>{report.location}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${report.status.name === 'Draft' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : report.status.name === 'Submitted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : report.status.isFinal ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>{report.status.name}</span>
                                                        </td>
                                                        <td className="p-4 text-slate-300">{report.createdByUser?.name || 'Unknown'}</td>
                                                        <td className="p-4">
                                                            <button
                                                                onClick={async () => {
                                                                    const res = await fetch(`/api/field-reports/${report.id}`);
                                                                    if (res.ok) setSelectedReport(await res.json());
                                                                }}
                                                                className="text-blue-400 hover:text-blue-300 font-medium text-sm flex items-center gap-1"
                                                            >
                                                                View Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {fieldReports.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No reports found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {selectedReport && (
                                <ReportDetailModal
                                    report={selectedReport}
                                    onClose={() => setSelectedReport(null)}
                                    onEdit={() => {
                                        setEditingFieldReport(selectedReport);
                                        setSelectedReport(null);
                                    }}
                                    onStatusChange={(statusId) => handleUpdateReportStatus(selectedReport.id, statusId)}
                                    reportStatuses={reportStatuses}
                                />
                            )}

                            {editingFieldReport && (
                                <FieldReportForm
                                    initialData={editingFieldReport}
                                    onSubmit={handleSaveFieldReport}
                                    onCancel={() => setEditingFieldReport(null)}
                                    incidentTypes={incidentTypes}
                                    firefighters={firefighters}
                                    apparatus={apparatus}
                                    user={currentUser}
                                />
                            )}

                            {selectedModRequest && (
                                <RequestDetailModal
                                    request={selectedModRequest}
                                    onClose={() => setSelectedModRequest(null)}
                                    onApprove={(id, notes) => handleModRequestAction(id, 'APPROVED', notes)}
                                    onDeny={(id, notes) => handleModRequestAction(id, 'DENIED', notes)}
                                    incidentTypes={incidentTypes}
                                    firefighters={firefighters}
                                    apparatus={apparatus}
                                />
                            )}
                        </div>
                    )}

                    {/* EDIT TIME ENTRY MODAL */}
                    {editingTimeEntry && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
                                <h3 className="text-xl font-bold mb-4">Edit Time Entry</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Firefighter</label>
                                        <input
                                            disabled
                                            value={editingTimeEntry.firefighter.name}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Clock In */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Clock In</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={(() => {
                                                    const d = new Date(editingTimeEntry.clockIn);
                                                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                })()}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                onChange={(e) => {
                                                    const d = new Date(editingTimeEntry.clockIn);
                                                    const timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                                    const newDate = new Date(`${e.target.value}T${timePart}`);
                                                    if (!isNaN(newDate.getTime())) {
                                                        setEditingTimeEntry({ ...editingTimeEntry, clockIn: newDate.toISOString() });
                                                    }
                                                }}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            />
                                            <input
                                                type="time"
                                                value={(() => {
                                                    const d = new Date(editingTimeEntry.clockIn);
                                                    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                                })()}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                onChange={(e) => {
                                                    const d = new Date(editingTimeEntry.clockIn);
                                                    const datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                    const newDate = new Date(`${datePart}T${e.target.value}`);
                                                    if (!isNaN(newDate.getTime())) {
                                                        setEditingTimeEntry({ ...editingTimeEntry, clockIn: newDate.toISOString() });
                                                    }
                                                }}
                                                className="w-40 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Clock Out */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Clock Out</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={editingTimeEntry.clockOut ? (() => {
                                                    const d = new Date(editingTimeEntry.clockOut!);
                                                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                })() : ''}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                onChange={(e) => {
                                                    const d = editingTimeEntry.clockOut ? new Date(editingTimeEntry.clockOut) : new Date();
                                                    const timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                                    const newDate = new Date(`${e.target.value}T${timePart}`);
                                                    if (!isNaN(newDate.getTime())) {
                                                        setEditingTimeEntry({ ...editingTimeEntry, clockOut: newDate.toISOString() });
                                                    }
                                                }}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            />
                                            <input
                                                type="time"
                                                value={editingTimeEntry.clockOut ? (() => {
                                                    const d = new Date(editingTimeEntry.clockOut!);
                                                    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                                })() : ''}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                onChange={(e) => {
                                                    const d = editingTimeEntry.clockOut ? new Date(editingTimeEntry.clockOut) : new Date();
                                                    const datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                    const newDate = new Date(`${datePart}T${e.target.value}`);
                                                    if (!isNaN(newDate.getTime())) {
                                                        setEditingTimeEntry({ ...editingTimeEntry, clockOut: newDate.toISOString() });
                                                    }
                                                }}
                                                className="w-40 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="mt-1 flex justify-end">
                                            <button
                                                onClick={() => setEditingTimeEntry({ ...editingTimeEntry, clockOut: null })}
                                                className="text-xs text-slate-400 hover:text-red-400"
                                            >
                                                Clear Clock Out
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button
                                            onClick={handleUpdateTimeEntry}
                                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={() => setEditingTimeEntry(null)}
                                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Password Modal */}
                    {passwordModalOpen && passwordFirefighter && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                            <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6 border border-slate-700 shadow-xl relative">
                                <button
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <h3 className="text-xl font-bold mb-4">Set Password for {passwordFirefighter.name}</h3>
                                <p className="text-slate-400 text-sm mb-4">Leave empty to clear password (allow login with just PIN).</p>
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button
                                    onClick={handleSetPassword}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg"
                                >
                                    Save Password
                                </button>
                            </div>
                        </div>
                    )}
                    {/* TRUCK CHECKS TAB */}
                    {activeTab === 'truck-checks' && (
                        <AdminTruckChecks currentUser={currentUser} />
                    )}
                </div>
            </div>
        </div>
    );
}
