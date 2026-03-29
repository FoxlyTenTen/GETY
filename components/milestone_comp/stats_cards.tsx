import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useScan } from '@/context/ScanContext';

export default function StatsCards() {
    const { currentScan } = useScan();
    const total = currentScan.treatmentSteps.length;
    const completed = currentScan.treatmentSteps.filter(s => s.status === 'completed').length;
    const active = currentScan.treatmentSteps.filter(s => s.status === 'current').length;

    return (
        <View style={styles.statsContainer}>
            <View style={styles.totalTasksCard}>
                <Text style={styles.statLabel}>Total Tasks</Text>
                <Text style={styles.statNumber}>{total}</Text>
            </View>

            <View style={styles.smallStatsColumn}>
                <View style={[styles.smallCard, { backgroundColor: '#f3f4f6' }]}>
                    <View style={styles.smallCardRow}>
                        <View>
                            <Text style={styles.smallStatLabel}>Completed</Text>
                            <Text style={styles.smallStatNumber}>{completed}</Text>
                        </View>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark-circle" size={24} color="#2eb86a" />
                        </View>
                    </View>
                </View>

                <View style={[styles.smallCard, { backgroundColor: '#fee2e2' }]}>
                    <View style={styles.smallCardRow}>
                        <View>
                            <Text style={styles.smallStatLabel}>Active</Text>
                            <Text style={styles.smallStatNumber}>{active}</Text>
                        </View>
                        <View style={styles.activeCircle}>
                            <MaterialCommunityIcons name="dots-horizontal-circle" size={24} color="#ef4444" />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 24 },
    totalTasksCard: { flex: 1, backgroundColor: '#dcfce7', borderRadius: 30, padding: 24, justifyContent: 'space-between', height: 160 },
    statLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    statNumber: { fontSize: 48, fontWeight: '800', color: '#166534' },
    smallStatsColumn: { flex: 1, gap: 16 },
    smallCard: { flex: 1, borderRadius: 24, padding: 16, justifyContent: 'center' },
    smallCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    smallStatLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
    smallStatNumber: { fontSize: 24, fontWeight: '800', color: '#111827' },
    checkCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    activeCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
