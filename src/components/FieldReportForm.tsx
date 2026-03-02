'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { X, Plus, Trash2, Save, Truck, Users, MapPin, Clock, FileText, CheckCircle, Loader2, Calendar } from 'lucide-react';

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
        alarmTime: initialData?.alarmTime || '',
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

    const handleLocationSearch = (query: string) => {
        setFormData({ ...formData, location: query });
        if (query.trim().length > 3) {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = setTimeout(async () => {
                setFetchingLocation(true);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us`);
                    const data = await res.json();
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
        setSubmitting(true);

        // Validation: Check for empty personnel fields
        for (const app of formData.assignedApparatus) {
            for (const p of app.personnel) {
                if (!p.firefighterId) {
                    alert('Please select a firefighter for all personnel entries or remove empty rows.');
                    setSubmitting(false);
                    return;
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
                if (statusName && reportStatuses) {
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
        // Delete the removed item's term
        delete newSearchTerms[`${appIndex}-${pIndex}`];

        // Shift subsequent items down: k -> k-1
        // We need to iterate through existing keys to find ones that need shifting
        // Or simpler: iterate from pIndex + 1 to length + 1 (since we just acted on old length)
        // Better: iterate keys
        Object.keys(newSearchTerms).forEach(key => {
            const [aIdx, pIdx] = key.split('-').map(Number);
            if (aIdx === appIndex && pIdx > pIndex) {
                newSearchTerms[`${appIndex}-${pIdx - 1}`] = newSearchTerms[key];
                delete newSearchTerms[key];
            }
        });
        setSearchTerms(newSearchTerms);
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
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    onClick={(e) => {
                                        try {
                                            (e.currentTarget as HTMLInputElement).showPicker();
                                        } catch (err) {
                                            // Fallback for browsers that don't support showPicker (like older iOS Safari)
                                        }
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white cursor-pointer [color-scheme:dark]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Alarm Time</label>
                                <input
                                    type="time"
                                    value={formData.alarmTime}
                                    onChange={e => setFormData({ ...formData, alarmTime: e.target.value })}
                                    onClick={(e) => {
                                        try {
                                            (e.currentTarget as HTMLInputElement).showPicker();
                                        } catch (err) {
                                            // Fallback for browsers that don't support showPicker
                                        }
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white cursor-pointer [color-scheme:dark]"
                                    required
                                />
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
                                        const filteredFFs = getFilteredFirefighters(searchTerms[`${appIndex}-${pIndex}`]);
                                        return (
                                            <div key={pIndex} className="flex gap-2 items-center relative">
                                                <div className="relative flex-1 group">
                                                    <input
                                                        ref={(el) => {
                                                            if (el && focusTarget && focusTarget.appIndex === appIndex && focusTarget.pIndex === pIndex) {
                                                                el.focus();
                                                                setFocusTarget(null);
                                                            }
                                                        }}
                                                        type="text"
                                                        placeholder="Search Name or Radio ID..."
                                                        value={searchTerms[`${appIndex}-${pIndex}`] || ''}
                                                        onChange={e => handleSearchChange(appIndex, pIndex, e.target.value)}
                                                        onKeyDown={e => handleKeyDown(e, appIndex, pIndex, filteredFFs)}
                                                        onFocus={() => setActiveSearch(`${appIndex}-${pIndex}`)}
                                                        onBlur={() => setTimeout(() => setActiveSearch(null), 200)}
                                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600"
                                                    />
                                                    {activeSearch === `${appIndex}-${pIndex}` && searchTerms[`${appIndex}-${pIndex}`] && (
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
                                                <button type="button" onClick={() => removePersonnel(appIndex, pIndex)} className="text-slate-500 hover:text-red-400 p-2"><X className="w-4 h-4" /></button>
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
                                <button onClick={(e) => handleFormSubmit(e, 'Draft')} disabled={submitting} className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
