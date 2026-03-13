'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Users, ListTodo, Loader2, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

type Assignee = { type: 'radioId' | 'everyone' | 'text', value: string, name?: string };

export default function AssignmentsView() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const toggleCollapse = (id: string) => {
        setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/assignments/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    };

    const renderAssigneeTag = (a: Assignee, idx: number) => {
        return (
            <span key={idx} className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-full text-sm font-medium shadow-sm transition-transform hover:scale-105">
                {a.type === 'everyone' ? <Users className="w-3.5 h-3.5" /> : null}
                {a.name || a.value}
            </span>
        );
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>;

    if (categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-800/20 rounded-3xl border border-slate-700/50 mt-8 backdrop-blur-sm">
                <CheckCircle2 className="w-20 h-20 mb-6 opacity-20 text-blue-400" />
                <h2 className="text-2xl font-bold mb-2 text-slate-300">No Active Assignments</h2>
                <p className="text-center max-w-md">There are currently no assignments or tasks scheduled for you or your team.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/40 to-slate-900 rounded-3xl border border-blue-500/20 shadow-2xl flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 flex items-center gap-3">
                        <ListTodo className="w-8 h-8 text-blue-400" />
                        Team Assignments
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Review your tasks and operational duties.</p>
                </div>
            </div>

            <div className="space-y-10">
                {categories.map(cat => (
                    <section key={cat.id} className="relative">
                        {/* Connecting Line for visual flow */}
                        <div className="absolute left-6 top-16 bottom-0 w-px bg-gradient-to-b from-blue-500/30 to-transparent -z-10 hidden md:block"></div>
                        
                        {/* Category Header Element */}
                        <div
                            className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-y md:border md:rounded-2xl border-slate-700 shadow-xl mb-6 flex flex-col md:flex-row md:items-center justify-between p-5 md:px-6 cursor-pointer hover:bg-slate-800/60 transition-colors"
                            onClick={() => toggleCollapse(cat.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-3 h-10 rounded-full shrink-0 shadow-lg shadow-blue-500/30"></div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{cat.name}</h2>
                                    {(cat.date || cat.endDate) && (
                                        <div className="flex items-center gap-2 text-sm text-blue-300/80 font-medium mt-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {cat.date && format(new Date(cat.date), 'MMMM do, yyyy')}
                                                {cat.date && cat.endDate && ' — '}
                                                {cat.endDate && format(new Date(cat.endDate), 'MMMM do, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 md:mt-0 flex items-center gap-3">
                                <span className="text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full border border-slate-700">
                                    {cat.items?.length || 0} Tasks
                                </span>
                                {collapsed[cat.id] ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
                            </div>
                        </div>

                        {/* Assignments List inside the element — wrapped in a category background */}
                        {!collapsed[cat.id] && <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                            {cat.items?.length > 0 ? (
                                cat.items.map((item: any) => {
                                    const assignees: Assignee[] = item.assignedTo ? JSON.parse(item.assignedTo) : [];

                                    return (
                                        <div key={item.id} className="group relative bg-slate-800/60 hover:bg-slate-800/90 backdrop-blur-sm border border-slate-700/60 hover:border-blue-500/30 rounded-xl p-4 md:p-5 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-blue-900/10">

                                            <div className="flex flex-col gap-3">
                                                <h3 className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors">
                                                    {item.task}
                                                </h3>

                                                <div className="flex flex-wrap gap-2">
                                                    {assignees.length > 0 ? (
                                                        assignees.map((a, i) => renderAssigneeTag(a, i))
                                                    ) : (
                                                        <span className="text-sm text-slate-500 italic">Unassigned</span>
                                                    )}
                                                </div>

                                                {item.notes && (
                                                    <div className="flex gap-3 text-slate-300 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 font-medium leading-relaxed">
                                                        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                                        <p className="whitespace-pre-wrap">{item.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="border border-slate-700/50 border-dashed rounded-xl p-6 text-center text-slate-500">
                                    <p>No tasks found in this category.</p>
                                </div>
                            )}
                        </div>}
                    </section>
                ))}
            </div>
        </div>
    );
}
