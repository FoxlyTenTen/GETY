import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const RAG_BACKEND_URL = process.env.EXPO_PUBLIC_RAG_BACKEND_URL!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// ── Knowledge Base Types & Helpers ────────────────────────────────────────

export type KnowledgeBaseFile = {
    id: string;
    filename: string;
    file_path: string;
    file_size: number | null;
    mime_type: string;
    version: number;
    uploaded_by: string | null;
    uploaded_at: string;
    updated_at: string;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processing_error: string | null;
    chunk_count: number | null;
};

export async function getKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]> {
    const { data, error } = await supabase
        .from('knowledge_base_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function uploadKnowledgeBaseFile(
    fileUri: string,
    filename: string,
    mimeType: string,
    fileSize: number,
): Promise<KnowledgeBaseFile> {
    // Read file as base64 and convert to ArrayBuffer for Supabase upload
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
    });
    const arrayBuffer = decode(base64);

    const storagePath = `uploads/${Date.now()}_${filename}`;

    const { error: storageError } = await supabase.storage
        .from('knowledge-base')
        .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });

    if (storageError) throw new Error(storageError.message);

    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

    const { data, error: dbError } = await supabase
        .from('knowledge_base_files')
        .insert({
            filename,
            file_path: storagePath,
            file_size: fileSize,
            mime_type: mimeType,
            version: 1,
            uploaded_by: userId,
        })
        .select()
        .single();

    if (dbError) throw new Error(dbError.message);
    return data;
}

export async function deleteKnowledgeBaseFile(
    fileId: string,
    filePath: string,
): Promise<void> {
    const { error: storageError } = await supabase.storage
        .from('knowledge-base')
        .remove([filePath]);

    if (storageError) throw new Error(storageError.message);

    const { error: dbError } = await supabase
        .from('knowledge_base_files')
        .delete()
        .eq('id', fileId);

    if (dbError) throw new Error(dbError.message);
}

export async function updateKnowledgeBaseFile(
    fileId: string,
    fileUri: string,
    filename: string,
    mimeType: string,
    fileSize: number,
    currentFilePath: string,
): Promise<KnowledgeBaseFile> {
    // Remove old file from storage
    await supabase.storage.from('knowledge-base').remove([currentFilePath]);

    // Upload new file
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
    });
    const arrayBuffer = decode(base64);
    const newStoragePath = `uploads/${Date.now()}_${filename}`;

    const { error: storageError } = await supabase.storage
        .from('knowledge-base')
        .upload(newStoragePath, arrayBuffer, { contentType: mimeType, upsert: false });

    if (storageError) throw new Error(storageError.message);

    // Get current version to increment
    const { data: current } = await supabase
        .from('knowledge_base_files')
        .select('version')
        .eq('id', fileId)
        .single();

    const { data: updated, error: dbError } = await supabase
        .from('knowledge_base_files')
        .update({
            filename,
            file_path: newStoragePath,
            file_size: fileSize,
            mime_type: mimeType,
            version: (current?.version ?? 0) + 1,
        })
        .eq('id', fileId)
        .select()
        .single();

    if (dbError) throw new Error(dbError.message);
    return updated;
}

// ── RAG Helpers (Python backend) ────────────────────────────────────────────

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${RAG_BACKEND_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = (data as { detail?: string; error?: string }).detail
            ?? (data as { error?: string }).error
            ?? `Backend error: HTTP ${res.status}`;
        throw new Error(message);
    }
    return data as T;
}

export async function processKnowledgeBaseFile(fileId: string): Promise<void> {
    await postJson<{ success: boolean; chunks_created: number }>(
        '/process-file',
        { file_id: fileId },
    );
}

export type RAGResponse = {
    answer: string;
    sources: Array<{ filename: string; chunk_index: number }>;
};

export async function queryRAG(
    question: string,
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<RAGResponse> {
    return postJson<RAGResponse>('/query', {
        question,
        chat_history: chatHistory,
    });
}
