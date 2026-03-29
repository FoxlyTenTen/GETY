import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScan } from '@/context/ScanContext';

export default function DiseaseProgressCard({ diseaseName }: { diseaseName?: string }) {
    const { currentScan } = useScan();

    const name = diseaseName || currentScan.diseaseName;
    const total = currentScan.treatmentSteps.length;
    const completed = currentScan.treatmentSteps.filter(s => s.status === 'completed').length;
    const pending = currentScan.treatmentSteps.filter(s => s.status !== 'completed').length;
    const progressPct = Math.round((completed / total) * 100);

    // Location: prefer GPS address, else fall back to plot label
    const locationLabel = currentScan.scanAddress || currentScan.location || null;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.leftInfo}>
                    <Text style={styles.statusLabel}>TREATMENT PLAN</Text>
                    <Text style={styles.diseaseTitle}>{name}</Text>

                    {/* Location pill — shows which tree/plot this scan was for */}
                    {locationLabel && (
                        <View style={styles.locationPill}>
                            <Ionicons name="location" size={12} color="#1e5b43" />
                            <Text style={styles.locationPillText} numberOfLines={1}>{locationLabel}</Text>
                        </View>
                    )}

                    <View style={styles.badgeColumn}>
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

                <View style={styles.rightProgress}>
                    <View style={styles.progressCircle}>
                        <Text style={styles.progressPercent}>{progressPct}%</Text>
                        <Text style={styles.progressLabel}>done</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: 20, marginBottom: 24 },
    card: {
        backgroundColor: '#fff', borderRadius: 40, padding: 24, flexDirection: 'row',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 3,
    },
    leftInfo: { flex: 1.5 },
    statusLabel: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 1, marginBottom: 8 },
    diseaseTitle: { fontSize: 22, fontWeight: '800', color: '#166534', marginBottom: 10, lineHeight: 28 },
    locationPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#e8f5e9', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        alignSelf: 'flex-start', marginBottom: 16,
    },
    locationPillText: { fontSize: 11, fontWeight: '700', color: '#1e5b43', maxWidth: 140 },
    badgeColumn: { gap: 10 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignSelf: 'flex-start', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    rightProgress: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    progressCircle: {
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 8, borderColor: '#e5e7eb',
        borderTopColor: '#166534', borderRightColor: '#166534',
        alignItems: 'center', justifyContent: 'center',
    },
    progressPercent: { fontSize: 20, fontWeight: '800', color: '#111827' },
    progressLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
});
