import React from 'react';
import {
    StyleSheet, ScrollView, StatusBar, View, Text,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppHeader from '@/components/common/AppHeader';
import { useScan, ScanRecord } from '@/context/ScanContext';

export default function MilestonePage() {
    const { history } = useScan();

    // Only show scans that have treatment steps
    const scans = history.filter(s => s.treatmentSteps && s.treatmentSteps.length > 0);

    const handlePress = (scan: ScanRecord) => {
        router.push({ pathname: '/pages/milestone_detail' as any, params: { scanId: scan.id } });
    };

    // ── Empty ──────────────────────────────────────────────────────
    if (scans.length === 0) {
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

    // ── Milestone list ─────────────────────────────────────────────
    const active = scans.filter(s =>
        s.treatmentSteps.some(st => st.status !== 'completed')
    );
    const completed = scans.filter(s =>
        s.treatmentSteps.length > 0 && s.treatmentSteps.every(st => st.status === 'completed')
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8faf9" />
            <AppHeader title="Milestones" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {/* ── Summary row ── */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryNum}>{scans.length}</Text>
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

                {/* ── Active milestones ── */}
                {active.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>IN PROGRESS</Text>
                        {active.map(scan => <MilestoneCard key={scan.id} scan={scan} onPress={() => handlePress(scan)} />)}
                    </>
                )}

                {/* ── Completed milestones ── */}
                {completed.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>COMPLETED</Text>
                        {completed.map(scan => <MilestoneCard key={scan.id} scan={scan} onPress={() => handlePress(scan)} />)}
                    </>
                )}

                <View style={{ height: 80 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Milestone Card ──────────────────────────────────────────────────────────────

function MilestoneCard({ scan, onPress }: { scan: ScanRecord; onPress: () => void }) {
    const steps   = scan.treatmentSteps ?? [];
    const total      = steps.length;
    const done       = steps.filter(s => s.status === 'completed').length;
    const progressPct = total > 0 ? done / total : 0;
    const isCompleted = total > 0 && done === total;

    // Next upcoming step
    const nextStep = steps.find(s => s.status !== 'completed');

    const location = scan.scanAddress || scan.location || 'Unknown Location';
    const diseaseName = scan.diseaseName ?? 'Unknown Disease';
    const risk = scan.risk;
    const scanDate = scan.scanDate;

    const riskColor = risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#2eb86a';
    const riskBg    = risk === 'High' ? '#fee2e2' : risk === 'Medium' ? '#fff3e0' : '#dcfce7';

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            {/* Top row — disease + risk badge */}
            <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                    <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
                        <Text style={[styles.riskText, { color: riskColor }]}>{risk} RISK</Text>
                    </View>
                    <Text style={styles.cardDisease} numberOfLines={2}>{diseaseName}</Text>
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
                            Next: {nextStep.title}
                            {nextStep.date ? ` · ${nextStep.date}` : ''}
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

// ── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8faf9' },
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
    summaryNum: { fontSize: 26, fontWeight: '800', color: '#1e5b43' },
    summaryLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginTop: 2 },

    sectionTitle: {
        fontSize: 12, fontWeight: '800', color: '#9ca3af',
        letterSpacing: 1.2, marginBottom: 14, marginTop: 4,
    },

    // Card
    card: {
        backgroundColor: '#fff', borderRadius: 28, padding: 20,
        marginBottom: 16,
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
    circleNum: { fontSize: 14, fontWeight: '800', color: '#111827' },
    circleLabel: { fontSize: 9, color: '#6b7280', fontWeight: '600' },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
    metaText: { fontSize: 12, color: '#6b7280', flexShrink: 1 },
    metaDot: { color: '#d1d5db' },

    progressBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 8 },

    nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nextText: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
    chevron: { marginLeft: 'auto' },
});
