'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { X, Plus, Trash2, Save, Truck, Users, MapPin, Clock, FileText, CheckCircle, Loader2, Calendar } from 'lucide-react';

// Converts any reasonable time input to "h:mm AM/PM" standard format.
// Accepts: "13:31", "1331", "1:31 PM", "1:31pm", bare hours like "9", etc.
function parseToStandardTime(input: string): string {
    if (!input.trim()) return '';

    // Already has AM/PM — normalize and return
    const ampmMatch = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (ampmMatch) {
        const h = parseInt(ampmMatch[1]);
        const m = parseInt(ampmMatch[2] ?? '0');
        const period = ampmMatch[3].toUpperCase();
        if (h >= 1 && h <= 12 && m >= 0 && m <= 59)
            return `${h}:${m.toString().padStart(2, '0')} ${period}`;
        return input;
    }

    // Parse 24-hour / military format
    let h: number, m: number;
    const colonMatch = input.trim().match(/^(\d{1,2}):(\d{2})$/);
    const digits = input.replace(/\D/g, '');

    if (colonMatch) {
        h = parseInt(colonMatch[1]);
        m = parseInt(colonMatch[2]);
    } else if (digits.length === 4) {
        h = parseInt(digits.slice(0, 2));
        m = parseInt(digits.slice(2));
    } else if (digits.length === 3) {
        h = parseInt(digits[0]);
        m = parseInt(digits.slice(1));
    } else if (digits.length <= 2) {
        h = parseInt(digits);
        m = 0;
    } else {
        return input;
    }

    if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return input;

    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

// Converts a HH:MM string (from type="time" picker) to standard time
function hhmmToStandard(hhmm: string): string {
    return parseToStandardTime(hhmm);
}

// Segmented time input: HH | MM | AM/PM with keyboard navigation and military time support
function AlarmTimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const parsed = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const h = parsed ? parseInt(parsed[1]) : 12;
    const m = parsed ? parseInt(parsed[2]) : 0;
    const p = (parsed ? parsed[3].toUpperCase() : 'AM') as 'AM' | 'PM';
    const hasValue = !!parsed;

    const [seg, setSeg] = useState<0 | 1 | 2>(0);
    const [focused, setFocused] = useState(false);
    const [hBuf, setHBuf] = useState('');
    const [mBuf, setMBuf] = useState('');

    const emit = (nh: number, nm: number, np: 'AM' | 'PM') =>
        onChange(`${nh}:${nm.toString().padStart(2, '0')} ${np}`);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const key = e.key;
        if (key === 'ArrowLeft') {
            e.preventDefault();
            if (seg === 0 && hBuf) { const n = parseInt(hBuf); if (n >= 1 && n <= 12) emit(n, m, p); setHBuf(''); }
            if (seg === 1 && mBuf) { const n = parseInt(mBuf); if (n <= 59) emit(h, n, p); setMBuf(''); }
            setSeg(s => { if (s === 0) return 2; return (s - 1) as 0 | 1 | 2; });
        } else if (key === 'ArrowRight') {
            e.preventDefault();
            if (seg === 0 && hBuf) { const n = parseInt(hBuf); if (n >= 1 && n <= 12) emit(n, m, p); setHBuf(''); }
            if (seg === 1 && mBuf) { const n = parseInt(mBuf); if (n <= 59) emit(h, n, p); setMBuf(''); }
            setSeg(s => { if (s === 2) return 0; return (s + 1) as 0 | 1 | 2; });
        } else if (key === 'ArrowUp') {
            e.preventDefault();
            setHBuf(''); setMBuf('');
            if (seg === 0) emit(h === 1 ? 12 : h - 1, m, p);
            else if (seg === 1) emit(h, (m - 1 + 60) % 60, p);
            else emit(h, m, p === 'AM' ? 'PM' : 'AM');
        } else if (key === 'ArrowDown') {
            e.preventDefault();
            setHBuf(''); setMBuf('');
            if (seg === 0) emit(h === 12 ? 1 : h + 1, m, p);
            else if (seg === 1) emit(h, (m + 1) % 60, p);
            else emit(h, m, p === 'AM' ? 'PM' : 'AM');
        } else if (/^\d$/.test(key)) {
            e.preventDefault();
            if (seg === 0) {
                const buf = hBuf + key;
                const num = parseInt(buf);
                if (buf.length === 1) {
                    setHBuf(buf); // always wait for second digit
                } else {
                    if (num >= 13 && num <= 23) { emit(num - 12, m, 'PM'); setHBuf(''); setSeg(1); }
                    else if (num >= 1 && num <= 12) { emit(num, m, p); setHBuf(''); setSeg(1); }
                    else if (num === 0) { emit(12, m, 'AM'); setHBuf(''); setSeg(1); }
                    else { setHBuf(''); } // invalid (24+) — clear, stay on hours
                }
            } else if (seg === 1) {
                const buf = mBuf + key;
                const num = parseInt(buf);
                if (buf.length === 1) {
                    setMBuf(buf); // always wait for second digit
                } else {
                    if (num <= 59) emit(h, num, p);
                    setMBuf(''); setSeg(2);
                }
            }
        } else if ((key === 'a' || key === 'A') && seg === 2) {
            e.preventDefault(); emit(h, m, 'AM');
        } else if ((key === 'p' || key === 'P') && seg === 2) {
            e.preventDefault(); emit(h, m, 'PM');
        }
    };

    const s = (i: 0 | 1 | 2) =>
        `rounded px-1 ${focused && seg === i ? 'bg-blue-600 text-white' : 'text-white'}`;

    return (
        <div
            tabIndex={0}
            onFocus={() => setFocused(true)}
            onBlur={() => {
                if (hBuf) { const n = parseInt(hBuf); if (n >= 1 && n <= 12) emit(n, m, p); }
                if (mBuf) { const n = parseInt(mBuf); if (n <= 59) emit(h, n, p); }
                setFocused(false); setHBuf(''); setMBuf('');
            }}
            onKeyDown={handleKeyDown}
            className={`flex items-center w-full bg-slate-800 border rounded-lg px-4 py-2.5 pr-10 outline-none select-none cursor-default ${focused ? 'border-blue-500 ring-2 ring-blue-500' : 'border-slate-700'}`}
        >
            <span data-seg="0" onClick={() => setSeg(0)} className={s(0)}>
                {hBuf ? hBuf.padEnd(2, '_') : hasValue ? h.toString().padStart(2, '0') : '--'}
            </span>
            <span className="text-slate-400 mx-0.5">:</span>
            <span data-seg="1" onClick={() => setSeg(1)} className={`${s(1)} min-w-[2ch] text-center`}>
                {mBuf ? mBuf.padEnd(2, '_') : hasValue ? m.toString().padStart(2, '0') : '--'}
            </span>
            <span className="text-slate-400 mx-1.5">&nbsp;</span>
            <span data-seg="2" onClick={() => setSeg(2)} className={s(2)}>
                {hasValue ? p : 'AM'}
            </span>
        </div>
    );
}

type FieldReportFormProps = {
    initialData?: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    incidentTypes: any[];
    firefighters: any[];
    apparatus: any[];
    user: any;
    mode?: 'create' | 'edit' | 'request';
    onRequestSubmit?: (data: any, reason: string) => Promise<void>;
    reportStatuses?: any[];
};

export default function FieldReportForm({ initialData, onSubmit, onCancel, incidentTypes, firefighters, apparatus, user, mode = 'create', onRequestSubmit, reportStatuses }: FieldReportFormProps) {
    const [formData, setFormData] = useState({
        incidentTypeId: initialData?.incidentTypeId || '',
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        alarmTime: initialData?.alarmTime ? parseToStandardTime(initialData.alarmTime) : '',
        location: initialData?.location || '',
        district: initialData?.district || '',
        officerInCharge: initialData?.officerInCharge || '',
        incidentSummary: initialData?.incidentSummary || '',
        esoReportCompleted: initialData?.esoReportCompleted || false,
        assignedApparatus: initialData?.assignedApparatus?.map((a: any) => ({
            apparatusId: a.apparatusId,
            personnel: a.personnel.map((p: any) => ({
                firefighterId: p.firefighterId,
                firefighterRadioId: p.firefighterRadioId
            }))
        })) || []
    });

    const [reason, setReason] = useState('');
    const [paramLoading, setParamLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // Track search text for each personnel input: key = `${appIndex}-${pIndex}`
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
    const [activeSearch, setActiveSearch] = useState<string | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [focusTarget, setFocusTarget] = useState<{ appIndex: number, pIndex: number } | null>(null);

    const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
    const isLocationInputFocused = useRef(false);
    const [userState, setUserState] = useState<string | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [lockedPersonnel, setLockedPersonnel] = useState<Set<string>>(() => {
        // Pre-lock any personnel that already have a firefighterId from initialData
        const locked = new Set<string>();
        if (initialData?.assignedApparatus) {
            initialData.assignedApparatus.forEach((app: any, aIdx: number) => {
                app.personnel.forEach((p: any, pIdx: number) => {
                    if (p.firefighterId) locked.add(`${aIdx}-${pIdx}`);
                });
            });
        }
        return locked;
    });
    const dateInputRef = useRef<HTMLInputElement>(null);
    const alarmTimeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch('/api/geoip')
            .then(r => r.json())
            .then(d => { if (d.state) setUserState(d.state); })
            .catch(() => {});

        // Request coarse geolocation (network-based, fast) for proximity sorting
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            const timeout = setTimeout(() => {}, 0); // no-op, just for scoping
            navigator.geolocation.getCurrentPosition(
                pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => {}, // silently ignore denial/error
                { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
            );
        }
    }, []);

    const handleLocationSearch = (query: string) => {
        setFormData({ ...formData, location: query });
        if (query.trim().length > 3) {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = setTimeout(async () => {
                setFetchingLocation(true);
                try {
                    // Use structured search with state param to strictly limit results to the user's state
                    const url = userState
                        ? `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(query)}&state=${encodeURIComponent(userState)}&country=us&limit=5&addressdetails=1`
                        : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us`;
                    const res = await fetch(url);
                    let data = await res.json();
                    // Sort by proximity if we have the user's coordinates
                    if (userCoords && data.length > 1) {
                        data = data.slice().sort((a: any, b: any) => {
                            const dA = Math.hypot(parseFloat(a.lat) - userCoords.lat, parseFloat(a.lon) - userCoords.lng);
                            const dB = Math.hypot(parseFloat(b.lat) - userCoords.lat, parseFloat(b.lon) - userCoords.lng);
                            return dA - dB;
                        });
                    }
                    setLocationSuggestions(data);
                    if (isLocationInputFocused.current) {
                        setShowLocationDropdown(true);
                    }
                } catch (error) {
                    console.error('Failed to fetch address suggestions', error);
                } finally {
                    setFetchingLocation(false);
                }
            }, 500);
        } else {
            setShowLocationDropdown(false);
            setLocationSuggestions([]);
        }
    };

    const formatAddress = (item: any) => {
        if (!item.address) return item.display_name.split(',').slice(0, 3).join(', ');
        const addr = item.address;
        const houseNumber = addr.house_number || '';
        const road = addr.road || '';
        const street = houseNumber ? `${houseNumber} ${road}`.trim() : road;

        const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
        const state = addr.state || '';

        const parts = [street, city, state].filter(Boolean);
        return parts.join(', ');
    };

    const selectLocation = (item: any) => {
        const cleanAddress = formatAddress(item);
        setFormData({ ...formData, location: cleanAddress });
        setShowLocationDropdown(false);
    };

    // Initialize search terms from initial data
    useEffect(() => {
        if (initialData?.assignedApparatus) {
            const terms: Record<string, string> = {};
            initialData.assignedApparatus.forEach((app: any, aIdx: number) => {
                app.personnel.forEach((p: any, pIdx: number) => {
                    const ff = firefighters.find(f => f.id === p.firefighterId);
                    if (ff) {
                        terms[`${aIdx}-${pIdx}`] = `${ff.name} (${ff.pin || 'N/A'})`;
                    } else if (p.firefighterId) {
                        // Fallback if FF not found in list but ID exists (unlikely given full fetch)
                        terms[`${aIdx}-${pIdx}`] = 'Unknown Firefighter';
                    }
                });
            });
            setSearchTerms(terms);
        }
    }, [initialData, firefighters]);

    const handleFormSubmit = async (e: React.FormEvent, statusName?: string) => {
        e.preventDefault();

        // If not saving as draft, explicitly trigger HTML5 constraint validation
        if (statusName !== 'Draft') {
            const form = (e.currentTarget as HTMLElement).closest('form');
            if (form && !form.checkValidity()) {
                form.reportValidity();
                return;
            }
        }

        setSubmitting(true);

        if (!formData.incidentTypeId) {
            alert('Please select an Incident Type to save or submit this report.');
            setSubmitting(false);
            return;
        }

        if (statusName !== 'Draft' && !formData.alarmTime) {
            alert('Please enter an Alarm Time.');
            setSubmitting(false);
            return;
        }

        // Validation: Check for empty personnel fields only if NOT saving as a draft
        if (statusName !== 'Draft') {
            for (const app of formData.assignedApparatus) {
                for (const p of app.personnel) {
                    if (!p.firefighterId) {
                        alert('Please select a firefighter for all personnel entries or remove empty rows.');
                        setSubmitting(false);
                        return;
                    }
                }
            }
        }

        try {
            if (mode === 'request' && onRequestSubmit) {
                await onRequestSubmit({
                    ...formData,
                    createdByUserId: user.id,
                    createdByRadioId: firefighters.find(f => f.id === user.id)?.pin || (user as any).pin || 'N/A'
                }, reason);
            } else {
                let statusId = initialData?.statusId;
                if (statusName === 'Draft' && reportStatuses) {
                    const draftStatus = reportStatuses.find(s => s.isEditable);
                    if (draftStatus) statusId = draftStatus.id;
                } else if (statusName === 'Submitted' && reportStatuses) {
                    const finalStatus = reportStatuses.find(s => !s.isEditable);
                    if (finalStatus) {
                        statusId = finalStatus.id;
                    } else {
                        alert('Configuration Error: No non-editable (Final) status found. Please configure a status with "Is Editable" turned OFF in the Admin Dashboard before submitting.');
                        setSubmitting(false);
                        return;
                    }
                } else if (statusName && reportStatuses) {
                    const status = reportStatuses.find(s => s.name === statusName);
                    if (status) statusId = status.id;
                }

                await onSubmit({
                    ...formData,
                    statusId,
                    createdByUserId: user.id,
                    createdByRadioId: firefighters.find(f => f.id === user.id)?.pin || (user as any).pin || 'N/A'
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const addApparatus = () => {
        setFormData({
            ...formData,
            assignedApparatus: [
                ...formData.assignedApparatus,
                { apparatusId: '', personnel: [] }
            ]
        });
    };

    const removeApparatus = (index: number) => {
        const newApparatus = [...formData.assignedApparatus];
        newApparatus.splice(index, 1);
        setFormData({ ...formData, assignedApparatus: newApparatus });
    };

    const updateApparatus = (index: number, field: string, value: any) => {
        const newApparatus = [...formData.assignedApparatus];
        newApparatus[index] = { ...newApparatus[index], [field]: value };
        setFormData({ ...formData, assignedApparatus: newApparatus });
    };

    const addPersonnel = (appIndex: number) => {
        const newApparatus = [...formData.assignedApparatus];
        newApparatus[appIndex].personnel.push({ firefighterId: '', firefighterRadioId: '' });
        setFormData({ ...formData, assignedApparatus: newApparatus });
        // Set focus to the new item (last index)
        setFocusTarget({ appIndex, pIndex: newApparatus[appIndex].personnel.length - 1 });
    };

    const removePersonnel = (appIndex: number, pIndex: number) => {
        const newApparatus = [...formData.assignedApparatus];
        newApparatus[appIndex].personnel.splice(pIndex, 1);
        setFormData({ ...formData, assignedApparatus: newApparatus });

        // Shift searchTerms keys for this apparatus
        const newSearchTerms = { ...searchTerms };
        delete newSearchTerms[`${appIndex}-${pIndex}`];
        Object.keys(newSearchTerms).forEach(key => {
            const [aIdx, pIdx] = key.split('-').map(Number);
            if (aIdx === appIndex && pIdx > pIndex) {
                newSearchTerms[`${appIndex}-${pIdx - 1}`] = newSearchTerms[key];
                delete newSearchTerms[key];
            }
        });
        setSearchTerms(newSearchTerms);

        // Shift lockedPersonnel keys the same way
        setLockedPersonnel(prev => {
            const next = new Set<string>();
            prev.forEach(key => {
                const [aIdx, pIdx] = key.split('-').map(Number);
                if (aIdx === appIndex && pIdx === pIndex) return; // remove this one
                if (aIdx === appIndex && pIdx > pIndex) {
                    next.add(`${appIndex}-${pIdx - 1}`); // shift down
                } else {
                    next.add(key);
                }
            });
            return next;
        });
    };

    const handleSearchChange = (appIndex: number, pIndex: number, value: string) => {
        setSearchTerms({ ...searchTerms, [`${appIndex}-${pIndex}`]: value });
        setActiveSearch(`${appIndex}-${pIndex}`);
        setHighlightedIndex(null); // Reset highlight on typing

        // If cleared, also clear the ID
        if (!value) {
            updatePersonnel(appIndex, pIndex, 'firefighterId', '');
        }
    };

    const selectFirefighter = (appIndex: number, pIndex: number, ff: any) => {
        const newApparatus = [...formData.assignedApparatus];
        newApparatus[appIndex].personnel[pIndex] = {
            ...newApparatus[appIndex].personnel[pIndex],
            firefighterId: ff.id,
            firefighterRadioId: ff.pin
        };
        setFormData({ ...formData, assignedApparatus: newApparatus });
        setSearchTerms({ ...searchTerms, [`${appIndex}-${pIndex}`]: `${ff.name} (${ff.pin})` });
        setActiveSearch(null);
        setHighlightedIndex(null);
        // Lock the field so no free-text editing is possible after selection
        setLockedPersonnel(prev => new Set(prev).add(`${appIndex}-${pIndex}`));
    };

    const unlockPersonnel = (appIndex: number, pIndex: number) => {
        setLockedPersonnel(prev => {
            const next = new Set(prev);
            next.delete(`${appIndex}-${pIndex}`);
            return next;
        });
        // Also clear the selection so the field is empty and ready for a new search
        updatePersonnel(appIndex, pIndex, 'firefighterId', '');
        updatePersonnel(appIndex, pIndex, 'firefighterRadioId', '');
        setSearchTerms(prev => ({ ...prev, [`${appIndex}-${pIndex}`]: '' }));
        setFocusTarget({ appIndex, pIndex });
    };

    const handleKeyDown = (e: React.KeyboardEvent, appIndex: number, pIndex: number, filteredFFs: any[]) => {
        if (!activeSearch) return;

        if (e.key === 'ArrowDown' || e.key === 'Tab') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev === null || prev === filteredFFs.length - 1) ? 0 : prev + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev === null || prev === 0) ? filteredFFs.length - 1 : prev - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex !== null && filteredFFs[highlightedIndex]) {
                selectFirefighter(appIndex, pIndex, filteredFFs[highlightedIndex]);
            } else if (filteredFFs.length === 1) {
                // If only one option, select it even if not highlighted
                selectFirefighter(appIndex, pIndex, filteredFFs[0]);
            }
        } else if (e.key === 'Escape') {
            setActiveSearch(null);
        }
    };


    const updatePersonnel = (appIndex: number, pIndex: number, field: string, value: any) => {
        const newApparatus = [...formData.assignedApparatus];
        newApparatus[appIndex].personnel[pIndex] = { ...newApparatus[appIndex].personnel[pIndex], [field]: value };
        setFormData({ ...formData, assignedApparatus: newApparatus });
    };

    // Filter logic for autocomplete
    const getFilteredFirefighters = (term: string) => {
        if (!term) return [];
        const lower = term.toLowerCase();
        return firefighters.filter(f =>
            f.name.toLowerCase().includes(lower) ||
            (f.pin && f.pin.toLowerCase().includes(lower))
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col my-8">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl sticky top-0 z-10 backdrop-blur-md">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-blue-400" />
                        {initialData ? 'Edit Field Report' : 'New Field Report'}
                    </h2>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <form className="p-8 space-y-8 overflow-y-auto max-h-[80vh]">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Incident Type</label>
                            <select
                                value={formData.incidentTypeId}
                                onChange={e => setFormData({ ...formData, incidentTypeId: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                required
                            >
                                <option value="">Select Type...</option>
                                {incidentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                                <div className="relative flex items-center">
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none text-white [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
                                        required
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => { try { dateInputRef.current?.showPicker(); } catch {} }}
                                        className="absolute right-2 text-slate-400 hover:text-slate-200 transition-colors"
                                        title="Open date picker"
                                    >
                                        <Calendar className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Alarm Time</label>
                                <div className="relative">
                                    <AlarmTimeInput
                                        value={formData.alarmTime}
                                        onChange={v => setFormData(prev => ({ ...prev, alarmTime: v }))}
                                    />
                                    {/* Hidden type="time" — only used to drive the visual clock picker */}
                                    <input
                                        ref={alarmTimeInputRef}
                                        type="time"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onChange={e => setFormData(prev => ({ ...prev, alarmTime: hhmmToStandard(e.target.value) }))}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => { try { alarmTimeInputRef.current?.showPicker(); } catch {} }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                        title="Open time picker"
                                    >
                                        <Clock className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Location / Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
                                <input
                                    placeholder="123 Main St"
                                    value={formData.location}
                                    onChange={e => handleLocationSearch(e.target.value)}
                                    onBlur={() => {
                                        isLocationInputFocused.current = false;
                                        setTimeout(() => setShowLocationDropdown(false), 200);
                                    }}
                                    onFocus={() => {
                                        isLocationInputFocused.current = true;
                                        if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-500"
                                    required
                                />
                                {fetchingLocation && <Loader2 className="absolute right-3 top-2.5 w-5 h-5 animate-spin text-slate-500" />}
                                {showLocationDropdown && locationSuggestions.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {locationSuggestions.map((loc, idx) => (
                                            <div
                                                key={idx}
                                                onMouseDown={() => selectLocation(loc)}
                                                className="px-4 py-3 cursor-pointer text-sm hover:bg-slate-700 text-slate-200 border-b border-slate-700/50 last:border-0"
                                            >
                                                {formatAddress(loc)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">District/Box</label>
                                <input
                                    placeholder="D-1"
                                    value={formData.district}
                                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Officer In Charge</label>
                                <input
                                    placeholder="C. Chief"
                                    value={formData.officerInCharge}
                                    onChange={e => setFormData({ ...formData, officerInCharge: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Incident Summary */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Incident Summary</label>
                        <textarea
                            placeholder="Describe the incident details..."
                            value={formData.incidentSummary}
                            onChange={e => setFormData({ ...formData, incidentSummary: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] text-white"
                            required
                        />
                    </div>

                    {/* Dynamic Apparatus & Personnel */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <h3 className="text-lg font-bold text-slate-200">Apparatus & Personnel</h3>
                            <button type="button" onClick={addApparatus} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm font-bold"><Plus className="w-4 h-4" /> Add Unit</button>
                        </div>

                        {formData.assignedApparatus.length === 0 && <p className="text-slate-500 text-center py-4 italic">No units assigned yet.</p>}

                        {formData.assignedApparatus.map((app: any, appIndex: number) => (
                            <div key={appIndex} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 max-w-xs">
                                        <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Unit</label>
                                        <select
                                            value={app.apparatusId}
                                            onChange={e => updateApparatus(appIndex, 'apparatusId', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none text-white text-sm"
                                            required
                                        >
                                            <option value="">Select Apparatus...</option>
                                            {apparatus.map(a => <option key={a.id} value={a.id}>{a.name} {a.type ? `(${a.type})` : ''}</option>)}
                                        </select>
                                    </div>
                                    <button type="button" onClick={() => removeApparatus(appIndex)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-4 h-4" /></button>
                                </div>

                                <div className="space-y-2 sm:pl-4 sm:border-l-2 border-slate-700 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t-2 sm:border-t-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Personnel</label>
                                        <button type="button" onClick={() => addPersonnel(appIndex)} className="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"><Plus className="w-3 h-3" /> Add Person</button>
                                    </div>
                                    {app.personnel.map((p: any, pIndex: number) => {
                                        const key = `${appIndex}-${pIndex}`;
                                        const isLocked = lockedPersonnel.has(key);
                                        const filteredFFs = isLocked ? [] : getFilteredFirefighters(searchTerms[key]);
                                        return (
                                            <div key={pIndex} className="flex gap-2 items-center relative">
                                                <div className="relative flex-1">
                                                    <input
                                                        ref={(el) => {
                                                            if (el && focusTarget && focusTarget.appIndex === appIndex && focusTarget.pIndex === pIndex) {
                                                                el.focus();
                                                                setFocusTarget(null);
                                                            }
                                                        }}
                                                        type="text"
                                                        placeholder="Search Name or Radio ID..."
                                                        value={searchTerms[key] || ''}
                                                        readOnly={isLocked}
                                                        onChange={e => !isLocked && handleSearchChange(appIndex, pIndex, e.target.value)}
                                                        onKeyDown={e => !isLocked && handleKeyDown(e, appIndex, pIndex, filteredFFs)}
                                                        onFocus={() => !isLocked && setActiveSearch(key)}
                                                        onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                                                        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all pr-8 ${
                                                            isLocked
                                                                ? 'bg-slate-800 border-green-700/50 text-green-300 cursor-default'
                                                                : 'bg-slate-900 border-slate-600 text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600'
                                                        }`}
                                                    />
                                                    {/* Clear selection button (shown when locked) */}
                                                    {isLocked && (
                                                        <button
                                                            type="button"
                                                            onMouseDown={e => { e.preventDefault(); unlockPersonnel(appIndex, pIndex); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition-colors"
                                                            title="Clear and re-search"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {!isLocked && activeSearch === key && searchTerms[key] && (
                                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                            {filteredFFs.map((ff, idx) => (
                                                                <div
                                                                    key={ff.id}
                                                                    onMouseDown={() => selectFirefighter(appIndex, pIndex, ff)}
                                                                    className={`px-3 py-2 cursor-pointer text-sm flex justify-between ${highlightedIndex === idx ? 'bg-blue-600/50 text-white' : 'hover:bg-slate-700 text-slate-200'}`}
                                                                >
                                                                    <span>{ff.name}</span>
                                                                    <span className={`font-mono ${highlightedIndex === idx ? 'text-blue-200' : 'text-slate-500'}`}>{ff.pin}</span>
                                                                </div>
                                                            ))}
                                                            {filteredFFs.length === 0 && (
                                                                <div className="px-3 py-2 text-sm text-slate-500 italic">No matches found</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => removePersonnel(appIndex, pIndex)} className="text-slate-500 hover:text-red-400 p-2" title="Remove row"><X className="w-4 h-4" /></button>
                                            </div>
                                        )
                                    })}
                                    {app.personnel.length === 0 && <p className="text-xs text-slate-600 italic">No personnel added.</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {mode === 'request' && (
                        <div className="border-t border-slate-800 pt-6 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Reason for Modification</label>
                            <textarea
                                placeholder="Explain why this change is needed..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-white"
                                required
                            />
                        </div>
                    )}

                    {/* Footer Options */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-slate-800 pt-6">
                        <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors w-full sm:flex-1">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.esoReportCompleted ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}>
                                {formData.esoReportCompleted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input type="checkbox" checked={formData.esoReportCompleted} onChange={e => setFormData({ ...formData, esoReportCompleted: e.target.checked })} className="hidden" />
                            <span className="font-medium text-slate-300">ESO Report Completed</span>
                        </label>
                        <div className="text-left sm:text-right text-xs text-slate-500 w-full sm:flex-1 bg-slate-800/50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                            Reporter: <span className="text-slate-300 font-bold">{user.name}</span> <br />
                            Radio ID: <span className="font-mono">{(user as any).pin || (user as any).radioId || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        {mode === 'request' ? (
                            <button onClick={(e) => handleFormSubmit(e)} disabled={submitting} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? 'Sending...' : <><FileText className="w-5 h-5" /> Submit Request</>}
                            </button>
                        ) : (
                            <>
                                <button type="button" onClick={(e) => handleFormSubmit(e, 'Draft')} disabled={submitting} className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" /> Save as Draft
                                </button>
                                <button onClick={(e) => handleFormSubmit(e, 'Submitted')} disabled={submitting} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" /> Submit Report
                                </button>
                            </>
                        )}
                        <button type="button" onClick={onCancel} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
