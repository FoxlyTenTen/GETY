import React, { useState, useEffect } from 'react';
import {
    StyleSheet, ScrollView, StatusBar, View, Text,
    TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

type DbStep = {
    id: string;
    step_order: number;
    title: string;
    description: string | null;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
    due_date: string | null;
    completed_at: string | null;
};

type DbPlan = {
    id: string;
    title: string;
    overall_progress: number;
    estimated_recovery_days: number;
    recommended_fungicide: string | null;
    water_mix_ratio: string | null;
    expert_tip: string | null;
    status: 'active' | 'completed' | 'cancelled';
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
function riskBg(r: string)    { return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fff3e0' : '#dcfce7'; }

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDue(iso: string | null) {
    if (!iso) return 'TBD';
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MilestoneDetailPage() {
    const { scanId } = useLocalSearchParams<{ scanId: string }>();
    const { t } = useLanguage();

    const [plan, setPlan]           = useState<DbPlan | null>(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) { setError('No scan ID provided'); setLoading(false); return; }
        fetchPlan();
    }, [scanId]);

    const fetchPlan = async () => {
        setLoading(true);
        setError(null);
        try {
            // Query FROM treatment_plans WHERE scan_id = scanId
            // This is the reliable direction — treatment_plans.scan_id is a direct FK
            const { data, error: fetchErr } = await supabase
                .from('treatment_plans')
                .select(`
                    id,
                    title,
                    overall_progress,
                    estimated_recovery_days,
                    recommended_fungicide,
                    water_mix_ratio,
                    expert_tip,
                    status,
                    treatment_plan_steps (
                        id, step_order, title, description,
                        status, due_date, completed_at
                    ),
                    scan:scans (
                        id, disease_name, risk_level, confidence_score, scanned_at
                    ),
                    tree:trees (
                        id, label_name, latitude, longitude
                    )
                `)
                .eq('scan_id', scanId)
                .single();

            if (fetchErr) throw fetchErr;
            setPlan(data as unknown as DbPlan);
        } catch (e: any) {
            console.error('[milestone_detail] fetch error:', e?.message ?? e);
            setError(e?.message ?? 'Failed to load milestone');
        } finally {
            setLoading(false);
        }
    };

    const updateStepProgress = async (stepId: string) => {
        if (!plan) return;
        setUpdatingStepId(stepId);
        try {
            // 1. Mark this step completed
            await supabase.from('treatment_plan_steps').update({
                status: 'completed',
                progress_percent: 100,
                completed_at: new Date().toISOString(),
            }).eq('id', stepId);

            // 2. Activate the next step
            const sorted = [...(plan.treatment_plan_steps ?? [])].sort((a, b) => a.step_order - b.step_order);
            const current = sorted.find(s => s.id === stepId);
            const next    = sorted.find(s => s.step_order === (current?.step_order ?? 0) + 1);
            if (next) {
                await supabase.from('treatment_plan_steps')
                    .update({ status: 'ongoing' }).eq('id', next.id);
            }

            // 3. Recalculate overall progress
            const total    = sorted.length;
            const doneNow  = sorted.filter(s => s.status === 'completed').length + 1;
            const progress = total > 0 ? Math.round((doneNow / total) * 100) : 0;
            await supabase.from('treatment_plans').update({
                overall_progress: progress,
                status: progress === 100 ? 'completed' : 'active',
            }).eq('id', plan.id);

            // 4. Re-fetch to reflect updated state
            await fetchPlan();
        } catch (e: any) {
            console.error('[updateStep] error:', e?.message ?? e);
            Alert.alert(t.updateFailed, e?.message ?? 'Could not update step.');
        } finally {
            setUpdatingStepId(null);
        }
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1e5b43" />
                    <Text style={styles.emptyText}>{t.loadingMilestoneDetail}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────────
    if (error || !plan) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>{error ?? t.milestoneNotFound}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
                        <Text style={styles.backLinkText}>{t.goBack}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Derived data ───────────────────────────────────────────────────────────
    const steps       = (plan.treatment_plan_steps ?? []).sort((a, b) => a.step_order - b.step_order);
    const total       = steps.length;
    const done        = steps.filter(s => s.status === 'completed').length;
    const progressPct = total > 0 ? Math.round((done / total) * 100) : Math.round(plan.overall_progress ?? 0);
    const scan        = plan.scan;
    const tree        = plan.tree;
    const location    = tree?.label_name || 'Unknown Location';
    const scanDate    = scan?.scanned_at ? formatDate(scan.scanned_at) : '—';
    const risk        = scan?.risk_level ?? 'low';
    const fungicide   = plan.recommended_fungicide ?? 'N/A';
    const waterMix    = plan.water_mix_ratio ?? 'N/A';

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#fbfdfb" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#1e5b43" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Ionicons name="flag" size={18} color="#1e5b43" />
                    <Text style={styles.headerTitle}>{t.milestoneDetail}</Text>
                </View>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* ── Disease Summary Card ── */}
                <View style={styles.summaryCard}>
                    <View style={[styles.riskBadge, { backgroundColor: riskBg(risk) }]}>
                        <Text style={[styles.riskText, { color: riskColor(risk) }]}>
                            {t.riskLabel(risk)}
                        </Text>
                    </View>
                    <Text style={styles.diseaseName}>{scan?.disease_name ?? 'Unknown Disease'}</Text>

                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color="#6b7280" />
                        <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                        <Text style={styles.dot}>·</Text>
                        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                        <Text style={styles.metaText}>{scanDate}</Text>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progRow}>
                        <Text style={styles.progLabel}>{t.progress}</Text>
                        <Text style={styles.progPct}>{progressPct}%</Text>
                    </View>
                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
                    </View>
                    <Text style={styles.progSub}>{t.milestonesCompletedOf(done, total)}</Text>
                </View>

                {/* ── Treatment Info ── */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{t.treatmentInfo}</Text>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="flask-outline" size={18} color="#1e5b43" />
                            <Text style={styles.infoLabel}>{t.fungicide}</Text>
                            <Text style={styles.infoValue}>{fungicide}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Ionicons name="water-outline" size={18} color="#1e5b43" />
                            <Text style={styles.infoLabel}>{t.waterMix}</Text>
                            <Text style={styles.infoValue}>{waterMix}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={18} color="#1e5b43" />
                            <Text style={styles.infoLabel}>{t.dayPlan}</Text>
                            <Text style={styles.infoValue}>{t.daysShort(plan.estimated_recovery_days)}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Milestone Timeline ── */}
                <View style={styles.timelineContainer}>
                    <Text style={styles.timelineTitle}>{t.milestoneSteps}</Text>

                    {steps.map((step, idx) => {
                        const isCompleted = step.status === 'completed';
                        const isCurrent   = step.status === 'ongoing';
                        const isLast      = idx === steps.length - 1;
                        const dueLabel    = formatDue(step.due_date);

                        return (
                            <View key={step.id} style={styles.timelineRow}>
                                {/* Dot + line */}
                                <View style={styles.timelineLeft}>
                                    <View style={[
                                        styles.timelineDot,
                                        isCompleted && styles.dotDone,
                                        isCurrent   && styles.dotCurrent,
                                    ]}>
                                        {isCompleted
                                            ? <Ionicons name="checkmark" size={14} color="#fff" />
                                            : isCurrent
                                                ? <View style={styles.dotInner} />
                                                : null
                                        }
                                    </View>
                                    {!isLast && (
                                        <View style={[styles.timelineLine, isCompleted && styles.lineDone]} />
                                    )}
                                </View>

                                {/* Content */}
                                <View style={[styles.timelineContent, isLast && { marginBottom: 0 }]}>
                                    <View style={styles.stepHeader}>
                                        <Text style={[
                                            styles.stepTitle,
                                            isCompleted && styles.stepTitleDone,
                                        ]}>
                                            {step.title}
                                        </Text>
                                        {isCurrent && (
                                            <View style={styles.currentBadge}>
                                                <Text style={styles.currentBadgeText}>{t.current}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {step.description && (
                                        <Text style={styles.stepDesc}>{step.description}</Text>
                                    )}
                                    <View style={styles.stepDueRow}>
                                        <Ionicons name="time-outline" size={12} color="#9ca3af" />
                                        <Text style={styles.stepDue}>{dueLabel}</Text>
                                        {isCompleted && step.completed_at && (
                                            <Text style={styles.stepCompletedAt}>
                                                {t.done2(formatDue(step.completed_at))}
                                            </Text>
                                        )}
                                    </View>
                                    {isCurrent && (
                                        <TouchableOpacity
                                            style={styles.updateBtn}
                                            onPress={() => updateStepProgress(step.id)}
                                            disabled={updatingStepId === step.id}
                                            activeOpacity={0.85}
                                        >
                                            {updatingStepId === step.id
                                                ? <ActivityIndicator size="small" color="#fff" />
                                                : <Text style={styles.updateBtnText}>{t.markAsDone}</Text>
                                            }
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.monitorBtn} onPress={() => router.back()} activeOpacity={0.85}>
                        <Text style={styles.monitorText}>{t.backToMilestones}</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: '#f8faf9' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    emptyText:    { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
    backLinkBtn:  { marginTop: 8 },
    backLinkText: { color: '#1e5b43', fontWeight: '700', fontSize: 15 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#f8faf9',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    headerTitle:  { fontSize: 20, fontWeight: '800', color: '#1e5b43' },

    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    summaryCard: {
        backgroundColor: '#fff', borderRadius: 28, padding: 24, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 12 },
    riskText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    diseaseName: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 10, lineHeight: 30 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    metaText:{ fontSize: 12, color: '#6b7280', flexShrink: 1 },
    dot:     { color: '#d1d5db' },
    progRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
    progPct:   { fontSize: 13, fontWeight: '800', color: '#1e5b43' },
    progressBg:   { height: 10, backgroundColor: '#f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: 10, backgroundColor: '#1e5b43', borderRadius: 10 },
    progSub: { fontSize: 12, color: '#6b7280' },

    infoCard: {
        backgroundColor: '#fff', borderRadius: 28, padding: 24, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    infoTitle:   { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
    infoRow:     { flexDirection: 'row', alignItems: 'flex-start' },
    infoItem:    { flex: 1, alignItems: 'center', gap: 6 },
    infoDivider: { width: 1, backgroundColor: '#f3f4f6', marginHorizontal: 8 },
    infoLabel:   { fontSize: 11, color: '#6b7280', fontWeight: '600' },
    infoValue:   { fontSize: 13, fontWeight: '800', color: '#111827', textAlign: 'center' },

    timelineContainer: {
        backgroundColor: '#fff', borderRadius: 28, padding: 24, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    timelineTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 24 },
    timelineRow:   { flexDirection: 'row', marginBottom: 0 },
    timelineLeft:  { alignItems: 'center', marginRight: 16, width: 28 },
    timelineDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb',
        alignItems: 'center', justifyContent: 'center',
    },
    dotDone:    { backgroundColor: '#2eb86a', borderColor: '#2eb86a' },
    dotCurrent: { backgroundColor: '#fff', borderColor: '#1e5b43', borderWidth: 3 },
    dotInner:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1e5b43' },
    timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
    lineDone:     { backgroundColor: '#2eb86a' },
    timelineContent: { flex: 1, paddingBottom: 28 },
    stepHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    stepTitle:     { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1 },
    stepTitleDone: { color: '#6b7280', textDecorationLine: 'line-through' },
    currentBadge:     { backgroundColor: '#1e5b43', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    currentBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    stepDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 8 },
    stepDueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepDue:    { fontSize: 12, color: '#9ca3af' },
    stepCompletedAt: { fontSize: 11, color: '#2eb86a', fontWeight: '600' },
    updateBtn: {
        backgroundColor: '#1e5b43', paddingVertical: 12, paddingHorizontal: 20,
        borderRadius: 14, alignSelf: 'flex-start', marginTop: 12,
        minWidth: 140, alignItems: 'center', justifyContent: 'center',
    },
    updateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    footer: { marginBottom: 8 },
    monitorBtn: {
        backgroundColor: '#1e5b43', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 20, borderRadius: 30, gap: 12,
        shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
    },
    monitorText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
