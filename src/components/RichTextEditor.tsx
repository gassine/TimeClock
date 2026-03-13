'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

// Custom atomic node for file attachments — avoids conflict with the Link mark.
// atom:true means the whole node is selected/deleted as one unit.
const FileAttachmentNode = Node.create({
    name: 'fileAttachment',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            href: { default: '', parseHTML: el => el.getAttribute('href') ?? '' },
            label: { default: '', parseHTML: el => el.textContent?.trim() ?? '' },
        };
    },

    parseHTML() {
        return [{ tag: 'a.file-attachment', priority: 1001 }];
    },

    renderHTML({ node }) {
        return ['a', mergeAttributes({ class: 'file-attachment', href: node.attrs.href, download: '' }), node.attrs.label];
    },
});
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
    Paperclip, Heading2, Heading3, Loader2
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onUpdate: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RichTextEditor({
    content,
    onUpdate,
    placeholder = 'Write your content here...',
    minHeight = '300px',
}: RichTextEditorProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            FileAttachmentNode,
            Image.configure({ inline: false, allowBase64: false }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { class: 'text-blue-400 underline', rel: 'noopener noreferrer', target: '_blank' },
            }),
            Underline,
            Placeholder.configure({ placeholder }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getHTML());
        },
    });

    const uploadFile = useCallback(async (file: File, type: 'image' | 'file') => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload?subfolder=training', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            if (type === 'image') {
                editor?.chain().focus().setImage({ src: data.url, alt: data.originalName }).run();
            } else {
                const label = `${data.originalName} (${formatFileSize(data.size)})`;
                editor?.chain().focus().insertContent({
                    type: 'fileAttachment',
                    attrs: { href: data.url, label },
                }).run();
            }
        } catch (err) {
            console.error('Upload failed', err);
            alert('File upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    }, [editor]);

    const handleSetLink = () => {
        const previousUrl = editor?.getAttributes('link').href ?? '';
        const url = window.prompt('Enter URL:', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor?.chain().focus().unsetLink().run();
            return;
        }
        editor?.chain().focus().setLink({ href: url }).run();
    };

    if (!editor) return null;

    return (
        <div className="rich-editor border border-slate-700 rounded-xl overflow-hidden bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 border-b border-slate-700 bg-slate-800/60">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                    <UnderlineIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
                    <Strikethrough className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px bg-slate-700 mx-1 self-stretch" />

                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                    <Heading2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                    <Heading3 className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px bg-slate-700 mx-1 self-stretch" />

                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                    <List className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
                    <ListOrdered className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px bg-slate-700 mx-1 self-stretch" />

                <ToolbarButton onClick={handleSetLink} active={editor.isActive('link')} title="Insert Link">
                    <LinkIcon className="w-4 h-4" />
                </ToolbarButton>

                <div className="w-px bg-slate-700 mx-1 self-stretch" />

                <ToolbarButton onClick={() => imageInputRef.current?.click()} active={false} title="Insert Image" disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                </ToolbarButton>
                <ToolbarButton onClick={() => fileInputRef.current?.click()} active={false} title="Attach File" disabled={uploading}>
                    <Paperclip className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <EditorContent
                editor={editor}
                style={{ minHeight }}
                className="post-content text-slate-200"
            />

            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file, 'image');
                    e.target.value = '';
                }}
            />
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file, 'file');
                    e.target.value = '';
                }}
            />
        </div>
    );
}

function ToolbarButton({
    onClick,
    active,
    title,
    disabled,
    children,
}: {
    onClick: () => void;
    active: boolean;
    title: string;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded-md transition-colors ${
                active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );
}
