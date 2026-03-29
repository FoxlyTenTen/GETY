import React, { useState, useCallback } from 'react';
import {
    StyleSheet, ScrollView, StatusBar, View, Text,
    TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AppHeader from '@/components/common/AppHeader';
import { supabase } from '@/lib/supabase';

// ─── Types (plan-centric — queried FROM treatment_plans) ───────────────────────

type DbStep = {
    id: string;
    step_order: number;
    title: string;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
    due_date: string | null;
};

type DbPlan = {
    id: string;
    overall_progress: number;
    estimated_recovery_days: number;
    expert_tip: string | null;
    status: 'active' | 'completed' | 'cancelled';
    created_at: string;
    treatment_plan_steps: DbStep[];
    scan: {
        id: string;
        disease_name: string;
        risk_level: 'low' | 'medium' | 'high';
        confidence_score: number;
        scanned_at: string;
    } | null;
    tree: {
        id: string;
        label_name: string;
        latitude: number | null;
        longitude: number | null;
    } | null;
};

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
    const [plans, setPlans] = useState<DbPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            // Step 1: get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setPlans([]); setLoading(false); setRefreshing(false); return; }

            // Step 2: get all tree IDs for this user
            const { data: userTrees, error: treeErr } = await supabase
                .from('trees')
                .select('id')
                .eq('user_uid', user.id);

            if (treeErr) throw treeErr;
            const treeIds = (userTrees ?? []).map((t: { id: string }) => t.id);

            if (treeIds.length === 0) {
                setPlans([]); setLoading(false); setRefreshing(false); return;
            }

            // Step 3: query directly FROM treatment_plans (most reliable direction)
            // treatment_plans.tree_id → trees.id  (direct FK, no ambiguity)
            // treatment_plans.scan_id → scans.id  (embed scan data)
            const { data, error: fetchErr } = await supabase
                .from('treatment_plans')
                .select(`
                    id,
                    status,
                    overall_progress,
                    estimated_recovery_days,
                    expert_tip,
                    created_at,
                    treatment_plan_steps (
                        id, step_order, title, status, due_date
                    ),
                    scan:scans (
                        id, disease_name, risk_level, confidence_score, scanned_at
                    ),
                    tree:trees (
                        id, label_name, latitude, longitude
                    )
                `)
                .in('tree_id', treeIds)
                .order('created_at', { ascending: false });

            if (fetchErr) throw fetchErr;

            console.log('[milestone] plans fetched:', data?.length ?? 0);
            setPlans((data as unknown as DbPlan[]) ?? []);
        } catch (e: any) {
            console.error('[milestone] error:', e?.message ?? e);
            setError(e?.message ?? 'Failed to load milestones');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    const handlePress = (plan: DbPlan) => {
        // Pass the scan ID so milestone_detail can fetch full data
        if (plan.scan?.id) {
            router.push({ pathname: '/pages/milestone_detail' as any, params: { scanId: plan.scan.id } });
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />
                <AppHeader title="Milestones" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1e5b43" />
                    <Text style={styles.emptyText}>Loading milestones...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <SafeAreaView style={styles.safe}>
                <AppHeader title="Milestones" />
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>Could not load milestones</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity onPress={load} style={styles.scanNowBtn}>
                        <Text style={styles.scanNowText}>Retry</Text>
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
                <AppHeader title="Milestones" />
                <View style={styles.center}>
                    <Ionicons name="flag-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No Milestones Yet</Text>
                    <Text style={styles.emptyText}>
                        Scan a leaf and save the report to start tracking treatment milestones.
                    </Text>
                    <TouchableOpacity
                        style={styles.scanNowBtn}
                        onPress={() => router.push('/pages/scanpage' as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="scan-outline" size={18} color="#fff" />
                        <Text style={styles.scanNowText}>Scan Now</Text>
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
            <AppHeader title="Milestones" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e5b43" />
                }
            >
                {/* ── Summary row ── */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryNum}>{plans.length}</Text>
                        <Text style={styles.summaryLabel}>Total</Text>
                    </View>
                    <View style={[styles.summaryChip, { backgroundColor: '#fff3e0' }]}>
                        <Text style={[styles.summaryNum, { color: '#f59e0b' }]}>{active.length}</Text>
                        <Text style={styles.summaryLabel}>In Progress</Text>
                    </View>
                    <View style={[styles.summaryChip, { backgroundColor: '#dcfce7' }]}>
                        <Text style={[styles.summaryNum, { color: '#166534' }]}>{completed.length}</Text>
                        <Text style={styles.summaryLabel}>Completed</Text>
                    </View>
                </View>

                {active.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>IN PROGRESS</Text>
                        {active.map(plan => (
                            <MilestoneCard key={plan.id} plan={plan} onPress={() => handlePress(plan)} />
                        ))}
                    </>
                )}

                {completed.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>COMPLETED</Text>
                        {completed.map(plan => (
                            <MilestoneCard key={plan.id} plan={plan} onPress={() => handlePress(plan)} />
                        ))}
                    </>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Milestone Card ─────────────────────────────────────────────────────────────

function MilestoneCard({ plan, onPress }: { plan: DbPlan; onPress: () => void }) {
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
                            {riskLabel(risk)} RISK
                        </Text>
                    </View>
                    <Text style={styles.cardDisease} numberOfLines={2}>
                        {scan?.disease_name ?? 'Unknown Disease'}
                    </Text>
                </View>
                <View style={styles.circleWrap}>
                    <Text style={styles.circleNum}>{done}/{total}</Text>
                    <Text style={styles.circleLabel}>done</Text>
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
                        <Text style={[styles.nextText, { color: '#2eb86a' }]}>All milestones completed 🎉</Text>
                    </>
                ) : nextStep ? (
                    <>
                        <Ionicons name="arrow-forward-circle-outline" size={14} color="#1e5b43" />
                        <Text style={styles.nextText}>
                            Next: {nextStep.title}{nextDue ? ` · ${nextDue}` : ''}
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
});
