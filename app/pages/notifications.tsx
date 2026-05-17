import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS, fetchNotifications, NotificationStep } from '@/lib/queries';

const PRIMARY = '#1e5b43';

// ─── Grouping helpers ──────────────────────────────────────────────────────────

function classifyStep(step: NotificationStep): 'overdue' | 'today' | 'week' | 'upcoming' | 'completed' {
    if (step.status === 'completed') return 'completed';
    if (!step.due_date) return 'upcoming';
    const due = new Date(step.due_date);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86400000);
    const weekEnd    = new Date(todayStart.getTime() + 7 * 86400000);

    if (due < todayStart) return 'overdue';
    if (due < todayEnd)   return 'today';
    if (due < weekEnd)    return 'week';
    return 'upcoming';
}

const GROUP_ORDER = ['overdue', 'today', 'week', 'upcoming', 'completed'] as const;
type GroupKey = typeof GROUP_ORDER[number];

const GROUP_META: Record<GroupKey, { label: string; color: string; bg: string; icon: string }> = {
    overdue:   { label: 'OVERDUE',    color: '#dc2626', bg: '#fee2e2', icon: 'alert-circle' },
    today:     { label: 'TODAY',      color: '#d97706', bg: '#fef3c7', icon: 'time' },
    week:      { label: 'THIS WEEK',  color: '#0369a1', bg: '#e0f2fe', icon: 'calendar' },
    upcoming:  { label: 'UPCOMING',   color: '#059669', bg: '#d1fae5', icon: 'arrow-forward-circle' },
    completed: { label: 'COMPLETED',  color: '#6b7280', bg: '#f3f4f6', icon: 'checkmark-circle' },
};

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function riskColor(r: string) {
    return r === 'high' ? '#ef4444' : r === 'medium' ? '#f59e0b' : '#2eb86a';
}
function riskBg(r: string) {
    return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fff3e0' : '#dcfce7';
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function NotificationsPage() {
    const [userId, setUserId] = useState<string | null>(null);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    }, []);

    const {
        data: steps = [],
        isLoading,
        error: queryError,
        refetch,
        isRefetching,
    } = useQuery({
        queryKey: QUERY_KEYS.notifications(userId ?? ''),
        queryFn: () => fetchNotifications(userId!),
        enabled: !!userId,
    });

    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const error = queryError ? (queryError as Error).message : null;

    // Group steps
    const groups: Record<GroupKey, NotificationStep[]> = {
        overdue: [], today: [], week: [], upcoming: [], completed: [],
    };
    steps.forEach(s => groups[classifyStep(s)].push(s));
    const activeGroups = GROUP_ORDER.filter(k => groups[k].length > 0);

    const totalActive = groups.overdue.length + groups.today.length + groups.week.length + groups.upcoming.length;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {totalActive > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{totalActive}</Text>
                    </View>
                )}
            </View>

            {/* Loading */}
            {isLoading && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={styles.mutedText}>Loading notifications…</Text>
                </View>
            )}

            {/* Error */}
            {!isLoading && error && (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>Could not load</Text>
                    <Text style={styles.mutedText}>{error}</Text>
                    <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Empty */}
            {!isLoading && !error && steps.length === 0 && (
                <View style={styles.center}>
                    <Ionicons name="notifications-off-outline" size={56} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No Notifications</Text>
                    <Text style={styles.mutedText}>
                        Convert a scan to a milestone plan to start receiving treatment reminders.
                    </Text>
                </View>
            )}

            {/* List */}
            {!isLoading && !error && steps.length > 0 && (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scroll}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
                    }
                >
                    {activeGroups.map(groupKey => (
                        <View key={groupKey}>
                            {/* Section header */}
                            <View style={[styles.sectionHeader, { backgroundColor: GROUP_META[groupKey].bg }]}>
                                <Ionicons
                                    name={GROUP_META[groupKey].icon as any}
                                    size={14}
                                    color={GROUP_META[groupKey].color}
                                />
                                <Text style={[styles.sectionLabel, { color: GROUP_META[groupKey].color }]}>
                                    {GROUP_META[groupKey].label}
                                </Text>
                                <Text style={[styles.sectionCount, { color: GROUP_META[groupKey].color }]}>
                                    {groups[groupKey].length}
                                </Text>
                            </View>

                            {groups[groupKey].map(step => (
                                <NotificationCard
                                    key={step.stepId}
                                    step={step}
                                    groupKey={groupKey}
                                />
                            ))}
                        </View>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ─── Notification Card ─────────────────────────────────────────────────────────

function NotificationCard({ step, groupKey }: { step: NotificationStep; groupKey: GroupKey }) {
    const meta = GROUP_META[groupKey];
    const isCompleted = groupKey === 'completed';

    return (
        <View
            style={[styles.card, isCompleted && styles.cardCompleted]}
        >
            {/* Left accent bar */}
            <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

            <View style={styles.cardBody}>
                {/* Top row */}
                <View style={styles.topRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.stepTitle, isCompleted && styles.strikethrough]} numberOfLines={1}>
                            {step.stepTitle}
                        </Text>
                        <Text style={styles.planLabel} numberOfLines={1}>
                            {step.diseaseName} · {step.planTitle}
                        </Text>
                    </View>
                    <View style={[styles.riskPill, { backgroundColor: riskBg(step.riskLevel) }]}>
                        <Text style={[styles.riskText, { color: riskColor(step.riskLevel) }]}>
                            {step.riskLevel.charAt(0).toUpperCase() + step.riskLevel.slice(1)}
                        </Text>
                    </View>
                </View>

                {/* Meta row */}
                <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color="#6b7280" />
                    <Text style={styles.metaText} numberOfLines={1}>{step.treeLabel}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                    <Text style={[styles.metaText, groupKey === 'overdue' && { color: '#dc2626', fontWeight: '700' }]}>
                        {isCompleted
                            ? `Done ${formatDate(step.completed_at)}`
                            : step.due_date
                                ? `Due ${formatDate(step.due_date)}`
                                : 'No due date'}
                    </Text>
                </View>

                {/* Description snippet */}
                {step.stepDescription ? (
                    <Text style={styles.desc} numberOfLines={2}>{step.stepDescription}</Text>
                ) : null}
            </View>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8faf9' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#f8faf9', gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111827' },
    badge: {
        backgroundColor: '#ef4444', borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151' },
    mutedText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
    retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 4 },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    scroll: { paddingHorizontal: 16, paddingTop: 8 },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, marginBottom: 10, marginTop: 8,
    },
    sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, flex: 1 },
    sectionCount: { fontSize: 12, fontWeight: '800' },

    card: {
        backgroundColor: '#fff', borderRadius: 20, marginBottom: 12,
        flexDirection: 'row', overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    cardCompleted: { opacity: 0.65 },
    accentBar: { width: 4 },
    cardBody: { flex: 1, padding: 14, gap: 6 },
    chevron: { alignSelf: 'center', paddingRight: 12 },

    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    stepTitle: { fontSize: 15, fontWeight: '800', color: '#111827', lineHeight: 20 },
    strikethrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
    planLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    riskPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    riskText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#6b7280', flexShrink: 1 },
    dot: { color: '#d1d5db', fontSize: 12 },

    desc: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 2 },
});
