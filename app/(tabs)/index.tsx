import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/common/AppHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { QUERY_KEYS, fetchHomeData, HomeData } from '@/lib/queries';

const { width } = Dimensions.get('window');

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}
function formatDue(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function Index() {
    const { isAdmin } = useAuth();
    const { t } = useLanguage();
    const [alertDismissed, setAlertDismissed] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Resolve user ID once on mount
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    }, []);

    const { data, isLoading: loading, refetch } = useQuery({
        queryKey: QUERY_KEYS.homeData(userId ?? ''),
        queryFn: () => fetchHomeData(userId!),
        enabled: !!userId,
    });

    useFocusEffect(useCallback(() => {
        setAlertDismissed(false);
        refetch();
    }, [refetch]));

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" />
                <AppHeader title="GETY" />
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#1e5b43" />
                    <Text style={styles.loadingText}>{t.loadingDashboard}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const {
        userName,
        latestScan,
        totalScans,
        highRiskScan,
        currentStep,
    } = data ?? {
        userName: 'Farmer',
        latestScan: null,
        totalScans: 0,
        highRiskScan: null,
        currentStep: null,
    };

    // Greeting based on time of day
    const hour = new Date().getHours();
    const greeting = hour < 12 ? t.goodMorning : hour < 17 ? t.goodAfternoon : t.goodEvening;
    const subText = totalScans > 0
        ? (totalScans === 1 ? t.scanRecordsSingle(totalScans) : t.scanRecordsPlural(totalScans))
        : t.startScanning;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <AppHeader title="GETY" />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Greeting ── */}
                <Text style={styles.greeting}>{greeting}, {userName}!</Text>
                <Text style={styles.greetingSub}>{subText}</Text>

                {/* ── Alert Banner (high risk only) ── */}
                {!alertDismissed && highRiskScan && (
                    <View style={styles.alertCard}>
                        <View style={styles.alertLeft}>
                            <Ionicons name="warning" size={16} color="#c62828" style={{ marginTop: 1 }} />
                            <View style={styles.alertText}>
                                <Text style={styles.alertTitle}>{t.actionRequired}</Text>
                                <Text style={styles.alertBody}>
                                    {t.detectedAt(highRiskScan.disease_name, highRiskScan.tree_label)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setAlertDismissed(true)} style={styles.alertClose}>
                            <Ionicons name="close" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Recent Diagnosis Card ── */}
                <View style={styles.diagnosisCard}>
                    <View style={styles.diagnosisLeft}>
                        <Text style={styles.diagnosisLabel}>{t.recentDiagnosis}</Text>
                        <Text style={styles.diagnosisName}>
                            {latestScan ? latestScan.disease_name : t.noScansYet}
                        </Text>
                        <Text style={styles.diagnosisTime}>
                            {latestScan
                                ? t.scannedOn(formatDate(latestScan.scanned_at), latestScan.tree_label)
                                : t.startScanningResults}
                        </Text>
                    </View>
                    <View style={[
                        styles.diagnosisIcon,
                        latestScan?.risk_level === 'high'
                            ? { backgroundColor: '#ffebee' }
                            : latestScan?.risk_level === 'medium'
                                ? { backgroundColor: '#fff3e0' }
                                : { backgroundColor: '#f0fdf4' },
                    ]}>
                        <MaterialCommunityIcons
                            name="leaf"
                            size={32}
                            color={
                                latestScan?.risk_level === 'high' ? '#ef4444'
                                    : latestScan?.risk_level === 'medium' ? '#f59e0b'
                                        : '#a8e6cf'
                            }
                        />
                    </View>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    {/* Current milestone step */}
                    <View style={styles.statCard}>
                        <View style={styles.statIconRow}>
                            <MaterialCommunityIcons name="calendar-check" size={18} color="#235e45" />
                            <Text style={styles.statCategory}>{t.milestone}</Text>
                        </View>
                        <Text style={styles.statMain} numberOfLines={2}>
                            {currentStep ? currentStep.title : t.noActiveTask}
                        </Text>
                        <Text style={styles.statSub}>
                            {currentStep?.due_date
                                ? t.due(formatDue(currentStep.due_date) ?? '')
                                : t.allStepsUpToDate}
                        </Text>
                    </View>

                    {/* Total records */}
                    <View style={styles.statCard}>
                        <View style={styles.statIconRow}>
                            <MaterialCommunityIcons name="chart-bar" size={18} color="#235e45" />
                            <Text style={styles.statCategory}>{t.records}</Text>
                        </View>
                        <Text style={[styles.statMain, { fontSize: 36 }]}>{totalScans}</Text>
                        <Text style={styles.statSub}>{t.totalPastScans}</Text>
                    </View>
                </View>

                {/* ── Quick Actions ── */}
                <Text style={styles.sectionTitle}>{t.quickActions}</Text>

                {/* Primary CTA */}
                <TouchableOpacity
                    style={styles.captureBtn}
                    activeOpacity={0.88}
                    onPress={() => router.push('/pages/scanpage')}
                >
                    <Ionicons name="camera" size={22} color="#fff" />
                    <Text style={styles.captureBtnText}>{t.captureImage}</Text>
                </TouchableOpacity>

                {/* 2×2 Action Grid */}
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionItem} activeOpacity={0.75}>
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="file-image-outline" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>{t.uploadImage}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.75}
                        onPress={() => router.push('/(tabs)/assistant')}
                    >
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="robot-outline" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>{t.aiAssistant}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.75}
                        onPress={() => router.push('/(tabs)/history')}
                    >
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="history" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>{t.historyLabel}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.75}
                        onPress={() => router.push('/(tabs)/milestone')}
                    >
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="flag-checkered" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>{t.milestonesLabel}</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Admin: Knowledge Base ── */}
                {isAdmin && (
                    <TouchableOpacity
                        style={styles.adminBtn}
                        activeOpacity={0.88}
                        onPress={() => router.push('/admin/knowledge-base-upload')}
                    >
                        <Ionicons name="cloud-upload-outline" size={20} color="#1e5b43" />
                        <Text style={styles.adminBtnText}>{t.knowledgeBase}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {/* ── Decorative Leaf Image ── */}
                <View style={styles.leafImageContainer}>
                    <Image
                        source={require('@/assets/images/leaf.jpeg')}
                        style={styles.leafImage}
                        resizeMode="cover"
                    />
                    <View style={styles.leafOverlay} />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#9ca3af' },

    greeting:    { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 6 },
    greetingSub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

    alertCard: {
        backgroundColor: '#fff3f3', borderRadius: 20, padding: 16,
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 20, borderWidth: 1, borderColor: '#fecaca',
    },
    alertLeft:  { flexDirection: 'row', gap: 10, flex: 1 },
    alertText:  { flex: 1 },
    alertTitle: { fontSize: 13, fontWeight: '800', color: '#c62828', marginBottom: 4 },
    alertBody:  { fontSize: 13, color: '#374151', lineHeight: 20 },
    alertClose: { padding: 4, marginLeft: 8 },

    diagnosisCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    diagnosisLeft: { flex: 1, marginRight: 12 },
    diagnosisLabel: {
        fontSize: 11, color: '#9ca3af', fontWeight: '700',
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    diagnosisName: { fontSize: 20, fontWeight: '800', color: '#235e45', marginBottom: 4 },
    diagnosisTime: { fontSize: 12, color: '#9ca3af' },
    diagnosisIcon: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
    },

    statsRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
    statCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    },
    statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    statCategory: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' },
    statMain: { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24, marginBottom: 4 },
    statSub:  { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
    captureBtn: {
        backgroundColor: '#1e5b43', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 18, borderRadius: 30,
        gap: 10, marginBottom: 16,
        shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
    },
    captureBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
    actionItem: {
        width: (width - 54) / 2, backgroundColor: '#fff', borderRadius: 24,
        padding: 20, alignItems: 'center', gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    actionIconBox: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
    },
    actionLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },

    adminBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
        marginBottom: 20, borderWidth: 1, borderColor: '#bbf7d0',
    },
    adminBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e5b43' },

    leafImageContainer: { width: '100%', height: 180, borderRadius: 24, overflow: 'hidden', position: 'relative' },
    leafImage: { width: '100%', height: '100%' },
    leafOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(30, 91, 67, 0.15)',
    },
});
