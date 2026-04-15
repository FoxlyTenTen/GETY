import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import {
    KnowledgeBaseFile,
    getKnowledgeBaseFiles,
    uploadKnowledgeBaseFile,
    deleteKnowledgeBaseFile,
    updateKnowledgeBaseFile,
    processKnowledgeBaseFile,
} from '@/lib/supabase';

const { width } = Dimensions.get('window');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

type PickedFile = {
    uri: string;
    name: string;
    mimeType: string;
    size: number;
};

export default function KnowledgeBaseUpload() {
    const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);
    const [updatingFileId, setUpdatingFileId] = useState<string | null>(null);

    // Load files on screen focus
    useFocusEffect(
        useCallback(() => {
            loadFiles();
        }, [])
    );

    async function loadFiles() {
        try {
            setLoading(true);
            const data = await getKnowledgeBaseFiles();
            setFiles(data);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function pickFile() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || result.assets.length === 0) return;

            const asset = result.assets[0];

            if (asset.size && asset.size > MAX_FILE_SIZE) {
                Alert.alert('File Too Large', 'Maximum file size is 10 MB.');
                return;
            }

            setSelectedFile({
                uri: asset.uri,
                name: asset.name ?? 'unknown',
                mimeType: asset.mimeType ?? 'application/octet-stream',
                size: asset.size ?? 0,
            });
        } catch (err: any) {
            Alert.alert('Error', 'Failed to pick file.');
        }
    }

    async function handleUpload() {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const newFile = await uploadKnowledgeBaseFile(
                selectedFile.uri,
                selectedFile.name,
                selectedFile.mimeType,
                selectedFile.size,
            );
            setFiles(prev => [newFile, ...prev]);
            setSelectedFile(null);
            Alert.alert('Success', 'File uploaded. Processing for AI...');

            // Auto-trigger processing (runs in background)
            triggerProcessing(newFile.id);
        } catch (err: any) {
            Alert.alert('Upload Failed', err.message);
        } finally {
            setUploading(false);
        }
    }

    async function triggerProcessing(fileId: string) {
        // Update local state to show processing
        setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, processing_status: 'processing' as const } : f
        ));
        try {
            await processKnowledgeBaseFile(fileId);
            // Reload to get updated chunk_count and status
            await loadFiles();
        } catch (err: any) {
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, processing_status: 'failed' as const, processing_error: err.message } : f
            ));
            Alert.alert('Processing Failed', err.message);
        }
    }

    function handleDelete(file: KnowledgeBaseFile) {
        Alert.alert(
            'Delete File',
            `Are you sure you want to delete "${file.filename}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteKnowledgeBaseFile(file.id, file.file_path);
                            setFiles(prev => prev.filter(f => f.id !== file.id));
                        } catch (err: any) {
                            Alert.alert('Delete Failed', err.message);
                        }
                    },
                },
            ],
        );
    }

    async function handleUpdate(file: KnowledgeBaseFile) {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || result.assets.length === 0) return;

            const asset = result.assets[0];

            if (asset.size && asset.size > MAX_FILE_SIZE) {
                Alert.alert('File Too Large', 'Maximum file size is 10 MB.');
                return;
            }

            setUpdatingFileId(file.id);

            const updated = await updateKnowledgeBaseFile(
                file.id,
                asset.uri,
                asset.name ?? file.filename,
                asset.mimeType ?? file.mime_type,
                asset.size ?? 0,
                file.file_path,
            );

            setFiles(prev => prev.map(f => f.id === file.id ? updated : f));
            Alert.alert('Success', `Updated to v${updated.version}. Processing for AI...`);
            triggerProcessing(file.id);
        } catch (err: any) {
            Alert.alert('Update Failed', err.message);
        } finally {
            setUpdatingFileId(null);
        }
    }

    function getFileIcon(mimeType: string): keyof typeof Ionicons.glyphMap {
        return mimeType === 'application/pdf' ? 'document-text' : 'document-outline';
    }

    function getStatusBadge(file: KnowledgeBaseFile) {
        switch (file.processing_status) {
            case 'completed':
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                        <Text style={[styles.statusText, { color: '#16a34a' }]}>
                            {file.chunk_count ?? 0} chunks
                        </Text>
                    </View>
                );
            case 'processing':
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#fef9c3' }]}>
                        <ActivityIndicator size={10} color="#ca8a04" />
                        <Text style={[styles.statusText, { color: '#ca8a04' }]}>Processing</Text>
                    </View>
                );
            case 'failed':
                return (
                    <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}
                        onPress={() => Alert.alert('Processing Error', file.processing_error ?? 'Unknown error', [
                            { text: 'OK' },
                            { text: 'Retry', onPress: () => triggerProcessing(file.id) },
                        ])}
                    >
                        <Ionicons name="alert-circle" size={12} color="#dc2626" />
                        <Text style={[styles.statusText, { color: '#dc2626' }]}>Failed</Text>
                    </TouchableOpacity>
                );
            default:
                return (
                    <View style={[styles.statusBadge, { backgroundColor: '#f3f4f6' }]}>
                        <Ionicons name="time-outline" size={12} color="#6b7280" />
                        <Text style={[styles.statusText, { color: '#6b7280' }]}>Pending</Text>
                    </View>
                );
        }
    }

    function renderFileCard({ item }: { item: KnowledgeBaseFile }) {
        const isUpdating = updatingFileId === item.id;
        return (
            <View style={styles.fileCard}>
                <View style={styles.fileCardHeader}>
                    <View style={styles.fileIconBox}>
                        <Ionicons name={getFileIcon(item.mime_type)} size={24} color="#1e5b43" />
                    </View>
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>{item.filename}</Text>
                        <Text style={styles.fileMeta}>
                            {formatDate(item.uploaded_at)} · {formatBytes(item.file_size)}
                        </Text>
                    </View>
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>v{item.version}</Text>
                    </View>
                </View>

                {/* Processing Status */}
                <View style={{ marginTop: 10 }}>
                    {getStatusBadge(item)}
                </View>

                <View style={styles.fileActions}>
                    <TouchableOpacity
                        style={styles.updateBtn}
                        onPress={() => handleUpdate(item)}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <ActivityIndicator size="small" color="#1e5b43" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={16} color="#1e5b43" />
                                <Text style={styles.updateBtnText}>Update</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item)}
                        disabled={isUpdating}
                    >
                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e5b43" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Knowledge Base</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Upload Section */}
                <View style={styles.uploadCard}>
                    <Text style={styles.sectionTitle}>Upload File</Text>
                    <Text style={styles.sectionSub}>PDF or TXT files, max 10 MB</Text>

                    <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={uploading}>
                        <Ionicons name="folder-open-outline" size={22} color="#fff" />
                        <Text style={styles.pickBtnText}>Choose File</Text>
                    </TouchableOpacity>

                    {selectedFile && (
                        <View style={styles.selectedPreview}>
                            <Ionicons name={getFileIcon(selectedFile.mimeType)} size={20} color="#1e5b43" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.selectedName} numberOfLines={1}>{selectedFile.name}</Text>
                                <Text style={styles.selectedMeta}>{formatBytes(selectedFile.size)}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedFile(null)}>
                                <Ionicons name="close-circle" size={22} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {selectedFile && (
                        <TouchableOpacity
                            style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
                            onPress={handleUpload}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                                    <Text style={styles.uploadBtnText}>Upload</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Files List Section */}
                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Uploaded Files</Text>
                    <Text style={styles.sectionSub}>{files.length} file{files.length !== 1 ? 's' : ''}</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#1e5b43" style={{ marginTop: 30 }} />
                ) : files.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyText}>No files uploaded yet</Text>
                        <Text style={styles.emptySub}>Upload your first knowledge base file above</Text>
                    </View>
                ) : (
                    <FlatList
                        data={files}
                        keyExtractor={(item) => item.id}
                        renderItem={renderFileCard}
                        scrollEnabled={false}
                        contentContainerStyle={{ gap: 12 }}
                    />
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f8faf9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e5b43',
    },
    content: {
        padding: 16,
    },

    // Upload Card
    uploadCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    sectionSub: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
        marginBottom: 16,
    },
    pickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1e5b43',
        paddingVertical: 14,
        borderRadius: 16,
    },
    pickBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    selectedPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        padding: 12,
        borderRadius: 12,
        marginTop: 14,
    },
    selectedName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    selectedMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#16a34a',
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 12,
    },
    uploadBtnDisabled: {
        opacity: 0.6,
    },
    uploadBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },

    // File List
    listSection: {
        marginBottom: 12,
    },
    fileCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    fileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fileIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    fileName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    fileMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    versionBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    versionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1d4ed8',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    fileActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    updateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    updateBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1e5b43',
    },
    deleteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deleteBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#dc2626',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9ca3af',
        marginTop: 12,
    },
    emptySub: {
        fontSize: 13,
        color: '#d1d5db',
        marginTop: 4,
    },
});
