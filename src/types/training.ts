import { Firefighter, Role } from '@prisma/client';

export type TrainingCategory = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    isDeleted: boolean;
    order: number;
    isAdminOnly: boolean;
    isEveryone: boolean;
    viewRoles: string; // JSON
    postRoles: string; // JSON
    createdAt: string | Date;
    updatedAt: string | Date;

    // Virtual count fields from Prisma count
    _count?: {
        posts: number;
        unreadPosts?: number; // Calculated on frontend or via custom query
    };
};

export type TrainingPost = {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    isPinned: boolean;
    isDeleted: boolean;
    allowReplies: boolean;
    order: number;
    expiresAt: string | Date | null;
    categoryId: string;
    authorId: string;

    // Relations
    category?: TrainingCategory;
    author?: { id: string; name: string; role: { id: string; name: string } };

    createdAt: string | Date;
    updatedAt: string | Date;

    // Virtual fields
    _count?: {
        replies: number;
    };
    isUnread?: boolean;
    replies?: TrainingReply[];
};

export type TrainingReply = {
    id: string;
    content: string;
    isDeleted: boolean;
    postId: string;
    authorId: string;
    author?: { id: string; name: string };
    createdAt: string | Date;
    updatedAt: string | Date;
};

export type TrainingPostVersion = {
    id: string;
    title: string;
    content: string;
    postId: string;
    editorId: string | null;
    editor?: { id: string; name: string };
    createdAt: string | Date;
};
