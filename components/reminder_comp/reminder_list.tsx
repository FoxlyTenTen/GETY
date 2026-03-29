import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useScan } from '@/context/ScanContext';

// DATA SOURCE: Uses the latest saved scan from local ScanContext history.
// TODO: Replace with Supabase fetchLatestActiveScan() when connecting the database.

export default function ReminderList() {
    const { history, setCurrentScan } = useScan();

    // Get the most recently saved scan that has treatment steps
    const latestScan = history.find(s => s.treatmentSteps && s.treatmentSteps.length > 0) ?? null;

    if (!latestScan) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyText}>No active treatment plans yet.{'\n'}Save a scan report to get started.</Text>
            </View>
        );
    }

    const steps = latestScan.treatmentSteps ?? [];
    const diseaseName = latestScan.diseaseName ?? 'Unknown Disease';
    const locationLabel = latestScan.scanAddress || latestScan.location || null;

    const reminders = steps.map((step) => ({
        id: step.id,
        title: `${diseaseName} – ${step.title}`,
        time: step.date
            ? `Due: ${step.date}`
            : step.status === 'completed' ? 'Completed' : 'Upcoming',
        priority: step.status === 'current' ? 'HIGH PRIORITY' : step.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED',
        priorityLevel: step.status === 'current' ? 'high' : step.status === 'upcoming' ? 'medium' : 'low',
        completed: step.status === 'completed',
        stepTitle: step.title,
    }));

    const handlePressStep = (stepTitle: string) => {
        setCurrentScan(latestScan);
        router.push({
            pathname: '/pages/milestone_detail' as any,
            params: { scanId: latestScan.id },
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Treatment Reminders</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add-circle" size={20} color="#235e45" />
                    <Text style={styles.addText}>Add New</Text>
                </TouchableOpacity>
            </View>

            {reminders.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={[styles.taskCard, item.completed && styles.taskCardCompleted]}
                    activeOpacity={0.7}
                    onPress={() => handlePressStep(item.stepTitle)}
                >
                    <View style={styles.checkboxWrapper}>
                        {item.completed ? (
                            <View style={styles.checkedCircle}>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                            </View>
                        ) : (
                            <View style={[
                                styles.emptyCircle,
                                item.priorityLevel === 'high' && { borderColor: '#ef4444' },
                            ]} />
                        )}
                    </View>

                    <View style={styles.content}>
                        <Text style={[styles.taskTitle, item.completed && styles.strikeThrough]} numberOfLines={2}>
                            {item.title}
                        </Text>
                        <View style={styles.timeRow}>
                            <Ionicons name="time-outline" size={13} color="#6b7280" />
                            <Text style={styles.taskTime}>{item.time}</Text>
                        </View>
                        {locationLabel && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={13} color="#9ca3af" />
                                <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
                            </View>
                        )}
                    </View>

                    <View style={[
                        styles.priorityBadge,
                        item.priorityLevel === 'high' ? styles.badgeHigh :
                        item.priorityLevel === 'medium' ? styles.badgeMedium :
                        styles.badgeLow,
                    ]}>
                        <Text style={[
                            styles.priorityText,
                            item.priorityLevel === 'high' ? styles.textHigh :
                            item.priorityLevel === 'medium' ? styles.textMedium :
                            styles.textLow,
                        ]}>{item.priority}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: 20, marginBottom: 32 },
    emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12, paddingHorizontal: 20 },
    emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '800', color: '#111827' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addText: { fontSize: 14, fontWeight: '700', color: '#235e45' },
    taskCard: {
        backgroundColor: '#fff', borderRadius: 30, padding: 20,
        flexDirection: 'row', alignItems: 'center', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03, shadowRadius: 10, elevation: 1,
    },
    taskCardCompleted: { opacity: 0.6, backgroundColor: '#f9fafb' },
    checkboxWrapper: { marginRight: 16 },
    emptyCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb' },
    checkedCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2eb86a', alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1 },
    taskTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
    strikeThrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    taskTime: { fontSize: 12, color: '#6b7280' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locationText: { fontSize: 11, color: '#9ca3af', flex: 1 },
    priorityBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    badgeHigh: { backgroundColor: '#fee2e2' },
    badgeMedium: { backgroundColor: '#ffedd5' },
    badgeLow: { backgroundColor: '#f3f4f6' },
    priorityText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    textHigh: { color: '#ef4444' },
    textMedium: { color: '#f59e0b' },
    textLow: { color: '#6b7280' },
});
