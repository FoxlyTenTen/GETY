import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useScan, TreatmentStep } from '@/context/ScanContext';
import { useLanguage } from '@/context/LanguageContext';

export default function TreatmentPage() {
    const { currentScan } = useScan();
    const { t } = useLanguage();

    if (!currentScan) {
        router.replace('/');
        return null;
    }

    const { diseaseName, treatmentSteps, dayPlan } = currentScan;

    const completedCount = treatmentSteps.filter(s => s.status === 'completed').length;
    const progressPct = Math.round((completedCount / treatmentSteps.length) * 100);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#064e3b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.treatmentPlan}</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Sub-Header Section */}
                <View style={styles.subHeader}>
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeText}>{t.activeTreatment}</Text>
                    </View>
                    <Text style={styles.diseaseName}>{diseaseName}</Text>
                </View>

                <Text style={styles.mainTitle}>{t.reviveCanopy}</Text>

                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressTop}>
                        <View>
                            <Text style={styles.progressLabel}>{t.currentProgress}</Text>
                            <Text style={styles.progressPercent}>{progressPct}%</Text>
                        </View>
                        <View style={styles.estRecovery}>
                            <MaterialCommunityIcons name="cog" size={24} color="#f3f4f6" style={styles.cogIcon} />
                            <Text style={styles.estLabel}>{t.estRecovery}</Text>
                            <Text style={styles.estDays}>{dayPlan} Days</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                    </View>
                </View>

                {/* Roadmap Header */}
                <View style={styles.roadmapHeader}>
                    <Text style={styles.roadmapTitle}>{t.milestoneRoadmap}</Text>
                    <MaterialCommunityIcons name="bandage" size={20} color="#235e45" />
                </View>

                {/* Timeline */}
                <View style={styles.timelineContainer}>
                    <View style={styles.verticalLine} />

                    {treatmentSteps.map((step: TreatmentStep) => {
                        if (step.status === 'completed') {
                            return (
                                <View key={step.id} style={styles.timelineItem}>
                                    <View style={[styles.timelineIcon, styles.iconCompleted]}>
                                        <Ionicons name="checkmark" size={20} color="#fff" />
                                    </View>
                                    <View style={[styles.milestoneCard, styles.cardCompleted]}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.completedTitle}>{step.title}</Text>
                                            <Ionicons name="checkmark-circle" size={18} color="#235e45" />
                                        </View>
                                        <Text style={styles.completedDesc}>{step.desc}</Text>
                                    </View>
                                </View>
                            );
                        } else if (step.status === 'current') {
                            return (
                                <View key={step.id} style={styles.timelineItem}>
                                    <View style={[styles.timelineIcon, styles.iconOngoing]}>
                                        <Ionicons name="eye" size={20} color="#235e45" />
                                    </View>
                                    <View style={[styles.milestoneCard, styles.cardOngoing]}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.milestoneTitle}>{step.title}</Text>
                                            <View style={styles.statusBadgeOngoing}>
                                                <Text style={styles.statusTextOngoing}>{t.ongoing}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.milestoneDesc}>{step.desc}</Text>
                                    </View>
                                </View>
                            );
                        } else {
                            return (
                                <View key={step.id} style={styles.timelineItem}>
                                    <View style={[styles.timelineIcon, styles.iconLocked]}>
                                        <Ionicons name="lock-closed" size={18} color="#9ca3af" />
                                    </View>
                                    <View style={[styles.milestoneCard, styles.cardUpcoming]}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.upcomingTitle}>{step.title}</Text>
                                            <View style={styles.statusBadgeUpcoming}>
                                                <Text style={styles.statusTextUpcoming}>{t.upcoming}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.upcomingDesc}>{step.desc}</Text>
                                    </View>
                                </View>
                            );
                        }
                    })}
                </View>

                {/* Expert Tip */}
                <View style={styles.expertTipCard}>
                    <View style={styles.tipIconBox}>
                        <MaterialCommunityIcons name="lightbulb" size={24} color="#4b3621" />
                    </View>
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>{t.expertTip}</Text>
                        <Text style={styles.tipText}>
                            {currentScan.expertTip ?? t.defaultExpertTip}
                        </Text>
                    </View>
                </View>

                {/* Saved confirmation + navigate to milestones */}
                <View style={styles.savedBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#166534" />
                    <Text style={styles.savedBannerText}>{t.planSavedToSupabase ?? 'Plan saved to your account'}</Text>
                </View>

                <TouchableOpacity
                    style={styles.viewMilestonesBtn}
                    onPress={() => router.replace('/(tabs)/milestone' as any)}
                    activeOpacity={0.88}
                >
                    <MaterialCommunityIcons name="flag-checkered" size={20} color="#fff" />
                    <Text style={styles.viewMilestonesBtnText}>{t.viewMilestones ?? 'View in Milestones'}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fbfdfb' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#235e45' },
    backButton: { padding: 5 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    subHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    activeBadge: { backgroundColor: '#fbe7e5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    activeText: { color: '#9b3c38', fontSize: 10, fontWeight: '800' },
    diseaseName: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
    mainTitle: { fontSize: 32, fontWeight: '800', color: '#111827', lineHeight: 40, marginBottom: 24 },
    progressCard: {
        backgroundColor: '#fff', borderRadius: 40, padding: 24, marginBottom: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05, shadowRadius: 20, elevation: 3,
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    progressLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5, marginBottom: 4 },
    progressPercent: { fontSize: 42, fontWeight: '800', color: '#235e45' },
    estRecovery: { alignItems: 'flex-end', position: 'relative' },
    cogIcon: { position: 'absolute', top: -10, right: -10, opacity: 0.5 },
    estLabel: { fontSize: 11, fontWeight: '700', color: '#111827', letterSpacing: 0.3 },
    estDays: { fontSize: 14, color: '#4b5563', fontWeight: '600' },
    progressBarTrack: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#235e45', borderRadius: 5 },
    roadmapHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
    roadmapTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
    timelineContainer: { paddingLeft: 10, marginBottom: 32 },
    verticalLine: {
        position: 'absolute', left: 35, top: 20, bottom: 20,
        width: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb',
    },
    timelineItem: { flexDirection: 'row', marginBottom: 20, gap: 20 },
    timelineIcon: {
        width: 50, height: 50, borderRadius: 25,
        alignItems: 'center', justifyContent: 'center', zIndex: 1,
        backgroundColor: '#fff', shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    },
    iconOngoing: { backgroundColor: '#dcfce7' },
    iconCompleted: { backgroundColor: '#235e45' },
    iconLocked: { backgroundColor: '#f3f4f6' },
    milestoneCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 1,
    },
    cardOngoing: { borderWidth: 1, borderColor: '#f0fdf4' },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    milestoneTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
    statusBadgeOngoing: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusTextOngoing: { color: '#166534', fontSize: 9, fontWeight: '800' },
    milestoneDesc: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
    cardCompleted: { backgroundColor: '#f9fafb', opacity: 0.8 },
    completedTitle: { fontSize: 15, fontWeight: '700', color: '#6b7280', textDecorationLine: 'line-through', flex: 1 },
    completedDesc: { fontSize: 13, color: '#9ca3af', lineHeight: 18 },
    cardUpcoming: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fdfdfd' },
    upcomingTitle: { fontSize: 15, fontWeight: '700', color: '#374151', flex: 1 },
    statusBadgeUpcoming: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusTextUpcoming: { color: '#6b7280', fontSize: 9, fontWeight: '800' },
    upcomingDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
    savedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#dcfce7', borderRadius: 16, padding: 14,
        marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0',
    },
    savedBannerText: { fontSize: 13, fontWeight: '700', color: '#166534', flex: 1 },
    viewMilestonesBtn: {
        backgroundColor: '#235e45', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 18, borderRadius: 30,
        gap: 10, marginBottom: 16,
    },
    viewMilestonesBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    expertTipCard: {
        backgroundColor: '#f4e4d0', borderRadius: 30, padding: 24,
        flexDirection: 'row', gap: 16, alignItems: 'flex-start',
    },
    tipIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    tipContent: { flex: 1 },
    tipTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
    tipText: { fontSize: 13, color: '#4b3621', lineHeight: 18 },
});
