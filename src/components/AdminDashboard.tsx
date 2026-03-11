'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Clock, Calendar, CheckCircle, AlertCircle, Edit2, X, Save, AlertTriangle, Plus, MessageSquare, Trash2, FileText, ClipboardList, BookOpen, Truck, ChevronRight, ChevronDown, User, Shield, Briefcase, MapPin, Users, List, UserPlus, RefreshCw, GitPullRequest, Settings, Search, Filter, ChevronLeft, BarChart3, Loader2, Eye, EyeOff, Phone, Hash, Archive } from 'lucide-react';
import FieldReportForm from './FieldReportForm';
import ReportDetailModal from './ReportDetailModal';
import RequestDetailModal from './RequestDetailModal';
import AdminTruckChecks from './AdminTruckChecks';
import AdminTraining from './AdminTraining';
import { format } from 'date-fns';
import LogsTable from './LogsTable';
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils';

type Role = {
    id: string;
    name: string;
    createdAt: string;
};

type Station = {
    id: string;
    name: string;
    address: string | null;
    createdAt: string;
};

type Shift = {
    id: string;
    name: string;
    description: string | null;
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

type DirectorySettings = {
    id: string;
    showRadioId: boolean;
    showName: boolean;
    showRole: boolean;
    showStation: boolean;
    showShift: boolean;
    showPhone: boolean;
    showStartDate: boolean;
    roleOrder: string[];
    stationOrder: string[];
};

type Firefighter = {
    id: string;
    name: string;
    roleId: string;
    role: Role;
    stationId: string | null;
    station?: Station | null;
    shiftId: string | null;
    shift?: Shift | null;
    pin: string;
    phoneNumber: string | null;
    startDate: string | null;
    isActive: boolean;
    isAdmin: boolean;
    isHiddenFromDirectory: boolean;
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
    initialShifts: Shift[];
    currentUser: { id: string; name: string };
};

export default function AdminDashboard({ initialFirefighters, initialRoles, initialStations, initialShifts, currentUser }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'firefighters' | 'roles' | 'stations' | 'shifts' | 'apparatus' | 'reports' | 'requests' | 'logs' | 'issues' | 'field-reports' | 'truck-checks' | 'directory-settings' | 'training' | 'notices'>('reports');

    // Data States
    const [firefighters, setFirefighters] = useState<Firefighter[]>(initialFirefighters);
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    const [stations, setStations] = useState<Station[]>(initialStations);
    const [shifts, setShifts] = useState<Shift[]>(initialShifts);
    const [apparatus, setApparatus] = useState<Apparatus[]>([]);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [directorySettings, setDirectorySettings] = useState<DirectorySettings | null>(null);
    const [noticeSettings, setNoticeSettings] = useState<{ everyoneCanPost: boolean; everyoneCanDelete: boolean }>({ everyoneCanPost: false, everyoneCanDelete: false });

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
    const [truckCheckRequests, setTruckCheckRequests] = useState<any[]>([]);
    const [selectedModRequest, setSelectedModRequest] = useState<any>(null);
    const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
    const [reportStatuses, setReportStatuses] = useState<any[]>([]);
    const [fieldReports, setFieldReports] = useState<any[]>([]);
    const [callCounts, setCallCounts] = useState<Record<string, number>>({});
    const [totalReportsCount, setTotalReportsCount] = useState(0);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [newIncidentType, setNewIncidentType] = useState('');
    const [editingIncidentType, setEditingIncidentType] = useState<any>(null);
    const [newReportStatus, setNewReportStatus] = useState({ name: '', isEditable: true, order: 0 });
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
    const sortedShifts = [...shifts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const sortedApparatus = [...apparatus].sort((a, b) => a.name.localeCompare(b.name));

    // Form States
    const [newFirefighter, setNewFirefighter] = useState<{ name: string; roleId: string; stationId: string | null; shiftId: string | null; pin: string; password: string; phoneNumber: string; startDate: string }>({ name: '', roleId: '', stationId: null, shiftId: null, pin: '', password: '', phoneNumber: '', startDate: '' });
    const [editingPassword, setEditingPassword] = useState('');
    const [newRole, setNewRole] = useState({ name: '' });
    const [newStation, setNewStation] = useState({ name: '', address: '' });
    const [newShift, setNewShift] = useState({ name: '', description: '' });
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

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
        fetchRequests();
        fetchFieldReportRequests();
        fetchTruckCheckRequests();
        fetchIssues(); // Fetch issues so badge is populated on load
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
        if (activeTab === 'directory-settings') {
            fetchDirectorySettings();
        }
        if (activeTab === 'notices') {
            fetchNoticeSettings();
        }
    }, [activeTab, issueSubTab, fieldReportTab]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const fetchFieldReports = async () => {
        try {
            const res = await fetch('/api/field-reports?limit=50');
            const data = await res.json();
            if (data.reports) setFieldReports(data.reports);
        } catch (error) {
            console.error('Failed to fetch reports', error);
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

    const handleDeleteFieldReport = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this field report?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/field-reports/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMessage('Field Report deleted successfully');
                fetchFieldReports();
            } else {
                setMessage('Failed to delete report');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            setMessage('Error deleting report');
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

    const handleSaveIncidentType = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const isEditing = !!editingIncidentType;
            const url = isEditing ? `/api/incident-types/${editingIncidentType.id}` : '/api/incident-types';
            const method = isEditing ? 'PUT' : 'POST';
            const name = isEditing ? editingIncidentType.name : newIncidentType;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (res.ok) {
                if (isEditing) {
                    setEditingIncidentType(null);
                    setMessage('Incident Type updated');
                } else {
                    setNewIncidentType('');
                    setMessage('Incident Type added');
                }
                fetchFieldReportConfig();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save incident type');
            }
        } catch (error: any) {
            setMessage(error.message || 'Failed to save incident type');
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
        const data = editingReportStatus || newReportStatus;
        try {
            const url = editingReportStatus ? `/api/report-statuses/${editingReportStatus.id}` : '/api/report-statuses';
            const method = editingReportStatus ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setEditingReportStatus(null);
                setNewReportStatus({ name: '', isEditable: true, order: 0 });
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

    const fetchNoticeSettings = async () => {
        try {
            const res = await fetch('/api/notices/settings');
            if (res.ok) {
                const data = await res.json();
                setNoticeSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch notice settings', error);
        }
    };

    const handleUpdateNoticeSettings = async (updates: Partial<{ everyoneCanPost: boolean; everyoneCanDelete: boolean }>) => {
        setLoading(true);
        try {
            const newSettings = { ...noticeSettings, ...updates };
            // Optimistic update
            setNoticeSettings(newSettings);

            const res = await fetch('/api/notices/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                setMessage('Notice settings updated successfully');
            } else {
                setMessage('Failed to update notice settings');
                fetchNoticeSettings(); // Revert on failure
            }
        } catch (error) {
            console.error('Failed to update notice settings:', error);
            setMessage('Error updating settings');
            fetchNoticeSettings();
        } finally {
            setLoading(false);
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

    const fetchFieldReportRequests = async () => {
        try {
            const res = await fetch('/api/field-report-requests?status=PENDING');
            if (res.ok) setFieldReportRequests(await res.json());
        } catch (error) {
            console.error('Failed to fetch field report requests');
        }
    };

    const fetchTruckCheckRequests = async () => {
        try {
            const res = await fetch('/api/truck-checks/requests?status=PENDING');
            if (res.ok) {
                const data = await res.json();
                setTruckCheckRequests(data.filter((r: any) => r.status === 'PENDING') || []);
            }
        } catch (error) {
            console.error('Failed to fetch truck check requests', error);
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

    const handleTruckCheckRequestAction = async (requestId: string, status: 'APPROVED' | 'DENIED') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/truck-checks/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to update request');
            fetchTruckCheckRequests();
            setMessage(`Truck Check ${status === 'APPROVED' ? 'reopened' : 'denied'} successfully`);
        } catch (error: any) {
            setMessage(error?.message || 'Error processing request');
        } finally {
            setLoading(false);
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
        if (!window.confirm("WARNING: Are you sure you want to completely delete this time entry? This action is permanent and will remove both the clock in and clock out records.")) {
            return;
        }
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
        const action = firefighter.isActive ? 'archive' : 'restore';
        if (!confirm(`Are you sure you want to ${action} ${firefighter.name}?${firefighter.isActive ? ' They will no longer appear in active rosters.' : ''}`)) return;
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

        if (!isValidPhoneNumber(newFirefighter.phoneNumber)) {
            setMessage('Invalid phone number format. Must be 10 or 11 digits.');
            return;
        }

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
            setNewFirefighter({ name: '', roleId: '', stationId: '', shiftId: null, pin: '', password: '', phoneNumber: '', startDate: '' });
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

        if (!isValidPhoneNumber(editingFirefighter.phoneNumber)) {
            setMessage('Invalid phone number format. Must be 10 or 11 digits.');
            return;
        }

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
                    shiftId: editingFirefighter.shiftId,
                    pin: editingFirefighter.pin,
                    phoneNumber: editingFirefighter.phoneNumber,
                    startDate: editingFirefighter.startDate,
                    isHiddenFromDirectory: editingFirefighter.isHiddenFromDirectory,
                    isAdmin: editingFirefighter.isAdmin,
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
            setNewRole({ name: '' });
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
                body: JSON.stringify({ name: editingRole.name }),
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

    // SHIFT HANDLERS
    const handleAddShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newShift),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create shift');
            setShifts([data, ...shifts]);
            setNewShift({ name: '', description: '' });
            setMessage('Shift added successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingShift) return;
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`/api/shifts/${editingShift.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingShift.name, description: editingShift.description }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update shift');
            setShifts(shifts.map(s => s.id === data.id ? data : s));
            setEditingShift(null);
            setMessage('Shift updated successfully!');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (!confirm('Are you sure you want to delete this shift?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete shift');
            setShifts(shifts.filter(s => s.id !== id));
            setMessage('Shift deleted successfully');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    // DIRECTORY SETTINGS HANDLERS
    const fetchDirectorySettings = async () => {
        try {
            const res = await fetch('/api/directory-settings');
            if (res.ok) {
                const data = await res.json();
                setDirectorySettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch directory settings', error);
        }
    };

    const handleSaveDirectorySettings = async () => {
        if (!directorySettings) return;
        setLoading(true);
        try {
            const res = await fetch('/api/directory-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(directorySettings),
            });
            if (res.ok) {
                const data = await res.json();
                setDirectorySettings(data);
                setMessage('Directory settings saved successfully!');
            } else {
                throw new Error('Failed to save');
            }
        } catch (err: any) {
            setMessage(err.message || 'Failed to save directory settings');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleHiddenFromDirectory = async (ff: Firefighter) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/firefighters/${ff.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: ff.name,
                    roleId: ff.roleId,
                    stationId: ff.stationId,
                    shiftId: ff.shiftId,
                    pin: ff.pin,
                    isHiddenFromDirectory: !ff.isHiddenFromDirectory,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update');
            setFirefighters(firefighters.map(f => f.id === ff.id ? { ...f, isHiddenFromDirectory: !f.isHiddenFromDirectory } : f));
            setMessage(`${ff.name} ${ff.isHiddenFromDirectory ? 'shown in' : 'hidden from'} directory`);
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

    const handleDeleteIssue = async (id: string) => {
        if (!window.confirm('Are you sure you want to permanently delete this issue? This action cannot be undone.')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete issue');

            fetchIssues();
            setMessage('Issue deleted successfully');
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

    const isSuccessMessage = message && (
        message.toLowerCase().includes('success') ||
        message.toLowerCase().includes('added') ||
        message.toLowerCase().includes('updated') ||
        message.toLowerCase().includes('deleted') ||
        message.toLowerCase().includes('saved') ||
        message.toLowerCase().includes('archived') ||
        message.toLowerCase().includes('restored')
    );

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

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Functionality Group */}
                        <div className="flex-[2] min-w-[300px]">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">Administration</h3>
                            <nav className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                                {[
                                    { id: 'reports', label: 'Time Reports', icon: FileText },
                                    { id: 'requests', label: 'Requests', icon: FileText, badge: (requests.length + fieldReportRequests.filter(r => r.status === 'PENDING').length + truckCheckRequests.length) > 0 ? (requests.length + fieldReportRequests.filter(r => r.status === 'PENDING').length + truckCheckRequests.length) : null },
                                    { id: 'issues', label: 'Issues', icon: AlertTriangle, badge: issues.filter(i => !i.isArchived && !['Resolved', 'Closed'].includes(i.status?.name)).length > 0 ? issues.filter(i => !i.isArchived && !['Resolved', 'Closed'].includes(i.status?.name)).length : null },
                                    { id: 'field-reports', label: 'Field Reports', icon: ClipboardList },
                                    { id: 'truck-checks', label: 'Truck Checks', icon: Truck },
                                    { id: 'training', label: 'Knowledge', icon: BookOpen },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center justify-start gap-2 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{tab.label}</span>
                                        {tab.badge ? (
                                            <span className={`ml-auto text-white text-xs px-2 py-0.5 rounded-full ${tab.id === 'issues' ? 'bg-orange-500' : 'bg-red-500'}`}>
                                                {tab.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Settings Group */}
                        <div className="flex-[2] min-w-[300px]">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-2">Settings</h3>
                            <nav className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                                {[
                                    { id: 'firefighters', label: 'Roster', icon: Users, badge: null },
                                    { id: 'roles', label: 'Roles', icon: Shield, badge: null },
                                    { id: 'stations', label: 'Stations', icon: MapPin, badge: null },
                                    { id: 'shifts', label: 'Shifts', icon: Clock, badge: null },
                                    { id: 'apparatus', label: 'Apparatus', icon: Truck, badge: null },
                                    { id: 'directory-settings', label: 'Directory', icon: Eye, badge: null },
                                    { id: 'notices', label: 'Notices', icon: AlertTriangle, badge: null },
                                    { id: 'logs', label: 'Audit Logs', icon: List, badge: null },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center justify-start gap-2 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${activeTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{tab.label}</span>
                                        {tab.badge ? (
                                            <span className={`ml-auto text-white text-xs px-2 py-0.5 rounded-full ${tab.id === 'issues' ? 'bg-orange-500' : 'bg-red-500'}`}>
                                                {tab.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8">
                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${isSuccessMessage ? 'bg-green-500/10 text-green-400 border border-green-500/20' : message.toLowerCase().includes('warning') || message.toLowerCase().includes('failed') ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {isSuccessMessage ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
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
                                                setNewFirefighter({ name: '', roleId: '', stationId: null, shiftId: null, pin: '', password: '', phoneNumber: '', startDate: '' });
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
                                    <input
                                        type="password"
                                        placeholder={editingFirefighter ? 'New Password (leave blank to keep)' : 'Password (Optional)'}
                                        value={editingFirefighter ? editingPassword : newFirefighter.password}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingPassword(e.target.value)
                                            : setNewFirefighter({ ...newFirefighter, password: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
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
                                    <select
                                        value={editingFirefighter ? (editingFirefighter.shiftId || '') : (newFirefighter.shiftId || '')}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, shiftId: e.target.value || null })
                                            : setNewFirefighter({ ...newFirefighter, shiftId: e.target.value || null })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Select Shift (Optional)</option>
                                        {sortedShifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number (Optional)"
                                        value={editingFirefighter ? (editingFirefighter.phoneNumber || '') : newFirefighter.phoneNumber}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, phoneNumber: e.target.value })
                                            : setNewFirefighter({ ...newFirefighter, phoneNumber: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <input
                                        type="date"
                                        placeholder="Start Date (Optional)"
                                        value={editingFirefighter ? (editingFirefighter.startDate ? editingFirefighter.startDate.split('T')[0] : '') : newFirefighter.startDate}
                                        onChange={(e) => editingFirefighter
                                            ? setEditingFirefighter({ ...editingFirefighter, startDate: e.target.value || null })
                                            : setNewFirefighter({ ...newFirefighter, startDate: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {editingFirefighter && (
                                        <label className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={editingFirefighter.isAdmin || false}
                                                onChange={(e) => setEditingFirefighter({ ...editingFirefighter, isAdmin: e.target.checked })}
                                                className="w-5 h-5 rounded border-slate-600 text-red-500 focus:ring-red-500 bg-slate-800"
                                            />
                                            <span className="text-sm font-medium text-slate-300">Admin Access</span>
                                        </label>
                                    )}
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
                                                <th className="pb-3 px-4">Shift</th>
                                                <th className="pb-3 px-4">PIN</th>
                                                <th className="pb-3 px-4">Phone</th>
                                                <th className="pb-3 px-4">Start Date</th>
                                                <th className="pb-3 px-4">Status</th>
                                                <th className="pb-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {sortedFirefighters.filter(ff => showArchived || ff.isActive).map((ff) => (
                                                <tr key={ff.id} className={`hover:bg-slate-700/50 transition-colors ${!ff.isActive ? 'opacity-60 bg-slate-900/30' : ''}`}>
                                                    <td className="py-3 px-4 font-medium">
                                                        {ff.name}
                                                        {ff.isAdmin && <span className="ml-2 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="bg-slate-700 px-2 py-1 rounded text-xs">{ff.role?.name}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400">{ff.station?.name || '-'}</td>
                                                    <td className="py-3 px-4 text-slate-400">{ff.shift?.name || '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-slate-500">{ff.pin}</td>
                                                    <td className="py-3 px-4 text-slate-400">{formatPhoneNumber(ff.phoneNumber) || '-'}</td>
                                                    <td className="py-3 px-4 text-slate-400">{ff.startDate ? new Date(ff.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {ff.isActive ?
                                                            <span className="text-green-400 text-xs font-bold">Active</span> :
                                                            <span className="text-slate-500 text-xs font-bold">Archived</span>
                                                        }
                                                    </td>
                                                    <td className="py-3 px-4 text-right space-x-2">
                                                        <button onClick={() => setEditingFirefighter(ff)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-blue-400" title="Edit">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch(`/api/firefighters/${ff.id}`, {
                                                                        method: 'PUT',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ name: ff.name, roleId: ff.roleId, stationId: ff.stationId, pin: ff.pin, isAdmin: !ff.isAdmin }),
                                                                    });
                                                                    if (res.ok) {
                                                                        setFirefighters(firefighters.map(f => f.id === ff.id ? { ...f, isAdmin: !f.isAdmin } : f));
                                                                        setMessage(`${ff.name} ${!ff.isAdmin ? 'granted' : 'revoked'} admin access.`);
                                                                    }
                                                                } catch { setMessage('Failed to toggle admin'); }
                                                            }}
                                                            className={`p-2 hover:bg-slate-600 rounded-lg transition-colors ${ff.isAdmin ? 'text-red-400' : 'text-slate-500'}`}
                                                            title={ff.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                                                        >
                                                            <Shield className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleArchiveFirefighter(ff)}
                                                            className={`p-2 hover:bg-slate-600 rounded-lg transition-colors ${ff.isActive ? 'text-orange-400' : 'text-green-400'}`}
                                                            title={ff.isActive ? 'Archive User' : 'Restore User'}
                                                        >
                                                            {ff.isActive ? <Archive className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                                                        </button>
                                                        <button onClick={() => handleDeleteFirefighter(ff.id)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-red-400" title="Delete">
                                                            <Trash2 className="h-4 w-4" />
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
                                    <thead><tr className="border-b border-slate-700 text-slate-400 text-sm"><th className="pb-3 px-4">Name</th><th className="pb-3 px-4">Actions</th></tr></thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {sortedRoles.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-700/50">
                                                <td className="py-3 px-4 font-medium">{r.name}</td>
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

                    {/* SHIFTS TAB */}
                    {activeTab === 'shifts' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock className="text-cyan-400" /> {editingShift ? 'Edit Shift' : 'New Shift'}</h2>
                                <form onSubmit={editingShift ? handleUpdateShift : handleAddShift} className="space-y-4">
                                    <input
                                        required
                                        placeholder="Shift Name (e.g., A-Shift)"
                                        value={editingShift ? editingShift.name : newShift.name}
                                        onChange={(e) => editingShift
                                            ? setEditingShift({ ...editingShift, name: e.target.value })
                                            : setNewShift({ ...newShift, name: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                                    />
                                    <input
                                        placeholder="Description (Optional)"
                                        value={editingShift ? (editingShift.description || '') : newShift.description}
                                        onChange={(e) => editingShift
                                            ? setEditingShift({ ...editingShift, description: e.target.value })
                                            : setNewShift({ ...newShift, description: e.target.value })
                                        }
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button disabled={loading} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                                            {loading ? 'Saving...' : (editingShift ? 'Update Shift' : 'Create Shift')}
                                        </button>
                                        {editingShift && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingShift(null)}
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
                                    <thead><tr className="border-b border-slate-700 text-slate-400 text-sm"><th className="pb-3 px-4">Name</th><th className="pb-3 px-4">Description</th><th className="pb-3 px-4">Actions</th></tr></thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {sortedShifts.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-700/50">
                                                <td className="py-3 px-4 font-medium">{s.name}</td>
                                                <td className="py-3 px-4 text-slate-400">{s.description || '-'}</td>
                                                <td className="py-3 px-4 flex gap-2">
                                                    <button onClick={() => setEditingShift(s)} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">Edit</button>
                                                    <button onClick={() => handleDeleteShift(s.id)} className="text-red-400 hover:text-red-300 text-sm font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedShifts.length === 0 && (
                                            <tr><td colSpan={3} className="py-8 text-center text-slate-500">No shifts created yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* KNOWLEDGE BASE TAB */}
                    {activeTab === 'training' && (
                        <div className="animate-in fade-in duration-300">
                            <AdminTraining roles={roles} />
                        </div>
                    )}

                    {/* DIRECTORY SETTINGS TAB */}
                    {activeTab === 'directory-settings' && (
                        <div className="space-y-8">
                            {/* Column Visibility */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Eye className="text-violet-400" /> Directory Column Visibility</h2>
                                <p className="text-slate-400 text-sm mb-4">Choose which columns are visible in the public firefighter directory.</p>
                                {directorySettings ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {[
                                                { key: 'showRadioId', label: 'Radio ID' },
                                                { key: 'showName', label: 'Name' },
                                                { key: 'showRole', label: 'Role' },
                                                { key: 'showStation', label: 'Station' },
                                                { key: 'showShift', label: 'Shift' },
                                                { key: 'showPhone', label: 'Phone Number' },
                                                { key: 'showStartDate', label: 'Start Date' },
                                            ].map((col) => (
                                                <label key={col.key} className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={(directorySettings as any)[col.key]}
                                                        onChange={(e) => setDirectorySettings({ ...directorySettings, [col.key]: e.target.checked })}
                                                        className="w-5 h-5 rounded border-slate-600 text-violet-500 focus:ring-violet-500 bg-slate-800"
                                                    />
                                                    <span className="text-sm font-medium">{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleSaveDirectorySettings}
                                            disabled={loading}
                                            className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Saving...' : 'Save Settings'}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-slate-500">Loading settings...</p>
                                )}
                            </div>

                            {/* Role Display Order */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="text-amber-400" /> Role Display Order</h2>
                                <p className="text-slate-400 text-sm mb-4">Drag and drop roles to set their display priority in the directory. Top = highest priority.</p>
                                {directorySettings ? (() => {
                                    // Build ordered list: roles in roleOrder first, then any remaining roles
                                    const orderedRoleIds: string[] = directorySettings.roleOrder || [];
                                    const orderedRoles = [
                                        ...orderedRoleIds.map(id => roles.find(r => r.id === id)).filter(Boolean),
                                        ...roles.filter(r => !orderedRoleIds.includes(r.id)),
                                    ] as Role[];

                                    return (
                                        <div className="space-y-2">
                                            {orderedRoles.map((role, index) => (
                                                <div
                                                    key={role.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', role.id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        (e.target as HTMLElement).style.opacity = '0.5';
                                                    }}
                                                    onDragEnd={(e) => {
                                                        (e.target as HTMLElement).style.opacity = '1';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        (e.currentTarget as HTMLElement).classList.add('ring-2', 'ring-amber-400/50');
                                                    }}
                                                    onDragLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-amber-400/50');
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-amber-400/50');
                                                        const draggedId = e.dataTransfer.getData('text/plain');
                                                        if (draggedId === role.id) return;
                                                        const currentIds = orderedRoles.map(r => r.id);
                                                        const fromIdx = currentIds.indexOf(draggedId);
                                                        const toIdx = currentIds.indexOf(role.id);
                                                        if (fromIdx < 0) return;
                                                        const newOrder = [...currentIds];
                                                        newOrder.splice(fromIdx, 1);
                                                        newOrder.splice(toIdx, 0, draggedId);
                                                        setDirectorySettings({ ...directorySettings, roleOrder: newOrder });
                                                    }}
                                                    className="flex items-center gap-4 bg-slate-900/50 rounded-lg px-4 py-3 cursor-grab active:cursor-grabbing hover:bg-slate-700/50 transition-all select-none border border-transparent"
                                                >
                                                    <span className="text-slate-500 text-xs font-mono w-5 text-center">{index + 1}</span>
                                                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                                        <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
                                                        <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                                                        <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
                                                    </svg>
                                                    <span className="font-medium">{role.name}</span>
                                                </div>
                                            ))}
                                            <button
                                                onClick={handleSaveDirectorySettings}
                                                disabled={loading}
                                                className="mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save Role Order'}
                                            </button>
                                        </div>
                                    );
                                })() : (
                                    <p className="text-slate-500">Loading settings...</p>
                                )}
                            </div>

                            {/* Station Display Order */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MapPin className="text-amber-400" /> Station Display Order</h2>
                                <p className="text-slate-400 text-sm mb-4">Drag and drop stations to set their display priority in the directory grouped view. Top = highest priority.</p>
                                {directorySettings ? (() => {
                                    // Build ordered list: stations in stationOrder first, then any remaining stations
                                    const orderedStationIds: string[] = directorySettings.stationOrder || [];
                                    const orderedStations = [
                                        ...orderedStationIds.map(id => stations.find(s => s.id === id)).filter(Boolean),
                                        ...stations.filter(s => !orderedStationIds.includes(s.id)),
                                    ] as Station[];

                                    return (
                                        <div className="space-y-2">
                                            {orderedStations.map((station, index) => (
                                                <div
                                                    key={station.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', station.id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        (e.target as HTMLElement).style.opacity = '0.5';
                                                    }}
                                                    onDragEnd={(e) => {
                                                        (e.target as HTMLElement).style.opacity = '1';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        (e.currentTarget as HTMLElement).classList.add('ring-2', 'ring-amber-400/50');
                                                    }}
                                                    onDragLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-amber-400/50');
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-amber-400/50');
                                                        const draggedId = e.dataTransfer.getData('text/plain');
                                                        if (draggedId === station.id) return;
                                                        const currentIds = orderedStations.map(s => s.id);
                                                        const fromIdx = currentIds.indexOf(draggedId);
                                                        const toIdx = currentIds.indexOf(station.id);
                                                        if (fromIdx < 0) return;
                                                        const newOrder = [...currentIds];
                                                        newOrder.splice(fromIdx, 1);
                                                        newOrder.splice(toIdx, 0, draggedId);
                                                        setDirectorySettings({ ...directorySettings, stationOrder: newOrder });
                                                    }}
                                                    className="flex items-center gap-4 bg-slate-900/50 rounded-lg px-4 py-3 cursor-grab active:cursor-grabbing hover:bg-slate-700/50 transition-all select-none border border-transparent"
                                                >
                                                    <span className="text-slate-500 text-xs font-mono w-5 text-center">{index + 1}</span>
                                                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                                        <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
                                                        <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                                                        <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
                                                    </svg>
                                                    <span className="font-medium">{station.name}</span>
                                                </div>
                                            ))}
                                            <button
                                                onClick={handleSaveDirectorySettings}
                                                disabled={loading}
                                                className="mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save Station Order'}
                                            </button>
                                        </div>
                                    );
                                })() : (
                                    <p className="text-slate-500">Loading settings...</p>
                                )}
                            </div>

                            {/* Hidden from Directory */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><EyeOff className="text-rose-400" /> Directory Visibility per Firefighter</h2>
                                <p className="text-slate-400 text-sm mb-4">Toggle which firefighters appear in the public directory. Hidden firefighters can still clock in/out and use all other features.</p>
                                <div className="space-y-2">
                                    {firefighters.filter(f => f.isActive).sort((a, b) => a.name.localeCompare(b.name)).map((ff) => (
                                        <div key={ff.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3 hover:bg-slate-700/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">{ff.name}</span>
                                                <span className="text-xs text-slate-400">{ff.role?.name}</span>
                                                {ff.station && <span className="text-xs text-slate-500">• {ff.station.name}</span>}
                                            </div>
                                            <button
                                                onClick={() => handleToggleHiddenFromDirectory(ff)}
                                                disabled={loading}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${ff.isHiddenFromDirectory
                                                    ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                    }`}
                                            >
                                                {ff.isHiddenFromDirectory ? <><EyeOff className="w-4 h-4" /> Hidden</> : <><Eye className="w-4 h-4" /> Visible</>}
                                            </button>
                                        </div>
                                    ))}
                                </div>
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
                                <div>
                                    {/* All Personnel Card */}
                                    {(() => {
                                        const totalMs = Object.values(summaryStats).reduce((acc, curr) => acc + curr.totalMs, 0);
                                        const totalCalls = Object.values(callCounts).reduce((acc, count) => acc + count, 0);
                                        const totalShifts = Object.values(summaryStats).reduce((acc, curr) => acc + curr.count, 0);

                                        const totalHours = totalMs / (1000 * 60 * 60);
                                        const hours = Math.floor(totalHours);
                                        const minutes = Math.floor((totalHours - hours) * 60);

                                        return (
                                            <div className="bg-slate-700/50 p-6 rounded-xl border-2 border-slate-600 flex justify-between items-center shadow-lg mb-6 max-w-2xl">
                                                <div>
                                                    <p className="font-bold text-xl text-white flex items-center gap-2"><Users className="w-6 h-6 text-blue-400" /> All Personnel Summary</p>
                                                    <div className="flex gap-6 text-sm text-slate-300 mt-2">
                                                        <span><span className="font-bold text-white">{totalShifts}</span> shifts</span>
                                                        <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-blue-400" /> <span className="font-bold text-white">{totalCalls}</span> calls</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-mono text-green-400 bg-slate-800 px-4 py-2 rounded-lg inline-block whitespace-nowrap shadow-inner border border-slate-700">{hours}h {minutes}m</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="overflow-x-auto w-full scrollbar-thin">
                                        <table className="w-full text-left whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                            <thead>
                                                <tr className="border-b border-slate-700 text-slate-400 text-sm">
                                                    <th className="pb-3 px-4">Personnel</th>
                                                    <th className="pb-3 px-4">Shifts</th>
                                                    <th className="pb-3 px-4">Calls</th>
                                                    <th className="pb-3 px-4 text-right">Total Hours</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {(() => {
                                                    const aggregatedStats = sortedFirefighters.map(ff => {
                                                        const stats = summaryStats[ff.id] || { count: 0, totalMs: 0 };
                                                        const calls = callCounts[ff.id] || 0;
                                                        return {
                                                            id: ff.id,
                                                            name: ff.name,
                                                            count: stats.count,
                                                            totalMs: stats.totalMs,
                                                            calls: calls
                                                        };
                                                    }).filter(stat => stat.count > 0 || stat.calls > 0)
                                                    .sort((a,b) => b.totalMs - a.totalMs);

                                                    if (aggregatedStats.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={4} className="py-6 text-center text-slate-500 italic">No activity recorded for this period.</td>
                                                            </tr>
                                                        );
                                                    }

                                                    return aggregatedStats.map((stat) => {
                                                        const totalHours = stat.totalMs / (1000 * 60 * 60);
                                                        const hours = Math.floor(totalHours);
                                                        const minutes = Math.floor((totalHours - hours) * 60);
                                                        
                                                        return (
                                                            <tr key={stat.id} className="hover:bg-slate-700/50 transition-colors">
                                                                <td className="py-4 px-4 font-bold text-white text-lg">{stat.name}</td>
                                                                <td className="py-4 px-4 text-slate-300 text-base">{stat.count}</td>
                                                                <td className="py-4 px-4 text-blue-400 font-bold text-base">{stat.calls}</td>
                                                                <td className="py-4 px-4 text-right font-mono text-green-400 text-lg">{hours}h {minutes}m</td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
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
                                                        <td className="py-3 px-4 flex gap-2">
                                                            <button
                                                                onClick={() => setEditingTimeEntry(entry)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTimeEntry(entry.id)}
                                                                className="text-red-400 hover:text-red-300 text-sm font-medium"
                                                            >
                                                                Delete
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
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                            <h2 className="text-xl font-bold p-6 border-b border-slate-700 flex items-center gap-2"><FileText className="text-yellow-400" /> Pending Time Change Requests ({requests.length})</h2>
                            {requests.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No pending time change requests.</p>
                            ) : (
                                <div className="p-6 space-y-4">
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
                            {/* FIELD REPORT MOD REQUESTS */}
                            <h2 className="text-xl font-bold p-6 border-b border-t border-slate-700 flex items-center gap-2 mt-4"><GitPullRequest className="text-blue-400" /> Pending Field Report Reopens ({fieldReportRequests.filter(r => r.status === 'PENDING').length})</h2>
                            {fieldReportRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No pending field report modifications.</p>
                            ) : (
                                <div className="p-6 overflow-x-auto w-full scrollbar-thin">
                                    <table className="w-full text-left whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                        <thead>
                                            <tr className="bg-slate-900/50 text-slate-400 text-sm">
                                                <th className="p-4 font-semibold">Report Date</th>
                                                <th className="p-4 font-semibold">Requested By</th>
                                                <th className="p-4 font-semibold">Type</th>
                                                <th className="p-4 font-semibold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {fieldReportRequests.filter(r => r.status === 'PENDING').map(req => (
                                                <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4 font-medium">{format(new Date(req.report.date), 'MMM d, yyyy')}</td>
                                                    <td className="p-4 text-white">{req.requestedByUser?.name || 'Unknown'}</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded bg-slate-700 text-xs font-bold font-mono">
                                                            {req.requestType === 'add_self_to_apparatus' ? 'Add Self to Unit' :
                                                                req.requestType === 'add_apparatus_with_self' ? 'Add Unit & Self' :
                                                                    req.requestType === 'general_edit' ? 'General Edit' : req.requestType}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 flex gap-2">
                                                        <button
                                                            onClick={() => setSelectedModRequest(req)}
                                                            className="text-blue-400 hover:text-blue-300 font-medium text-sm flex items-center gap-1"
                                                        >
                                                            Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                            }

                            {/* TRUCK CHECK REOPEN REQUESTS */}
                            <h2 className="text-xl font-bold p-6 border-b border-t border-slate-700 flex items-center gap-2 mt-4"><Truck className="text-orange-400" /> Pending Truck Check Reopens ({truckCheckRequests.length})</h2>
                            {truckCheckRequests.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No pending truck check reopen requests.</p>
                            ) : (
                                <div className="p-6 overflow-x-auto w-full scrollbar-thin">
                                    <table className="w-full text-left whitespace-nowrap sm:whitespace-normal min-w-max sm:min-w-0">
                                        <thead>
                                            <tr className="bg-slate-900/50 text-slate-400 text-sm">
                                                <th className="p-4 font-semibold">Report</th>
                                                <th className="p-4 font-semibold">Requested By</th>
                                                <th className="p-4 font-semibold">Date</th>
                                                <th className="p-4 font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {truckCheckRequests.map(req => (
                                                <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4 font-medium text-slate-200">
                                                        <div>{req.report?.apparatus?.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono mt-1">ID: {req.reportId.slice(0, 8)}...</div>
                                                    </td>
                                                    <td className="p-4 text-white">{req.requestedByUser?.name || 'Unknown'}</td>
                                                    <td className="p-4 text-slate-400">{format(new Date(req.createdAt), 'MMM d, yyyy HH:mm')}</td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleTruckCheckRequestAction(req.id, 'APPROVED')} className="px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-sm font-medium transition-colors">
                                                                Approve
                                                            </button>
                                                            <button onClick={() => handleTruckCheckRequestAction(req.id, 'DENIED')} className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium transition-colors">
                                                                Deny
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateIssue(issue, { isArchived: !issue.isArchived })}
                                                            className={`px-3 py-1 rounded-lg text-sm font-bold border transition-colors ${issue.isArchived ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                                                        >
                                                            {issue.isArchived ? 'Unarchive' : 'Archive'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteIssue(issue.id)}
                                                            className="px-3 py-1 rounded-lg text-sm font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                                                            title="Delete Issue"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
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
                                <button onClick={() => setFieldReportTab('types')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${fieldReportTab === 'types' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings className="w-4 h-4" /> Incident Types</button>
                                <button onClick={() => setFieldReportTab('statuses')} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${fieldReportTab === 'statuses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><List className="w-4 h-4" /> Statuses</button>
                            </div>

                            {fieldReportTab === 'types' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 h-fit">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold">{editingIncidentType ? 'Edit Incident Type' : 'New Incident Type'}</h3>
                                            {editingIncidentType && (
                                                <button onClick={() => setEditingIncidentType(null)} className="text-sm text-slate-400 hover:text-white">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                        <form onSubmit={handleSaveIncidentType} className="space-y-4">
                                            <input
                                                placeholder="Type Name"
                                                value={editingIncidentType ? editingIncidentType.name : newIncidentType}
                                                onChange={e => {
                                                    if (editingIncidentType) {
                                                        setEditingIncidentType({ ...editingIncidentType, name: e.target.value });
                                                    } else {
                                                        setNewIncidentType(e.target.value);
                                                    }
                                                }}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required
                                            />
                                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors">
                                                {editingIncidentType ? 'Save Changes' : 'Add Type'}
                                            </button>
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
                                                            <div className="flex gap-2 items-center">
                                                                <button onClick={() => setEditingIncidentType(t)} className="text-slate-400 hover:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDeleteIncidentType(t.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
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
                                                <input type="checkbox" checked={editingReportStatus ? editingReportStatus.isEditable : newReportStatus.isEditable} onChange={e => editingReportStatus ? setEditingReportStatus({ ...editingReportStatus, isEditable: e.target.checked }) : setNewReportStatus({ ...newReportStatus, isEditable: e.target.checked })} />
                                                <label className="text-sm text-slate-300">Is Editable (Open)</label>
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
                                                            {s.isEditable ? <span className="bg-green-500/10 text-green-500 px-1 rounded">Editable</span> : <span className="bg-red-500/10 text-red-500 px-1 rounded">Locked</span>}
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
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={async () => {
                                                                        const res = await fetch(`/api/field-reports/${report.id}`);
                                                                        if (res.ok) setSelectedReport(await res.json());
                                                                    }}
                                                                    className="text-blue-400 hover:text-blue-300 font-medium text-sm flex items-center gap-1"
                                                                >
                                                                    View Details
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteFieldReport(report.id)}
                                                                    className="text-red-400 hover:text-red-300 font-medium text-sm flex items-center gap-1"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
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

                        </div>
                    )}

                    {/* NOTICES SETTINGS TAB */}
                    {activeTab === 'notices' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl max-w-2xl mx-auto">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                    <AlertTriangle className="w-6 h-6 text-blue-400" />
                                    <h2 className="text-xl font-bold">Important Notices Settings</h2>
                                </div>

                                <div className="space-y-6">
                                    <p className="text-slate-400 text-sm mb-4">
                                        Configure who can post and delete messages in the Notices Section of the User Dashboard. As an admin, you will always have these privileges regardless of these settings.
                                    </p>

                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                                        <div>
                                            <h3 className="font-bold text-slate-200">Everyone Can Post</h3>
                                            <p className="text-xs text-slate-500 mt-1">Allow all users to create new notices.</p>
                                        </div>
                                        <button
                                            onClick={() => handleUpdateNoticeSettings({ everyoneCanPost: !noticeSettings.everyoneCanPost })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${noticeSettings.everyoneCanPost ? 'bg-blue-600' : 'bg-slate-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${noticeSettings.everyoneCanPost ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                                        <div>
                                            <h3 className="font-bold text-slate-200">Everyone Can Delete</h3>
                                            <p className="text-xs text-slate-500 mt-1">Allow all users to delete ANY notice (including those posted by admins).</p>
                                        </div>
                                        <button
                                            onClick={() => handleUpdateNoticeSettings({ everyoneCanDelete: !noticeSettings.everyoneCanDelete })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${noticeSettings.everyoneCanDelete ? 'bg-blue-600' : 'bg-slate-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${noticeSettings.everyoneCanDelete ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-200 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0" />
                                        <p>Note: Users can always delete their own notices if they were the author.</p>
                                    </div>
                                </div>
                            </div>
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


                    {/* REQUEST DETAIL MODAL (GLOBAL) */}
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
        </div >
    );
}
