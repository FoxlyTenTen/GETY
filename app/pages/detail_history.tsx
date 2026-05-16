import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';

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
    expert_tip: string | null;
    treatment_plan_steps: DbStep[];
};

type RecommendationJson = {
    what_to_do_next?: string[];
    keep_your_farm_safe?: { title: string; desc: string }[];
    follow_up_action?: string;
};

type DbScan = {
    id: string;
    disease_name: string;
    disease_description: string | null;
    confidence_score: number;
    risk_level: 'low' | 'medium' | 'high';
    image_url: string | null;
    follow_up_days: number;
    scanned_at: string;
    recommendation_json: RecommendationJson | null;
    tree: {
        id: string;
        label_name: string;
        latitude: number | null;
        longitude: number | null;
    } | null;
    treatment_plans: DbPlan[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const COLORS = {
    primary: '#1e5b43',
    background: '#f8faf9',
    cardBg: '#ffffff',
    textMain: '#1a1a1a',
    textMuted: '#6b7280',
    expertCard: '#e6edea',
    warning: '#fcece3',
    warningText: '#a4715c',
};

function riskLabel(r: string) { return r.charAt(0).toUpperCase() + r.slice(1); }
function riskColor(r: string) { return r === 'high' ? '#ef4444' : r === 'medium' ? '#f59e0b' : '#2eb86a'; }
function riskBg(r: string)    { return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fff3e0' : '#dcfce7'; }
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}
function formatDue(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

// Extract fungicide name from expert_tip: "Apply Mancozeb 80WP (20L Water Mix) and re-scan..."
function parseFungicide(tip: string | null) {
    if (!tip) return null;
    const match = tip.match(/^Apply (.+?) \((.+?)\)/);
    return match ? { fungicide: match[1], waterMix: match[2] } : null;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DetailHistoryPage() {
    const router = useRouter();
    const { scanId } = useLocalSearchParams<{ scanId: string }>();

    const [scan, setScan]       = useState<DbScan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    useEffect(() => {
        if (!scanId) { setError('No scan ID provided'); setLoading(false); return; }
        fetchScan();
    }, [scanId]);

    const fetchScan = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchErr } = await supabase
                .from('scans')
                .select(`
                    id,
                    disease_name,
                    disease_description,
                    confidence_score,
                    risk_level,
                    image_url,
                    follow_up_days,
                    scanned_at,
                    recommendation_json,
                    tree:trees (
                        id, label_name, latitude, longitude
                    ),
                    treatment_plans (
                        id, title, overall_progress, estimated_recovery_days, expert_tip,
                        treatment_plan_steps (
                            id, step_order, title, description,
                            status, due_date, completed_at
                        )
                    )
                `)
                .eq('id', scanId)
                .single();

            if (fetchErr) throw fetchErr;
            setScan(data as unknown as DbScan);
        } catch (e: any) {
            console.error('[detail_history] fetch error:', e?.message ?? e);
            setError(e?.message ?? 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading report...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Error / Not found ──────────────────────────────────────────────────────
    if (error || !scan) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text style={styles.loadingText}>{error ?? 'Report not found.'}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                        <Text style={styles.backLinkText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Derived data ───────────────────────────────────────────────────────────
    const plan     = scan.treatment_plans?.[0] ?? null;
    const steps    = (plan?.treatment_plan_steps ?? []).sort((a, b) => a.step_order - b.step_order);
    const rec      = scan.recommendation_json;
    const whatToDo = rec?.what_to_do_next ?? [];
    const farmTips = rec?.keep_your_farm_safe ?? [];
    const location = scan.tree?.label_name || 'Unknown Plot';
    const scanDate = formatDate(scan.scanned_at);
    const expert   = parseFungicide(plan?.expert_tip ?? null);
    const currentStepIndex = steps.findIndex(s => s.status === 'ongoing') + 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textMain} />
                </TouchableOpacity>
                <View style={styles.logoContainer}>
                    <Ionicons name="leaf" size={20} color={COLORS.primary} />
                    <Text style={styles.logoText}>LatexGuard</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.pageTitle}>Diagnosis Report</Text>
                <Text style={styles.pageSubtitle}>Scanned on {scanDate} · {location}</Text>

                {/* ── Captured Image ── */}
                <View style={styles.imageCard}>
                    <Image
                        source={scan.image_url ? { uri: scan.image_url } : require('@/assets/images/leaf.jpeg')}
                        style={styles.sampleImage}
                        resizeMode="cover"
                    />
                    <View style={[styles.riskBadgeAbs, { backgroundColor: riskBg(scan.risk_level) }]}>
                        <Text style={[styles.riskBadgeText, { color: riskColor(scan.risk_level) }]}>
                            {riskLabel(scan.risk_level)} RISK
                        </Text>
                    </View>
                    <View style={styles.capturedTag}>
                        <View style={styles.redDot} />
                        <Text style={styles.capturedText}>CAPTURED SAMPLE</Text>
                    </View>
                </View>

                {/* ── Diagnosis Card ── */}
                <View style={styles.diagnosisCard}>
                    <View style={styles.diagnosisHeaderRow}>
                        <View style={styles.diseaseIconContainer}>
                            <MaterialCommunityIcons name="virus-outline" size={24} color="#e53e3e" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.diagnosisLabel}>DIAGNOSIS</Text>
                            <Text style={styles.diseaseName}>{scan.disease_name}</Text>
                        </View>
                    </View>
                    <View style={styles.confidenceRow}>
                        <Text style={styles.confidenceLabel}>Confidence Level</Text>
                        <Text style={styles.confidenceValue}>{scan.confidence_score}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${scan.confidence_score}%` as any }]} />
                    </View>
                    {scan.disease_description && (
                        <Text style={styles.diagnosisDesc}>{scan.disease_description}</Text>
                    )}
                </View>

                {/* ── What To Do ── */}
                {whatToDo.length > 0 && (
                    <View style={styles.whatToDoCard}>
                        <View style={styles.whatToDoHeader}>
                            <MaterialCommunityIcons name="clipboard-check" size={18} color={COLORS.primary} />
                            <Text style={styles.whatToDoTitle}>What To Do</Text>
                        </View>
                        {whatToDo.map((step, idx) => (
                            <View key={idx} style={styles.whatToDoItem}>
                                <View style={styles.stepNumberCircle}>
                                    <Text style={styles.stepNumber}>{idx + 1}</Text>
                                </View>
                                <Text style={styles.whatToDoText}>{step}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Expert / Prevention Tips ── */}
                {farmTips.length > 0 && (
                    <View style={styles.expertCard}>
                        <View style={styles.expertHeaderRow}>
                            <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.primary} />
                            <Text style={styles.expertTitle}>Keep Your Farm Safe</Text>
                        </View>
                        {farmTips.map((tip, idx) => (
                            <View key={idx} style={styles.tipRow}>
                                <Text style={styles.tipTitle}>{tip.title}:</Text>
                                <Text style={styles.tipDesc}>{tip.desc}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Expert Recommendation ── */}
                {expert && (
                    <View style={styles.expertCard}>
                        <View style={styles.expertHeaderRow}>
                            <MaterialCommunityIcons name="flask-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.expertTitle}>Expert Recommendation</Text>
                        </View>
                        <Text style={styles.expertDesc}>
                            Apply <Text style={{ fontWeight: '700' }}>{expert.fungicide}</Text> fungicide immediately.
                            Ensure 3-meter spray height coverage for optimal leaf absorption.
                        </Text>
                        <View style={styles.expertTagsRow}>
                            <View style={styles.expertTag}>
                                <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.expertTagText}>
                                    {plan?.estimated_recovery_days ?? scan.follow_up_days} Day Plan
                                </Text>
                            </View>
                            <View style={styles.expertTag}>
                                <MaterialCommunityIcons name="water-percent" size={14} color={COLORS.primary} />
                                <Text style={styles.expertTagText}>{expert.waterMix}</Text>
                            </View>
                            <View style={styles.expertTag}>
                                <Ionicons name="refresh-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.expertTagText}>Follow up: {scan.follow_up_days}d</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ── GPS Location ── */}
                {scan.tree?.latitude && scan.tree?.longitude && (
                    <View style={styles.gpsBlock}>
                        <View style={styles.gpsBlockHeader}>
                            <Ionicons name="location" size={16} color={COLORS.primary} />
                            <Text style={styles.gpsBlockTitle}>Tree GPS Location</Text>
                        </View>
                        <View style={styles.gpsCoordRow}>
                            <View style={styles.gpsCoordItem}>
                                <Text style={styles.gpsCoordLabel}>LATITUDE</Text>
                                <Text style={styles.gpsCoordValue}>{scan.tree.latitude.toFixed(6)}</Text>
                            </View>
                            <View style={styles.gpsCoordDivider} />
                            <View style={styles.gpsCoordItem}>
                                <Text style={styles.gpsCoordLabel}>LONGITUDE</Text>
                                <Text style={styles.gpsCoordValue}>{scan.tree.longitude.toFixed(6)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ── Treatment Timeline ── */}
                {steps.length > 0 && (
                    <>
                        <View style={styles.progressHeaderRow}>
                            <Text style={styles.progressTitle}>Treatment Progress</Text>
                            <Text style={styles.progressStep}>
                                Step {currentStepIndex > 0 ? currentStepIndex : steps.length} of {steps.length}
                            </Text>
                        </View>

                        <View style={styles.timelineContainer}>
                            <View style={styles.timelineLine} />
                            {steps.map(step => {
                                const due = formatDue(step.due_date);
                                const isCompleted = step.status === 'completed';
                                const isCurrent   = step.status === 'ongoing';

                                if (isCompleted) return (
                                    <View key={step.id} style={styles.timelineStep}>
                                        <View style={[styles.stepIcon, { backgroundColor: COLORS.primary }]}>
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        </View>
                                        <View style={[styles.stepContent, { paddingTop: 2 }]}>
                                            <Text style={styles.stepTitle}>{step.title}</Text>
                                            <Text style={styles.stepDesc}>{step.description}</Text>
                                            {due && <Text style={styles.stepDue}>✅ {due}</Text>}
                                        </View>
                                    </View>
                                );

                                if (isCurrent) return (
                                    <View key={step.id} style={styles.timelineStep}>
                                        <View style={[styles.stepIcon, { backgroundColor: '#fff', borderColor: COLORS.primary, borderWidth: 3 }]}>
                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary }} />
                                        </View>
                                        <View style={[styles.stepContent, styles.activeStepCard]}>
                                            <View style={styles.stepTitleRow}>
                                                <Text style={styles.stepTitleActive}>{step.title}</Text>
                                                <View style={styles.currentBadge}>
                                                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.stepDesc}>{step.description}</Text>
                                            {due && <Text style={styles.stepDue}>📅 Due: {due}</Text>}
                                        </View>
                                    </View>
                                );

                                return (
                                    <View key={step.id} style={styles.timelineStep}>
                                        <View style={[styles.stepIcon, { backgroundColor: '#e5e7eb' }]}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4b5563' }} />
                                        </View>
                                        <View style={[styles.stepContent, { paddingTop: 2 }]}>
                                            <Text style={styles.stepTitle}>{step.title}</Text>
                                            <Text style={styles.stepDesc}>{step.description}</Text>
                                            {due && <Text style={styles.stepDue}>📅 Due: {due}</Text>}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                {plan && (
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => router.push({
                            pathname: '/pages/milestone_detail' as any,
                            params: { scanId: scan.id },
                        })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="flag-outline" size={18} color="#fff" />
                        <Text style={styles.primaryBtnText}>View Milestones</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
                    <Ionicons name="arrow-back-outline" size={18} color={COLORS.warningText} />
                    <Text style={styles.secondaryBtnText}>Back to History</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    loadingText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
    backLink: { marginTop: 8 },
    backLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
    },
    backButton: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
    },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logoText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: '#000', marginTop: 10, marginBottom: 4 },
    pageSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },

    imageCard: {
        width: '100%', height: 240, borderRadius: 24, overflow: 'hidden',
        marginBottom: 16, backgroundColor: '#011222',
    },
    sampleImage: { width: '100%', height: '100%', opacity: 0.9 },
    riskBadgeAbs: {
        position: 'absolute', top: 14, right: 14,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    },
    riskBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    capturedTag: {
        position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.88)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, gap: 6,
    },
    redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e53e3e' },
    capturedText: { fontSize: 10, fontWeight: '700', color: '#333', letterSpacing: 0.5 },

    diagnosisCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16 },
    diagnosisHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    diseaseIconContainer: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#ffebee', alignItems: 'center', justifyContent: 'center',
    },
    diagnosisLabel: {
        fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
    },
    diseaseName: { fontSize: 20, fontWeight: '800', color: '#000' },
    confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
    confidenceLabel: { fontSize: 13, color: COLORS.textMuted },
    confidenceValue: { fontSize: 14, fontWeight: '800', color: '#000' },
    progressBarBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
    progressBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
    diagnosisDesc: { fontSize: 14, lineHeight: 22, color: COLORS.textMuted },

    whatToDoCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16 },
    whatToDoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    whatToDoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
    whatToDoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    stepNumberCircle: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
    },
    stepNumber: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
    whatToDoText: { flex: 1, fontSize: 14, lineHeight: 22, color: COLORS.textMuted },

    expertCard: { backgroundColor: COLORS.expertCard, borderRadius: 20, padding: 20, marginBottom: 16 },
    expertHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    expertTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
    expertDesc: { fontSize: 14, lineHeight: 22, color: COLORS.textMain, marginBottom: 16 },
    expertTagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    expertTag: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, gap: 6,
    },
    expertTagText: { fontSize: 12, fontWeight: '700', color: '#333' },
    tipRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
    tipTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
    tipDesc: { fontSize: 13, color: COLORS.textMuted, flex: 1 },

    gpsBlock: { backgroundColor: '#f0fdf4', borderRadius: 20, padding: 16, marginBottom: 20 },
    gpsBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    gpsBlockTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
    gpsCoordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    gpsCoordItem: { flex: 1, alignItems: 'center' },
    gpsCoordLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 4 },
    gpsCoordValue: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
    gpsCoordDivider: { width: 1, height: 32, backgroundColor: '#c6f6d5' },

    progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    progressTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
    progressStep: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
    timelineContainer: { position: 'relative', marginLeft: 8, marginBottom: 24 },
    timelineLine: { position: 'absolute', left: 11, top: 10, bottom: 30, width: 2, backgroundColor: '#e5e7eb' },
    timelineStep: { flexDirection: 'row', marginBottom: 24 },
    stepIcon: {
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginRight: 16, zIndex: 1,
    },
    stepContent: { flex: 1 },
    activeStepCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        marginTop: -12, borderColor: '#eee', borderWidth: 1,
    },
    stepTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    stepTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
    stepTitleActive: { fontSize: 14, fontWeight: '700', color: '#000', flex: 1 },
    stepDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
    stepDue: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 6 },
    currentBadge: {
        backgroundColor: '#a8e6cf', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 12, marginLeft: 8,
    },
    currentBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },

    bottomActions: {
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
        backgroundColor: COLORS.background,
    },
    primaryBtn: {
        backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 16, borderRadius: 30, gap: 8, marginBottom: 12,
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    secondaryBtn: {
        backgroundColor: COLORS.warning, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 16, borderRadius: 30, gap: 8,
    },
    secondaryBtnText: { color: COLORS.warningText, fontSize: 15, fontWeight: '700' },
});
