import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppHeader from '@/components/common/AppHeader';
import { useScan } from '@/context/ScanContext';

const { width } = Dimensions.get('window');

export default function Index() {
    const { history } = useScan();
    const [alertDismissed, setAlertDismissed] = useState(false);

    const latestScan = history[0];
    const totalRecords = history.length;
    const highRiskScan = history.find(s => s.risk === 'High');
    const currentStep = latestScan?.treatmentSteps.find(s => s.status === 'current');

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
                <Text style={styles.greeting}>Good Morning, Adli!</Text>
                <Text style={styles.greetingSub}>Your estate is looking healthy today.</Text>

                {/* ── Alert Banner (only for high-risk scans) ── */}
                {!alertDismissed && highRiskScan && (
                    <View style={styles.alertCard}>
                        <View style={styles.alertLeft}>
                            <Ionicons name="warning" size={16} color="#c62828" style={{ marginTop: 1 }} />
                            <View style={styles.alertText}>
                                <Text style={styles.alertTitle}>Action Required</Text>
                                <Text style={styles.alertBody}>
                                    {highRiskScan.diseaseName} detected at {highRiskScan.location}. Review scan records immediately.
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
                        <Text style={styles.diagnosisLabel}>Recent Diagnosis</Text>
                        <Text style={styles.diagnosisName}>
                            {latestScan ? latestScan.diseaseName : 'No scans yet'}
                        </Text>
                        <Text style={styles.diagnosisTime}>
                            {latestScan ? `Scanned on ${latestScan.scanDate}` : 'Start scanning to see results'}
                        </Text>
                    </View>
                    <View style={styles.diagnosisIcon}>
                        <MaterialCommunityIcons name="leaf" size={32} color="#a8e6cf" />
                    </View>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    {/* Milestone */}
                    <View style={styles.statCard}>
                        <View style={styles.statIconRow}>
                            <MaterialCommunityIcons name="calendar-check" size={18} color="#235e45" />
                            <Text style={styles.statCategory}>MILESTONE</Text>
                        </View>
                        <Text style={styles.statMain} numberOfLines={2}>
                            {currentStep ? currentStep.title : 'No active task'}
                        </Text>
                        <Text style={styles.statSub}>
                            {currentStep?.date ? `Due ${currentStep.date}` : 'All steps up to date'}
                        </Text>
                    </View>

                    {/* Records */}
                    <View style={styles.statCard}>
                        <View style={styles.statIconRow}>
                            <MaterialCommunityIcons name="chart-bar" size={18} color="#235e45" />
                            <Text style={styles.statCategory}>RECORDS</Text>
                        </View>
                        <Text style={[styles.statMain, { fontSize: 36 }]}>{totalRecords}</Text>
                        <Text style={styles.statSub}>Total past scans</Text>
                    </View>
                </View>

                {/* ── Quick Actions ── */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                {/* Primary CTA */}
                <TouchableOpacity
                    style={styles.captureBtn}
                    activeOpacity={0.88}
                    onPress={() => router.push('/pages/scanpage')}
                >
                    <Ionicons name="camera" size={22} color="#fff" />
                    <Text style={styles.captureBtnText}>Capture Image</Text>
                </TouchableOpacity>

                {/* 2×2 Action Grid */}
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionItem} activeOpacity={0.75}>
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="file-image-outline" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>Upload Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.75}
                        onPress={() => router.push('/(tabs)/assistant')}
                    >
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="robot-outline" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>AI Assistant</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.75}
                        onPress={() => router.push('/(tabs)/history')}
                    >
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="history" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>History</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.75}
                        onPress={() => router.push('/(tabs)/reminder')}
                    >
                        <View style={styles.actionIconBox}>
                            <MaterialCommunityIcons name="flag-checkered" size={24} color="#374151" />
                        </View>
                        <Text style={styles.actionLabel}>Milestones</Text>
                    </TouchableOpacity>
                </View>

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

    // Greeting
    greeting: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 6 },
    greetingSub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

    // Alert
    alertCard: {
        backgroundColor: '#fff3f3',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    alertLeft: { flexDirection: 'row', gap: 10, flex: 1 },
    alertText: { flex: 1 },
    alertTitle: { fontSize: 13, fontWeight: '800', color: '#c62828', marginBottom: 4 },
    alertBody: { fontSize: 13, color: '#374151', lineHeight: 20 },
    alertClose: { padding: 4, marginLeft: 8 },

    // Recent Diagnosis
    diagnosisCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    diagnosisLeft: { flex: 1 },
    diagnosisLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    diagnosisName: { fontSize: 20, fontWeight: '800', color: '#235e45', marginBottom: 4 },
    diagnosisTime: { fontSize: 12, color: '#9ca3af' },
    diagnosisIcon: {
        width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0fdf4',
        alignItems: 'center', justifyContent: 'center',
    },

    // Stats
    statsRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
    statCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    },
    statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    statCategory: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' },
    statMain: { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24, marginBottom: 4 },
    statSub: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

    // Quick Actions
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
    captureBtn: {
        backgroundColor: '#1e5b43', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 18, borderRadius: 30,
        gap: 10, marginBottom: 16,
        shadowColor: '#1e5b43', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
    },
    captureBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
    actionItem: { width: (width - 54) / 2, backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    actionIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },

    // Leaf Image
    leafImageContainer: {
        width: '100%', height: 180, borderRadius: 24, overflow: 'hidden', position: 'relative',
    },
    leafImage: { width: '100%', height: '100%' },
    leafOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(30, 91, 67, 0.15)',
    },
});
