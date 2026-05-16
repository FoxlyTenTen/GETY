import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, FlatList, ActivityIndicator, KeyboardAvoidingView,
    Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import AppHeader from '@/components/common/AppHeader';
import { queryRAG, RAGResponse } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{ filename: string; chunk_index: number }>;
    isError?: boolean;
};

// Suggested questions are now built from translations inside the component

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AssistantScreen() {
    const { t } = useLanguage();
    const SUGGESTED = [
        { id: '1', label: t.suggested1 },
        { id: '2', label: t.suggested2 },
        { id: '3', label: t.suggested3 },
        { id: '4', label: t.suggested4 },
    ];
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    async function handleSend(text?: string) {
        const question = (text ?? inputText).trim();
        if (!question || isLoading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: question,
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            // Build chat history from previous messages (last 4)
            const history = messages.slice(-4).map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response: RAGResponse = await queryRAG(question, history);

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.answer,
                sources: response.sources,
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: err.message || t.inputPlaceholder,
                isError: true,
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleRetry(msg: ChatMessage) {
        // Find the user message before this error
        const idx = messages.findIndex(m => m.id === msg.id);
        if (idx > 0) {
            const userMsg = messages[idx - 1];
            // Remove the error message
            setMessages(prev => prev.filter(m => m.id !== msg.id));
            handleSend(userMsg.content);
        }
    }

    function renderMessage({ item }: { item: ChatMessage }) {
        if (item.role === 'user') {
            return (
                <View style={styles.userBubbleRow}>
                    <View style={styles.userBubble}>
                        <Text style={styles.userBubbleText}>{item.content}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.assistantBubbleRow}>
                <View style={styles.botAvatar}>
                    <MaterialCommunityIcons name="robot" size={18} color="#1e5b43" />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={[
                        styles.assistantBubble,
                        item.isError && styles.errorBubble,
                    ]}>
                        {item.isError ? (
                            <Text style={[styles.assistantBubbleText, styles.errorText]}>
                                {item.content}
                            </Text>
                        ) : (
                            <Markdown style={markdownStyles}>
                                {item.content}
                            </Markdown>
                        )}
                    </View>

                    {/* Source citations (deduped by filename) */}
                    {item.sources && item.sources.length > 0 && (
                        <View style={styles.sourcesRow}>
                            {Array.from(new Set(item.sources.map(s => s.filename))).map((filename, i) => (
                                <View key={i} style={styles.sourceChip}>
                                    <Ionicons name="document-text-outline" size={10} color="#6b7280" />
                                    <Text style={styles.sourceText} numberOfLines={1}>
                                        {filename}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Retry button for errors */}
                    {item.isError && (
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => handleRetry(item)}
                        >
                            <Ionicons name="refresh" size={14} color="#dc2626" />
                            <Text style={styles.retryText}>{t.retryBtn}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    // ── Empty state (no messages yet) ───────────────────────────────────────

    function renderEmptyState() {
        return (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Intro card */}
                <View style={styles.introCard}>
                    <View style={styles.botIconContainer}>
                        <MaterialCommunityIcons name="robot" size={32} color="#fff" />
                    </View>
                    <Text style={styles.introTitle}>{t.askMeAnything}</Text>
                    <Text style={styles.introSubtitle}>{t.assistantIntro}</Text>
                </View>

                {/* Suggested Prompts */}
                <Text style={styles.sectionTitle}>{t.suggestedQuestions}</Text>
                <View style={styles.suggestedList}>
                    {SUGGESTED.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.suggestionChip}
                            activeOpacity={0.7}
                            onPress={() => handleSend(item.label)}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#235e45" />
                            <Text style={styles.suggestionText}>{item.label}</Text>
                            <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        );
    }

    // ── Chat state (has messages) ───────────────────────────────────────────

    function renderChatView() {
        return (
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={isLoading ? (
                    <View style={styles.assistantBubbleRow}>
                        <View style={styles.botAvatar}>
                            <MaterialCommunityIcons name="robot" size={18} color="#1e5b43" />
                        </View>
                        <View style={styles.typingBubble}>
                            <ActivityIndicator size="small" color="#1e5b43" />
                            <Text style={styles.typingText}>{t.thinking}</Text>
                        </View>
                    </View>
                ) : null}
            />
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <AppHeader title={t.aiAssistantTitle} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {messages.length === 0 ? renderEmptyState() : renderChatView()}

                {/* Chat Input Bar */}
                <View style={styles.chatBar}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder={t.inputPlaceholder}
                            placeholderTextColor="#9ca3af"
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                            editable={!isLoading}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
                            activeOpacity={0.85}
                            onPress={() => handleSend()}
                            disabled={!inputText.trim() || isLoading}
                        >
                            <Ionicons name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Intro card (empty state)
    introCard: {
        backgroundColor: '#1e5b43', borderRadius: 32, padding: 28,
        alignItems: 'center', marginBottom: 32,
        shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 16, elevation: 5,
    },
    botIconContainer: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    introTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
    introSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
    suggestedList: { gap: 12 },
    suggestionChip: {
        backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    suggestionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' },

    // Chat messages
    chatList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },

    userBubbleRow: {
        flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16,
    },
    userBubble: {
        backgroundColor: '#1e5b43', borderRadius: 20,
        borderBottomRightRadius: 6,
        paddingHorizontal: 16, paddingVertical: 12,
        maxWidth: '80%',
    },
    userBubbleText: { fontSize: 15, color: '#fff', lineHeight: 22 },

    assistantBubbleRow: {
        flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 8,
    },
    botAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
    },
    assistantBubble: {
        backgroundColor: '#fff', borderRadius: 20,
        borderTopLeftRadius: 6,
        paddingHorizontal: 16, paddingVertical: 12,
        maxWidth: '90%',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    assistantBubbleText: { fontSize: 15, color: '#111827', lineHeight: 22 },

    errorBubble: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    errorText: { color: '#991b1b' },

    // Source citations
    sourcesRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingLeft: 4,
    },
    sourceChip: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6,
    },
    sourceText: { fontSize: 10, color: '#6b7280', fontWeight: '500' },

    // Retry
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginTop: 6, paddingLeft: 4,
    },
    retryText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

    // Typing indicator
    typingBubble: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', borderRadius: 20, borderTopLeftRadius: 6,
        paddingHorizontal: 16, paddingVertical: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    typingText: { fontSize: 14, color: '#6b7280' },

    // Chat input bar
    chatBar: {
        backgroundColor: '#f8faf9', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
        borderTopWidth: 1, borderColor: '#f3f4f6',
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'flex-end',
        backgroundColor: '#fff', borderRadius: 24,
        paddingHorizontal: 16, paddingVertical: 10, gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    input: { flex: 1, fontSize: 15, color: '#111827', maxHeight: 100 },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#1e5b43', alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
});

// ─── Markdown Styles (for assistant answers) ────────────────────────────────

const markdownStyles = StyleSheet.create({
    body: { fontSize: 15, color: '#111827', lineHeight: 22 },
    paragraph: { fontSize: 15, color: '#111827', lineHeight: 22, marginTop: 0, marginBottom: 8 },
    strong: { fontWeight: '700', color: '#111827' },
    em: { fontStyle: 'italic' },
    bullet_list: { marginTop: 4, marginBottom: 4 },
    ordered_list: { marginTop: 4, marginBottom: 4 },
    list_item: { marginBottom: 4, flexDirection: 'row' },
    bullet_list_icon: { marginRight: 6, marginTop: 8, color: '#1e5b43', fontSize: 15, lineHeight: 22 },
    bullet_list_content: { flex: 1 },
    ordered_list_icon: { marginRight: 6, color: '#1e5b43', fontSize: 15, lineHeight: 22 },
    ordered_list_content: { flex: 1 },
    heading1: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 8, marginBottom: 6 },
    heading2: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 6, marginBottom: 4 },
    heading3: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 6, marginBottom: 4 },
    code_inline: {
        backgroundColor: '#f3f4f6', color: '#1e5b43',
        paddingHorizontal: 4, borderRadius: 4, fontSize: 14,
    },
    code_block: {
        backgroundColor: '#f3f4f6', padding: 8, borderRadius: 8,
        fontSize: 13, color: '#1f2937',
    },
    link: { color: '#1e5b43', textDecorationLine: 'underline' },
});
