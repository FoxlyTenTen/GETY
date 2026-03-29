import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScan, TreatmentStep } from '@/context/ScanContext';

type Filter = 'All' | 'Completed' | 'Ongoing';

export default function TreatmentRoadmap() {
    const { currentScan } = useScan();
    const [filter, setFilter] = useState<Filter>('All');

    const allSteps = currentScan.treatmentSteps;
    const completed = allSteps.filter(s => s.status === 'completed').length;
    const total = allSteps.length;
    const phaseLabel = `Step ${completed} of ${total}`;

    const filtered = allSteps.filter(step => {
        if (filter === 'All') return true;
        if (filter === 'Completed') return step.status === 'completed';
        if (filter === 'Ongoing') return step.status === 'current';
        return true;
    });

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Treatment Timeline</Text>
                <View style={styles.phaseBadge}>
                    <Text style={styles.phaseText}>{phaseLabel}</Text>
                </View>
            </View>

            {/* Filter Segments */}
            <View style={styles.segmentWrapper}>
                {(['All', 'Completed', 'Ongoing'] as Filter[]).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.segmentBtn, filter === f && styles.activeBtn]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.segmentText, filter === f && styles.activeText]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.roadmapBox}>
                <View style={styles.verticalLine} />

                {filtered.map((step: TreatmentStep) => {
                    const isCompleted = step.status === 'completed';
                    const isOngoing = step.status === 'current';
                    const isUpcoming = step.status === 'upcoming';

                    return (
                        <View key={step.id} style={styles.timelineItem}>
                            {/* Icon */}
                            <View style={[
                                styles.iconWrapper,
                                isCompleted && styles.iconCompleted,
                                isOngoing && styles.iconOngoing,
                                isUpcoming && styles.iconUpcoming,
                            ]}>
                                {isCompleted ? (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                ) : isOngoing ? (
                                    <Ionicons name="medical" size={16} color="#166534" />
                                ) : (
                                    <Ionicons name="time" size={16} color="#9ca3af" />
                                )}
                            </View>

                            {/* Content Card */}
                            <View style={[
                                styles.contentBox,
                                isOngoing && styles.ongoingCard,
                                isUpcoming && styles.upcomingCard,
                            ]}>
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.stepTitle, isCompleted && styles.strikeText]}>
                                        {step.title}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        isCompleted && styles.badgeCompleted,
                                        isOngoing && styles.badgeOngoing,
                                        isUpcoming && styles.badgeUpcoming,
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            isCompleted && styles.textCompleted,
                                            isOngoing && styles.textOngoing,
                                            isUpcoming && styles.textUpcoming,
                                        ]}>
                                            {isCompleted ? 'DONE' : isOngoing ? 'ONGOING' : 'UPCOMING'}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.stepDesc}>{step.desc}</Text>

                                {step.date && (
                                    <View style={styles.dateRow}>
                                        <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                                        <Text style={styles.dateText}>{step.date}</Text>
                                    </View>
                                )}

                                {isOngoing && (
                                    <TouchableOpacity style={styles.doneBtn}>
                                        <Text style={styles.doneBtnText}>Mark as Completed</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}

                {filtered.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={36} color="#d1d5db" />
                        <Text style={styles.emptyText}>No steps match this filter.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: 20, marginBottom: 32 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '800', color: '#111827' },
    phaseBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    phaseText: { fontSize: 10, fontWeight: '700', color: '#6b7280' },
    segmentWrapper: {
        flexDirection: 'row', backgroundColor: '#f3f4f6',
        borderRadius: 24, padding: 5, marginBottom: 24,
    },
    segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    activeBtn: {
        backgroundColor: '#fff', shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    },
    segmentText: { fontSize: 13, color: '#6b7280', fontWeight: '700' },
    activeText: { color: '#166534' },
    roadmapBox: { position: 'relative', paddingLeft: 10 },
    verticalLine: {
        position: 'absolute', left: 25, top: 25, bottom: 25,
        width: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb',
    },
    timelineItem: { flexDirection: 'row', marginBottom: 24, gap: 20 },
    iconWrapper: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center', zIndex: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    iconCompleted: { backgroundColor: '#1e5b43' },
    iconOngoing: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#2eb86a' },
    iconUpcoming: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
    contentBox: {
        flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1,
    },
    ongoingCard: { borderWidth: 1, borderColor: '#dcfce7', backgroundColor: '#fbfdfb' },
    upcomingCard: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb', opacity: 0.8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    stepTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
    strikeText: { color: '#9ca3af', textDecorationLine: 'line-through' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeCompleted: { backgroundColor: '#f3f4f6' },
    badgeOngoing: { backgroundColor: '#dcfce7' },
    badgeUpcoming: { backgroundColor: '#f3f4f6' },
    statusText: { fontSize: 8, fontWeight: '800' },
    textCompleted: { color: '#6b7280' },
    textOngoing: { color: '#166534' },
    textUpcoming: { color: '#9ca3af' },
    stepDesc: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    dateText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
    doneBtn: { backgroundColor: '#1e5b43', paddingVertical: 12, borderRadius: 14, alignItems: 'center', marginTop: 16 },
    doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14, color: '#9ca3af' },
});
