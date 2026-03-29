import React from 'react';
import {
    StyleSheet, ScrollView, StatusBar, View, Text,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScan } from '@/context/ScanContext';

export default function MilestoneDetailPage() {
    const { scanId } = useLocalSearchParams<{ scanId: string }>();
    const { history } = useScan();

    // Look up the scan from local history by id
    const scan = history.find(s => s.id === scanId) ?? null;

    if (!scan) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyText}>Milestone not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
                        <Text style={styles.backLinkText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const steps   = scan.treatmentSteps ?? [];
    const total   = steps.length;
    const done    = steps.filter(s => s.status === 'completed').length;
    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
    const location = scan.scanAddress || scan.location || 'Unknown Location';
    const scanDate = scan.scanDate;
    const risk = scan.risk;
    const riskColor = risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#2eb86a';
    const riskBg    = risk === 'High' ? '#fee2e2' : risk === 'Medium' ? '#fff3e0' : '#dcfce7';

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
                    <Text style={styles.headerTitle}>Milestone Detail</Text>
                </View>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* ── Disease Summary Card ── */}
                <View style={styles.summaryCard}>
                    <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
                        <Text style={[styles.riskText, { color: riskColor }]}>{risk} RISK</Text>
                    </View>
                    <Text style={styles.diseaseName}>{scan.diseaseName ?? 'Unknown Disease'}</Text>

                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color="#6b7280" />
                        <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                        <Text style={styles.dot}>·</Text>
                        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                        <Text style={styles.metaText}>{scanDate}</Text>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progRow}>
                        <Text style={styles.progLabel}>Progress</Text>
                        <Text style={styles.progPct}>{progressPct}%</Text>
                    </View>
                    <View style={styles.progressBg}>
                        <View style={[
                            styles.progressFill,
                            { width: `${progressPct}%` as any },
                        ]} />
                    </View>
                    <Text style={styles.progSub}>{done} of {total} milestones completed</Text>
                </View>

                {/* ── Treatment Info ── */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Treatment Info</Text>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="flask-outline" size={18} color="#1e5b43" />
                            <Text style={styles.infoLabel}>Fungicide</Text>
                            <Text style={styles.infoValue}>{scan.fungicide || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Ionicons name="water-outline" size={18} color="#1e5b43" />
                            <Text style={styles.infoLabel}>Water Mix</Text>
                            <Text style={styles.infoValue}>{scan.waterMix || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={18} color="#1e5b43" />
                            <Text style={styles.infoLabel}>Day Plan</Text>
                            <Text style={styles.infoValue}>{scan.dayPlan ?? 14} days</Text>
                        </View>
                    </View>
                </View>

                {/* ── Milestone Timeline ── */}
                <View style={styles.timelineContainer}>
                    <Text style={styles.timelineTitle}>Milestone Steps</Text>

                    {steps.map((step, idx) => {
                        const isCompleted = step.status === 'completed';
                        const isCurrent   = step.status === 'current';
                        const isLast      = idx === steps.length - 1;
                        const dueLabel = step.date ?? 'TBD';

                        return (
                            <View key={step.id} style={styles.timelineRow}>
                                {/* Line + dot */}
                                <View style={styles.timelineLeft}>
                                    <View style={[
                                        styles.timelineDot,
                                        isCompleted && styles.dotDone,
                                        isCurrent && styles.dotCurrent,
                                    ]}>
                                        {isCompleted
                                            ? <Ionicons name="checkmark" size={14} color="#fff" />
                                            : isCurrent
                                                ? <View style={styles.dotInner} />
                                                : null
                                        }
                                    </View>
                                    {!isLast && <View style={[styles.timelineLine, isCompleted && styles.lineDone]} />}
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
                                                <Text style={styles.currentBadgeText}>CURRENT</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.stepDesc}>{step.desc}</Text>
                                    <View style={styles.stepDueRow}>
                                        <Ionicons name="time-outline" size={12} color="#9ca3af" />
                                        <Text style={styles.stepDue}>{dueLabel}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* ── Continue Monitoring Button ── */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.monitorBtn} onPress={() => router.back()} activeOpacity={0.85}>
                        <Text style={styles.monitorText}>Back to Milestones</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8faf9' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
    backLinkBtn: { marginTop: 8 },
    backLinkText: { color: '#1e5b43', fontWeight: '700', fontSize: 15 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: '#f8faf9',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1e5b43' },

    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Summary Card
    summaryCard: {
        backgroundColor: '#fff', borderRadius: 28, padding: 24,
        marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 12 },
    riskText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    diseaseName: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 10, lineHeight: 30 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    metaText: { fontSize: 12, color: '#6b7280', flexShrink: 1 },
    dot: { color: '#d1d5db' },
    progRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
    progPct: { fontSize: 13, fontWeight: '800', color: '#1e5b43' },
    progressBg: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: 10, backgroundColor: '#1e5b43', borderRadius: 10 },
    progSub: { fontSize: 12, color: '#6b7280' },

    // Treatment Info
    infoCard: {
        backgroundColor: '#fff', borderRadius: 28, padding: 24,
        marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    infoTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
    infoItem: { flex: 1, alignItems: 'center', gap: 6 },
    infoDivider: { width: 1, backgroundColor: '#f3f4f6', marginHorizontal: 8 },
    infoLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
    infoValue: { fontSize: 13, fontWeight: '800', color: '#111827', textAlign: 'center' },

    // Timeline
    timelineContainer: {
        backgroundColor: '#fff', borderRadius: 28, padding: 24,
        marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    },
    timelineTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 24 },
    timelineRow: { flexDirection: 'row', marginBottom: 0 },
    timelineLeft: { alignItems: 'center', marginRight: 16, width: 28 },
    timelineDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb',
        alignItems: 'center', justifyContent: 'center',
    },
    dotDone: { backgroundColor: '#2eb86a', borderColor: '#2eb86a' },
    dotCurrent: { backgroundColor: '#fff', borderColor: '#1e5b43', borderWidth: 3 },
    dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1e5b43' },
    timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
    lineDone: { backgroundColor: '#2eb86a' },
    timelineContent: { flex: 1, paddingBottom: 28 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    stepTitle: { fontSize: 15, fontWeight: '800', color: '#111827', flex: 1 },
    stepTitleDone: { color: '#6b7280', textDecorationLine: 'line-through' },
    currentBadge: { backgroundColor: '#1e5b43', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    currentBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    stepDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 8 },
    stepDueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepDue: { fontSize: 12, color: '#9ca3af' },

    // Footer
    footer: { marginBottom: 8 },
    monitorBtn: {
        backgroundColor: '#1e5b43', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 20, borderRadius: 30, gap: 12,
        shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
    },
    monitorText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
