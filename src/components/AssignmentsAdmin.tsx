'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Calendar, Users, X, Save, Loader2, ListTodo, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Assignee = { type: 'radioId' | 'everyone' | 'text', value: string, name?: string };

// Sortable wrapper for a category row
function SortableCategory({ cat, children }: { cat: any; children: (dragHandleProps: any) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <div ref={setNodeRef} style={style}>
            {children({ attributes, listeners })}
        </div>
    );
}

// Sortable wrapper for an item row
function SortableItem({ item, children }: { item: any; children: (dragHandleProps: any) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };
    return (
        <div ref={setNodeRef} style={style}>
            {children({ attributes, listeners })}
        </div>
    );
}

export default function AssignmentsAdmin({ firefighters }: { firefighters: any[] }) {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Category Form State
    const [catForm, setCatForm] = useState({ id: '', name: '', date: '', endDate: '' });
    const [isEditingCat, setIsEditingCat] = useState(false);
    const [isAddingCat, setIsAddingCat] = useState(false);

    // Item Form State
    const [itemForm, setItemForm] = useState({ id: '', categoryId: '', task: '', notes: '', assignedTo: [] as Assignee[] });
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [itemError, setItemError] = useState<string | null>(null);

    // Autocomplete State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearch, setActiveSearch] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // DnD sensors
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/assignments/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
                if (data.length > 0 && !activeCategoryId) {
                    setActiveCategoryId(data[0].id);
                    setExpandedCategories({ [data[0].id]: true });
                }
            }
        } catch (error) {
            console.error('Failed to load categories', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (id: string) => {
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Category DnD ---
    const handleCategoryDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);
        const reordered = arrayMove(categories, oldIndex, newIndex);
        setCategories(reordered);

        await fetch('/api/assignments/categories/reorder', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reordered.map((c, i) => ({ id: c.id, order: i }))),
        });
    };

    // --- Item DnD ---
    const handleItemDragEnd = async (event: DragEndEvent, catId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const cat = categories.find(c => c.id === catId);
        if (!cat) return;

        const oldIndex = cat.items.findIndex((item: any) => item.id === active.id);
        const newIndex = cat.items.findIndex((item: any) => item.id === over.id);
        const reorderedItems = arrayMove(cat.items, oldIndex, newIndex);

        setCategories(prev =>
            prev.map(c => c.id === catId ? { ...c, items: reorderedItems } : c)
        );

        await fetch('/api/assignments/items/reorder', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reorderedItems.map((item: any, i: number) => ({ id: item.id, order: i }))),
        });
    };

    // Category Handlers
    const saveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = isEditingCat ? `/api/assignments/categories/${catForm.id}` : '/api/assignments/categories';
            const method = isEditingCat ? 'PUT' : 'POST';

            const payload = {
                name: catForm.name,
                date: catForm.date || null,
                endDate: catForm.endDate || null
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsAddingCat(false);
                setIsEditingCat(false);
                setCatForm({ id: '', name: '', date: '', endDate: '' });
                fetchCategories();
            }
        } catch (error) {
            console.error("Failed to save category", error);
        }
    };

    const deleteCategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category and ALL its assignments?')) return;
        try {
            const res = await fetch(`/api/assignments/categories/${id}`, { method: 'DELETE' });
            if (res.ok) fetchCategories();
        } catch (error) {
            console.error("Failed to delete category", error);
        }
    };

    // Item Handlers
    const saveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setItemError(null);
        try {
            const isEditing = isEditingItem && itemForm.id !== '';
            const url = isEditing ? `/api/assignments/items/${itemForm.id}` : `/api/assignments/items`;
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                categoryId: itemForm.categoryId,
                task: itemForm.task,
                notes: itemForm.notes || null,
                assignedTo: itemForm.assignedTo
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsEditingItem(false);
                setIsAddingItem(false);
                setItemForm({ id: '', categoryId: '', task: '', notes: '', assignedTo: [] });
                fetchCategories();
            } else {
                const data = await res.json();
                setItemError(data.error || 'Failed to save task. Please try again.');
            }
        } catch (error) {
            console.error("Failed to save item", error);
            setItemError('An unexpected error occurred. Please try again.');
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this assignment?')) return;
        try {
            const res = await fetch(`/api/assignments/items/${id}`, { method: 'DELETE' });
            if (res.ok) fetchCategories();
        } catch (error) {
            console.error("Failed to delete item", error);
        }
    };

    // Autocomplete logic
    const getFilteredFirefighters = () => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return firefighters.filter(f =>
            f.name.toLowerCase().includes(lower) ||
            (f.pin && f.pin.toLowerCase().includes(lower))
        );
    };

    const filteredFFs = getFilteredFirefighters();

    const addAssigneeType = (type: 'radioId' | 'everyone' | 'text', value: string, name?: string) => {
        setItemForm(prev => ({
            ...prev,
            assignedTo: [...prev.assignedTo, { type, value, name }]
        }));
        setSearchTerm('');
        setActiveSearch(false);
        if (inputRef.current) inputRef.current.focus();
    };

    const removeAssignee = (index: number) => {
        setItemForm(prev => {
            const newArr = [...prev.assignedTo];
            newArr.splice(index, 1);
            return { ...prev, assignedTo: newArr };
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && activeSearch && filteredFFs.length > 0) {
            e.preventDefault();
            if (e.shiftKey) {
                setHighlightedIndex(prev => (prev === null || prev === 0) ? filteredFFs.length - 1 : prev - 1);
            } else {
                setHighlightedIndex(prev => {
                    if (prev === null) return 0;
                    if (prev === filteredFFs.length - 1) {
                        const ff = filteredFFs[prev];
                        addAssigneeType('radioId', ff.pin, ff.name);
                        return null;
                    }
                    return prev + 1;
                });
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev === null || prev === filteredFFs.length - 1) ? 0 : prev + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev === null || prev === 0) ? filteredFFs.length - 1 : prev - 1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSearch && highlightedIndex !== null && filteredFFs[highlightedIndex]) {
                const ff = filteredFFs[highlightedIndex];
                addAssigneeType('radioId', ff.pin, ff.name);
            } else if (searchTerm.trim() !== '') {
                const exactMatch = filteredFFs.find((f: any) => f.pin === searchTerm || f.name.toLowerCase() === searchTerm.toLowerCase());
                if (exactMatch) {
                    addAssigneeType('radioId', exactMatch.pin, exactMatch.name);
                } else {
                    addAssigneeType('text', searchTerm.trim(), searchTerm.trim());
                }
            }
        } else if (e.key === 'Escape') {
            setActiveSearch(false);
        }
    };

    const renderAssigneeTag = (a: Assignee, idx: number) => {
        return (
            <span key={idx} className="inline-flex items-center gap-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-sm font-medium">
                {a.type === 'everyone' ? <Users className="w-3.5 h-3.5" /> : null}
                {a.name || a.value}
                {isEditingItem && (
                    <button type="button" onClick={() => removeAssignee(idx)} className="hover:bg-blue-500/30 rounded-full p-0.5 ml-1 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                )}
            </span>
        );
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ListTodo className="text-blue-400" /> Assignment Management
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Create and manage task categories and assignments.</p>
                </div>
                {!isAddingCat && !isEditingCat && (
                    <button
                        onClick={() => {
                            setCatForm({ id: '', name: '', date: '', endDate: '' });
                            setIsAddingCat(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Category
                    </button>
                )}
            </div>

            {/* Category Form */}
            {(isAddingCat || isEditingCat) && (
                <div className="bg-slate-800 rounded-2xl border border-blue-500/50 p-6 shadow-xl mb-6">
                    <h3 className="text-lg font-bold mb-4">{isEditingCat ? 'Edit Category' : 'Create Category'}</h3>
                    <form onSubmit={saveCategory} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Category Name *</label>
                            <input
                                required
                                placeholder="e.g., This Quarter Assignments"
                                value={catForm.name}
                                onChange={e => setCatForm({...catForm, name: e.target.value})}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Start Date (Optional)</label>
                                <input
                                    type="date"
                                    value={catForm.date ? new Date(catForm.date).toISOString().split('T')[0] : ''}
                                    onChange={e => setCatForm({...catForm, date: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={catForm.endDate ? new Date(catForm.endDate).toISOString().split('T')[0] : ''}
                                    onChange={e => setCatForm({...catForm, endDate: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white [color-scheme:dark]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-6">
                            <button type="button" onClick={() => {setIsAddingCat(false); setIsEditingCat(false);}} className="px-6 py-2 rounded-xl text-slate-300 hover:bg-slate-700 transition-colors">Cancel</button>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Category
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Categories List with DnD */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                        {categories.length === 0 && !loading && !isAddingCat && (
                            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
                                <ListTodo className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                                <h3 className="text-lg font-medium text-slate-300">No Assignments Yet</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Create your first category to start managing tasks and assignments for your team.</p>
                            </div>
                        )}

                        {categories.map(cat => (
                            <SortableCategory key={cat.id} cat={cat}>
                                {({ attributes, listeners }) => (
                                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm overflow-hidden">
                                        {/* Category Header */}
                                        <div
                                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors"
                                            onClick={() => toggleCategory(cat.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Drag handle */}
                                                <button
                                                    type="button"
                                                    {...attributes}
                                                    {...listeners}
                                                    onClick={e => e.stopPropagation()}
                                                    className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                                                    title="Drag to reorder"
                                                >
                                                    <GripVertical className="w-5 h-5" />
                                                </button>
                                                <div className={`p-2 rounded-lg ${expandedCategories[cat.id] ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    {expandedCategories[cat.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white leading-tight">{cat.name}</h3>
                                                    {(cat.date || cat.endDate) && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {cat.date && format(new Date(cat.date), 'MMM d, yyyy')}
                                                            {cat.date && cat.endDate && ' - '}
                                                            {cat.endDate && format(new Date(cat.endDate), 'MMM d, yyyy')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300 font-medium mr-2">
                                                    {cat.items?.length || 0} Tasks
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setCatForm({
                                                            id: cat.id,
                                                            name: cat.name,
                                                            date: cat.date || '',
                                                            endDate: cat.endDate || ''
                                                        });
                                                        setIsEditingCat(true);
                                                        setIsAddingCat(false);
                                                    }}
                                                    className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteCategory(cat.id)}
                                                    className="p-2 hover:bg-red-900/30 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Items Section */}
                                        {expandedCategories[cat.id] && (
                                            <div className="border-t border-slate-700 p-5 bg-slate-900/50 space-y-4">

                                                {cat.items?.length > 0 ? (
                                                    <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={e => handleItemDragEnd(e, cat.id)}
                                                    >
                                                        <SortableContext items={cat.items.map((item: any) => item.id)} strategy={verticalListSortingStrategy}>
                                                            <div className="space-y-3">
                                                                {cat.items.map((item: any) => {
                                                                    const assignees: Assignee[] = item.assignedTo ? JSON.parse(item.assignedTo) : [];

                                                                    if (isEditingItem && itemForm.id === item.id) {
                                                                        return (
                                                                            <div key={item.id} className="bg-slate-800 border border-blue-500/50 rounded-xl p-4 shadow-lg ring-1 ring-blue-500/20">
                                                                                <ItemFormContent
                                                                                    itemForm={itemForm}
                                                                                    setItemForm={setItemForm}
                                                                                    saveItem={saveItem}
                                                                                    setIsEditing={() => { setIsEditingItem(false); setIsAddingItem(false); }}
                                                                                    filteredFFs={filteredFFs}
                                                                                    searchTerm={searchTerm}
                                                                                    setSearchTerm={setSearchTerm}
                                                                                    activeSearch={activeSearch}
                                                                                    setActiveSearch={setActiveSearch}
                                                                                    handleKeyDown={handleKeyDown}
                                                                                    addAssigneeType={addAssigneeType}
                                                                                    removeAssignee={removeAssignee}
                                                                                    highlightedIndex={highlightedIndex}
                                                                                    setHighlightedIndex={setHighlightedIndex}
                                                                                    inputRef={inputRef}
                                                                                    error={itemError}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <SortableItem key={item.id} item={item}>
                                                                            {({ attributes: itemAttrs, listeners: itemListeners }) => (
                                                                                <div className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                                                    {/* Item drag handle */}
                                                                                    <button
                                                                                        type="button"
                                                                                        {...itemAttrs}
                                                                                        {...itemListeners}
                                                                                        className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-400 transition-colors shrink-0 self-start mt-1"
                                                                                        title="Drag to reorder"
                                                                                    >
                                                                                        <GripVertical className="w-4 h-4" />
                                                                                    </button>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <h4 className="font-bold text-slate-200 text-lg">{item.task}</h4>
                                                                                        {item.notes && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.notes}</p>}
                                                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                                                            {assignees.length > 0 ? (
                                                                                                assignees.map((a, i) => renderAssigneeTag(a, i))
                                                                                            ) : (
                                                                                                <span className="text-xs text-slate-500 italic">Unassigned</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setItemForm({
                                                                                                    id: item.id,
                                                                                                    categoryId: cat.id,
                                                                                                    task: item.task,
                                                                                                    notes: item.notes || '',
                                                                                                    assignedTo: assignees
                                                                                                });
                                                                                                setIsEditingItem(true);
                                                                                                setActiveCategoryId(cat.id);
                                                                                            }}
                                                                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                                                            title="Edit Task"
                                                                                        >
                                                                                            <Edit2 className="w-4 h-4" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => deleteItem(item.id)}
                                                                                            className="p-2 hover:bg-red-900/30 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                                                                            title="Delete Task"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </SortableItem>
                                                                    );
                                                                })}
                                                            </div>
                                                        </SortableContext>
                                                    </DndContext>
                                                ) : (
                                                    <div className="text-slate-500 text-center py-6 italic text-sm border border-slate-800 border-dashed rounded-xl">
                                                        No tasks added to this category yet.
                                                    </div>
                                                )}

                                                {/* Add New Item Form */}
                                                {(isAddingItem || isEditingItem) && activeCategoryId === cat.id && itemForm.id === '' ? (
                                                    <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-4 shadow-lg ring-1 ring-blue-500/20 mt-4">
                                                        <ItemFormContent
                                                            itemForm={itemForm}
                                                            setItemForm={setItemForm}
                                                            saveItem={saveItem}
                                                            setIsEditing={() => { setIsEditingItem(false); setIsAddingItem(false); }}
                                                            filteredFFs={filteredFFs}
                                                            searchTerm={searchTerm}
                                                            setSearchTerm={setSearchTerm}
                                                            activeSearch={activeSearch}
                                                            setActiveSearch={setActiveSearch}
                                                            handleKeyDown={handleKeyDown}
                                                            addAssigneeType={addAssigneeType}
                                                            removeAssignee={removeAssignee}
                                                            highlightedIndex={highlightedIndex}
                                                            setHighlightedIndex={setHighlightedIndex}
                                                            inputRef={inputRef}
                                                            error={itemError}
                                                        />
                                                    </div>
                                                ) : (
                                                    !isEditingItem && !isAddingItem && (
                                                        <button
                                                            onClick={() => {
                                                                setItemForm({ id: '', categoryId: cat.id, task: '', notes: '', assignedTo: [] });
                                                                setActiveCategoryId(cat.id);
                                                                setIsAddingItem(true);
                                                                setIsEditingItem(false);
                                                                setItemError(null);
                                                            }}
                                                            className="w-full py-3 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 flex items-center justify-center gap-2 font-medium transition-all"
                                                        >
                                                            <Plus className="w-4 h-4" /> Add Task
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </SortableCategory>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

// Subcomponent for the Item Form to avoid huge nesting
function ItemFormContent({
    itemForm, setItemForm, saveItem, setIsEditing, filteredFFs, searchTerm, setSearchTerm, activeSearch, setActiveSearch, handleKeyDown, addAssigneeType, removeAssignee, highlightedIndex, setHighlightedIndex, inputRef, error
}: any) {
    return (
        <form onSubmit={saveItem} className="space-y-4">
            <h4 className="font-bold text-white mb-2">{itemForm.id ? 'Edit Task' : 'New Task'}</h4>
            <div>
                <input
                    required
                    placeholder="Task name (e.g. Engine 9 Truck Check)"
                    value={itemForm.task}
                    onChange={e => setItemForm({...itemForm, task: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-white font-medium"
                />
            </div>

            {/* Assigned Personnel Component */}
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assigned Personnel</label>

                {itemForm.assignedTo.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {itemForm.assignedTo.map((a: Assignee, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-blue-600 border border-blue-500 px-3 py-1 rounded-full text-sm font-medium text-white shadow-sm">
                                {a.type === 'everyone' ? <Users className="w-3.5 h-3.5" /> : null}
                                {a.name || a.value}
                                <button type="button" onClick={() => removeAssignee(i)} className="hover:bg-blue-700 rounded-full p-0.5 ml-1 transition-colors group">
                                    <X className="w-3 h-3 group-hover:scale-110" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 relative">
                    <div className="relative flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Enter Name, Radio ID, or Custom Text..."
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setActiveSearch(true);
                                setHighlightedIndex(null);
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setActiveSearch(true)}
                            onBlur={() => setTimeout(() => setActiveSearch(false), 200)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-500"
                        />
                        {activeSearch && searchTerm && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                {filteredFFs.map((ff: any, idx: number) => (
                                    <div
                                        key={ff.id}
                                        onMouseDown={() => addAssigneeType('radioId', ff.pin, ff.name)}
                                        className={`px-3 py-2 cursor-pointer text-sm flex justify-between items-center ${highlightedIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-200'}`}
                                    >
                                        <span className="font-medium">{ff.name}</span>
                                        <span className={`font-mono text-xs ${highlightedIndex === idx ? 'text-blue-200' : 'text-slate-400'}`}>{ff.pin}</span>
                                    </div>
                                ))}
                                {filteredFFs.length === 0 && (
                                    <div
                                        onMouseDown={() => addAssigneeType('text', searchTerm, searchTerm)}
                                        className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer flex items-center justify-between"
                                    >
                                        <span>Add as "{searchTerm}"</span>
                                        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">Custom</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => addAssigneeType('everyone', 'everyone', 'Everyone')}
                        disabled={itemForm.assignedTo.some((a: Assignee) => a.type === 'everyone')}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <Users className="w-4 h-4" /> Everyone
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (searchTerm.trim()) addAssigneeType('text', searchTerm.trim(), searchTerm.trim());
                        }}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Type exactly to add a custom group, or select from the dropdown.</p>
            </div>

            <div>
                <textarea
                    placeholder="Optional notes or details about this task..."
                    value={itemForm.notes}
                    onChange={e => setItemForm({...itemForm, notes: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-300 min-h-[80px]"
                />
            </div>

            {error && (
                <div className="text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm">
                    {error}
                </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors text-sm font-medium">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-colors text-sm">Save Task</button>
            </div>
        </form>
    );
}
