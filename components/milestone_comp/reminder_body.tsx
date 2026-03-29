/**
 * ReminderBody.tsx
 * Receives a local ScanRecord and renders the full reminder tab content:
 *  - DiseaseProgressCard  (plan summary + location + % done)
 *  - StatsCards           (total / completed / active counts)
 *  - ReminderList         (one card per treatment step)
 *
 * DATA SOURCE: Local ScanContext (ScanRecord).
 * TODO: Replace prop type with SupabaseScan when connecting the database.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { ScanRecord, useScan } from '@/context/ScanContext';

type Props = { scan: ScanRecord };

export default function ReminderBody({ scan }: Props) {
    const { setCurrentScan } = useScan();

    const steps     = (scan.treatmentSteps ?? []);
    const diseaseName = scan.diseaseName ?? 'Unknown Disease';
    const locationLabel = scan.scanAddress || scan.location || null;

    // Step counts
    const total     = steps.length;
    const completed = steps.filter(s => s.status === 'completed').length;
    const active    = steps.filter(s => s.status === 'current').length;
    const pending   = total - completed;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Navigate to milestone detail
    const handlePressStep = (_stepTitle: string) => {
        setCurrentScan(scan);
        router.push({ pathname: '/pages/milestone_detail' as any, params: { scanId: scan.id } });
    };

    return (
        <>
            {/* ── Disease Progress Card ───────────────────────────────────────── */}
            <View style={styles.progContainer}>
                <View style={styles.progCard}>
                    <View style={styles.progLeft}>
                        <Text style={styles.progLabel}>TREATMENT PLAN</Text>
                        <Text style={styles.progTitle} numberOfLines={2}>{diseaseName}</Text>

                        {locationLabel && (
                            <View style={styles.locationPill}>
                                <Ionicons name="location" size={12} color="#1e5b43" />
                                <Text style={styles.locationPillText} numberOfLines={1}>{locationLabel}</Text>
                            </View>
                        )}

                        <View style={styles.badgeCol}>
                            <View style={[styles.badge, { backgroundColor: '#f3f4f6' }]}>
                                <View style={[styles.dot, { backgroundColor: '#6b7280' }]} />
                                <Text style={styles.badgeText}>Total: {total}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                                <View style={[styles.dot, { backgroundColor: '#2eb86a' }]} />
                                <Text style={[styles.badgeText, { color: '#166534' }]}>Completed: {completed}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                                <Text style={[styles.badgeText, { color: '#991b1b' }]}>Pending: {pending}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.progRight}>
                        <View style={styles.progressCircle}>
                            <Text style={styles.progressPct}>{progressPct}%</Text>
                            <Text style={styles.progressDone}>done</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── Stats Cards ─────────────────────────────────────────────────── */}
            <View style={styles.statsRow}>
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Total Tasks</Text>
                    <Text style={styles.totalNumber}>{total}</Text>
                </View>
                <View style={styles.smallCol}>
                    <View style={[styles.smallCard, { backgroundColor: '#f3f4f6' }]}>
                        <View style={styles.smallRow}>
                            <View>
                                <Text style={styles.smallLabel}>Completed</Text>
                                <Text style={styles.smallNumber}>{completed}</Text>
                            </View>
                            <View style={styles.iconCircle}>
                                <Ionicons name="checkmark-circle" size={24} color="#2eb86a" />
                            </View>
                        </View>
                    </View>
                    <View style={[styles.smallCard, { backgroundColor: '#fee2e2' }]}>
                        <View style={styles.smallRow}>
                            <View>
                                <Text style={styles.smallLabel}>Active</Text>
                                <Text style={styles.smallNumber}>{active}</Text>
                            </View>
                            <View style={styles.iconCircle}>
                                <MaterialCommunityIcons name="dots-horizontal-circle" size={24} color="#ef4444" />
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── Reminder List ────────────────────────────────────────────────── */}
            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Treatment Reminders</Text>
                    <TouchableOpacity style={styles.addBtn}>
                        <Ionicons name="add-circle" size={20} color="#235e45" />
                        <Text style={styles.addText}>Add New</Text>
                    </TouchableOpacity>
                </View>

                {steps.map((step) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent   = step.status === 'current';
                    const priority    = isCurrent ? 'HIGH PRIORITY' : isCompleted ? 'COMPLETED' : 'UPCOMING';
                    const pLevel      = isCurrent ? 'high' : isCompleted ? 'low' : 'medium';
                    const dueLabel    = step.date
                        ? `Due: ${step.date}`
                        : isCompleted ? 'Completed' : 'Upcoming';

                    return (
                        <TouchableOpacity
                            key={step.id}
                            style={[styles.taskCard, isCompleted && styles.taskDone]}
                            activeOpacity={0.7}
                            onPress={() => handlePressStep(step.title)}
                        >
                            <View style={styles.checkbox}>
                                {isCompleted ? (
                                    <View style={styles.checkedCircle}>
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    </View>
                                ) : (
                                    <View style={[styles.emptyCircle, isCurrent && { borderColor: '#ef4444' }]} />
                                )}
                            </View>

                            <View style={styles.stepContent}>
                                <Text style={[styles.stepTitle, isCompleted && styles.strikeThrough]} numberOfLines={2}>
                                    {diseaseName} – {step.title}
                                </Text>
                                <View style={styles.timeRow}>
                                    <Ionicons name="time-outline" size={13} color="#6b7280" />
                                    <Text style={styles.timeText}>{dueLabel}</Text>
                                </View>
                                {locationLabel && (
                                    <View style={styles.locRow}>
                                        <Ionicons name="location-outline" size={13} color="#9ca3af" />
                                        <Text style={styles.locText} numberOfLines={1}>{locationLabel}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={[
                                styles.badge2,
                                pLevel === 'high' ? styles.badgeHigh :
                                pLevel === 'medium' ? styles.badgeMed :
                                styles.badgeDone,
                            ]}>
                                <Text style={[
                                    styles.badgeTxt,
                                    pLevel === 'high' ? { color: '#ef4444' } :
                                    pLevel === 'medium' ? { color: '#f59e0b' } :
                                    { color: '#6b7280' },
                                ]}>{priority}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {steps.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No treatment steps found.</Text>
                    </View>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    // Progress Card
    progContainer: { paddingHorizontal: 20, marginBottom: 24 },
    progCard: {
        backgroundColor: '#fff', borderRadius: 40, padding: 24,
        flexDirection: 'row',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04, shadowRadius: 20, elevation: 3,
    },
    progLeft: { flex: 1.5 },
    progRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    progLabel: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 1, marginBottom: 8 },
    progTitle: { fontSize: 20, fontWeight: '800', color: '#166534', marginBottom: 10, lineHeight: 26 },
    locationPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#e8f5e9', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        alignSelf: 'flex-start', marginBottom: 14,
    },
    locationPillText: { fontSize: 11, fontWeight: '700', color: '#1e5b43', maxWidth: 140 },
    badgeCol: { gap: 8 },
    badge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 15, alignSelf: 'flex-start', gap: 8,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    progressCircle: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 8, borderColor: '#e5e7eb',
        borderTopColor: '#166534', borderRightColor: '#166534',
        alignItems: 'center', justifyContent: 'center',
    },
    progressPct: { fontSize: 20, fontWeight: '800', color: '#111827' },
    progressDone: { fontSize: 10, color: '#6b7280', fontWeight: '600' },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 24 },
    totalCard: {
        flex: 1, backgroundColor: '#dcfce7', borderRadius: 30,
        padding: 24, justifyContent: 'space-between', height: 160,
    },
    totalLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    totalNumber: { fontSize: 48, fontWeight: '800', color: '#166534' },
    smallCol: { flex: 1, gap: 16 },
    smallCard: { flex: 1, borderRadius: 24, padding: 16, justifyContent: 'center' },
    smallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    smallLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
    smallNumber: { fontSize: 24, fontWeight: '800', color: '#111827' },
    iconCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    },

    // Reminder list
    listContainer: { paddingHorizontal: 20, marginBottom: 32 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addText: { fontSize: 14, fontWeight: '700', color: '#235e45' },

    taskCard: {
        backgroundColor: '#fff', borderRadius: 30, padding: 20,
        flexDirection: 'row', alignItems: 'center', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03, shadowRadius: 10, elevation: 1,
    },
    taskDone: { opacity: 0.6, backgroundColor: '#f9fafb' },
    checkbox: { marginRight: 16 },
    emptyCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb' },
    checkedCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#2eb86a', alignItems: 'center', justifyContent: 'center',
    },
    stepContent: { flex: 1 },
    stepTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
    strikeThrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 12, color: '#6b7280' },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locText: { fontSize: 11, color: '#9ca3af', flex: 1 },
    badge2: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    badgeHigh: { backgroundColor: '#fee2e2' },
    badgeMed:  { backgroundColor: '#ffedd5' },
    badgeDone: { backgroundColor: '#f3f4f6' },
    badgeTxt:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

    emptyBox: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
