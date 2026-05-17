import React, { useState, useCallback } from 'react';
import {
    StyleSheet, ScrollView, StatusBar, View, Text,
    TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppHeader from '@/components/common/AppHeader';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { QUERY_KEYS, fetchPlans, MilestoneDbPlan } from '@/lib/queries';

// ─── Types (re-exported from queries.ts) ───────────────────────────────────────

type DbStep = MilestoneDbPlan['treatment_plan_steps'][number];
type DbPlan = MilestoneDbPlan;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function riskLabel(r: string) { return r.charAt(0).toUpperCase() + r.slice(1); }
function riskColor(r: string) { return r === 'high' ? '#ef4444' : r === 'medium' ? '#f59e0b' : '#2eb86a'; }
function riskBg(r: string) { return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fff3e0' : '#dcfce7'; }
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDue(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MilestonePage() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(null);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    }, []);

    const { data: plans = [], isLoading: loading, error: queryError, refetch, isRefetching } = useQuery({
        queryKey: QUERY_KEYS.plans(userId ?? ''),
        queryFn: () => fetchPlans(userId!),
        enabled: !!userId,
    });

    const error = queryError ? (queryError as Error).message : null;

    useFocusEffect(useCallback(() => {
        refetch();
    }, [refetch]));

    const onRefresh = () => { refetch(); };

    const handlePress = (plan: DbPlan) => {
        if (plan.scan?.id) {
            router.push({ pathname: '/pages/milestone_detail' as any, params: { scanId: plan.scan.id } });
        }
    };

    const handleDelete = (plan: DbPlan) => {
        Alert.alert(
            'Delete Milestone Plan',
            `Remove "${plan.scan?.disease_name ?? 'this plan'}" treatment plan? The scan record in History will not be affected.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        // Steps are deleted automatically via ON DELETE CASCADE in Supabase
                        const { error } = await supabase.from('treatment_plans').delete().eq('id', plan.id);
                        if (error) { Alert.alert('Error', error.message); return; }
                        if (userId) {
                            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plans(userId) });
                            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.homeData(userId) });
                        }
                    },
                },
            ]
        );
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />
                <AppHeader title={t.milestonesTitle} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1e5b43" />
                    <Text style={styles.emptyText}>{t.loadingMilestones}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <SafeAreaView style={styles.safe}>
                <AppHeader title={t.milestonesTitle} />
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>{t.couldNotLoad}</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity onPress={() => refetch()} style={styles.scanNowBtn}>
                        <Text style={styles.scanNowText}>{t.retry}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Empty ────────────────────────────────────────────────────────────────
    if (plans.length === 0) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />
                <AppHeader title={t.milestonesTitle} />
                <View style={styles.center}>
                    <Ionicons name="flag-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>{t.noMilestonesYet}</Text>
                    <Text style={styles.emptyText}>{t.noMilestonesDesc}</Text>
                    <TouchableOpacity
                        style={styles.scanNowBtn}
                        onPress={() => router.push('/pages/scanpage' as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="scan-outline" size={18} color="#fff" />
                        <Text style={styles.scanNowText}>{t.scanNow}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Categorise ───────────────────────────────────────────────────────────
    const active    = plans.filter(p => p.status === 'active');
    const completed = plans.filter(p => p.status === 'completed');

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />
            <AppHeader title={t.milestonesTitle} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#1e5b43" />
                }
            >
                {/* ── Summary row ── */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryNum}>{plans.length}</Text>
                        <Text style={styles.summaryLabel}>{t.total}</Text>
                    </View>
                    <View style={[styles.summaryChip, { backgroundColor: '#fff3e0' }]}>
                        <Text style={[styles.summaryNum, { color: '#f59e0b' }]}>{active.length}</Text>
                        <Text style={styles.summaryLabel}>{t.inProgress}</Text>
                    </View>
                    <View style={[styles.summaryChip, { backgroundColor: '#dcfce7' }]}>
                        <Text style={[styles.summaryNum, { color: '#166534' }]}>{completed.length}</Text>
                        <Text style={styles.summaryLabel}>{t.completed}</Text>
                    </View>
                </View>

                {active.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>{t.inProgressSection}</Text>
                        {active.map(plan => (
                            <MilestoneCard key={plan.id} plan={plan} onPress={() => handlePress(plan)} onDelete={() => handleDelete(plan)} />
                        ))}
                    </>
                )}

                {completed.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>{t.completedSection}</Text>
                        {completed.map(plan => (
                            <MilestoneCard key={plan.id} plan={plan} onPress={() => handlePress(plan)} onDelete={() => handleDelete(plan)} />
                        ))}
                    </>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Milestone Card ─────────────────────────────────────────────────────────────

function MilestoneCard({ plan, onPress, onDelete }: { plan: DbPlan; onPress: () => void; onDelete: () => void }) {
    const { t } = useLanguage();
    const steps = (plan.treatment_plan_steps ?? []).sort((a, b) => a.step_order - b.step_order);
    const total = steps.length;
    const done  = steps.filter(s => s.status === 'completed').length;
    const progressPct = total > 0 ? done / total : 0;
    const isCompleted = plan.status === 'completed';
    const nextStep    = steps.find(s => s.status !== 'completed');
    const nextDue     = nextStep ? formatDue(nextStep.due_date) : null;

    const scan     = plan.scan;
    const tree     = plan.tree;
    const location = tree?.label_name || 'Unknown Location';
    const scanDate = scan?.scanned_at ? formatDate(scan.scanned_at) : formatDate(plan.created_at);
    const risk     = scan?.risk_level ?? 'low';

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            {/* Top row */}
            <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                    <View style={[styles.riskBadge, { backgroundColor: riskBg(risk) }]}>
                        <Text style={[styles.riskText, { color: riskColor(risk) }]}>
                            {t.riskLabel(risk)}
                        </Text>
                    </View>
                    <Text style={styles.cardDisease} numberOfLines={1}>
                        {tree?.label_name || scan?.disease_name || 'Unknown'}
                    </Text>
                    {tree?.label_name ? (
                        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>
                            {scan?.disease_name}
                        </Text>
                    ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); onDelete(); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.deleteBtn}
                    >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                    <View style={styles.circleWrap}>
                        <Text style={styles.circleNum}>{done}/{total}</Text>
                        <Text style={styles.circleLabel}>{t.done}</Text>
                    </View>
                </View>
            </View>

            {/* Location + date */}
            <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color="#6b7280" />
                <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{scanDate}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBg}>
                <View style={[
                    styles.progressFill,
                    {
                        width: `${progressPct * 100}%` as any,
                        backgroundColor: isCompleted ? '#2eb86a' : '#1e5b43',
                    },
                ]} />
            </View>

            {/* Next step */}
            <View style={styles.nextRow}>
                {isCompleted ? (
                    <>
                        <Ionicons name="checkmark-circle" size={14} color="#2eb86a" />
                        <Text style={[styles.nextText, { color: '#2eb86a' }]}>{t.allMilestonesCompleted}</Text>
                    </>
                ) : nextStep ? (
                    <>
                        <Ionicons name="arrow-forward-circle-outline" size={14} color="#1e5b43" />
                        <Text style={styles.nextText}>
                            {t.next(nextStep.title, nextDue)}
                        </Text>
                    </>
                ) : null}
                <View style={styles.chevron}>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe:  { flex: 1, backgroundColor: '#f8faf9' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151' },
    emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
    scanNowBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#1e5b43', paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: 24, marginTop: 8,
    },
    scanNowText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    summaryChip: {
        flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20,
        paddingVertical: 16, alignItems: 'center',
    },
    summaryNum:   { fontSize: 26, fontWeight: '800', color: '#1e5b43' },
    summaryLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginTop: 2 },

    sectionTitle: {
        fontSize: 12, fontWeight: '800', color: '#9ca3af',
        letterSpacing: 1.2, marginBottom: 14, marginTop: 4,
    },

    card: {
        backgroundColor: '#fff', borderRadius: 28, padding: 20, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTopLeft: { flex: 1, marginRight: 12 },
    riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
    riskText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    cardDisease: { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24 },
    circleWrap: {
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 5, borderColor: '#e5e7eb',
        borderTopColor: '#1e5b43', borderRightColor: '#1e5b43',
        alignItems: 'center', justifyContent: 'center',
    },
    circleNum:   { fontSize: 14, fontWeight: '800', color: '#111827' },
    circleLabel: { fontSize: 9, color: '#6b7280', fontWeight: '600' },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
    metaText: { fontSize: 12, color: '#6b7280', flexShrink: 1 },
    metaDot:  { color: '#d1d5db' },

    progressBg:   { height: 8, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 8 },

    nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nextText: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
    chevron: { marginLeft: 'auto' },
    deleteBtn: {
        backgroundColor: '#fee2e2', borderRadius: 8,
        padding: 6, alignItems: 'center', justifyContent: 'center',
    },
});
