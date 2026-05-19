import React, { useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    RefreshControl, Dimensions, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import AppHeader from '@/components/common/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { QUERY_KEYS, fetchAdminStats } from '@/lib/queries';

const { width } = Dimensions.get('window');
const PRIMARY = '#1e5b43';

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const { isAdmin } = useAuth();

    const { data, isLoading, isRefetching, refetch } = useQuery({
        queryKey: QUERY_KEYS.adminStats(),
        queryFn: fetchAdminStats,
        enabled: isAdmin,
    });

    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    if (!isAdmin) return null;

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar style="dark" />
                <AppHeader title="Admin Dashboard" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={styles.loadingText}>Loading analytics...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const stats = data!;
    const riskTotal = stats.riskDistribution.low + stats.riskDistribution.medium + stats.riskDistribution.high || 1;
    const maxDisease = Math.max(...stats.diseaseDistribution.map(d => d.count), 1);
    const maxScan = Math.max(...stats.recentScans.map(r => r.count), 1);
    const maxUser = Math.max(...stats.userGrowth.map(u => u.count), 1);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar style="dark" />
            <AppHeader title="Admin Dashboard" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
            >
                {/* ── Overview Metrics ── */}
                <Text style={styles.sectionLabel}>OVERVIEW</Text>
                <View style={styles.metricsGrid}>
                    <MetricCard label="Total Users" value={stats.totalUsers} icon="people" color="#3b82f6" bg="#eff6ff" />
                    <MetricCard label="Total Scans" value={stats.totalScans} icon="scan" color={PRIMARY} bg="#f0fdf4" />
                    <MetricCard label="Avg Confidence" value={`${stats.avgConfidence}%`} icon="analytics" color="#f59e0b" bg="#fffbeb" />
                    <MetricCard label="KB Documents" value={stats.kbDocuments} icon="documents" color="#8b5cf6" bg="#f5f3ff" />
                </View>

                {/* ── Risk Breakdown ── */}
                <Text style={styles.sectionLabel}>RISK BREAKDOWN</Text>
                <View style={styles.card}>
                    <RiskBar label="Low" count={stats.riskDistribution.low} total={riskTotal} color="#2eb86a" bg="#dcfce7" />
                    <RiskBar label="Medium" count={stats.riskDistribution.medium} total={riskTotal} color="#f59e0b" bg="#fff3e0" />
                    <RiskBar label="High" count={stats.riskDistribution.high} total={riskTotal} color="#ef4444" bg="#fee2e2" />
                </View>

                {/* ── Scans Per Day ── */}
                <Text style={styles.sectionLabel}>SCANS — LAST 7 DAYS</Text>
                <View style={styles.card}>
                    <BarGroup
                        items={stats.recentScans.map(r => ({ label: r.date, value: r.count }))}
                        max={maxScan}
                        color={PRIMARY}
                    />
                </View>

                {/* ── Disease Distribution ── */}
                {stats.diseaseDistribution.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>DISEASE DISTRIBUTION</Text>
                        <View style={styles.card}>
                            <BarGroup
                                items={stats.diseaseDistribution.map(d => ({
                                    label: d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name,
                                    value: d.count,
                                }))}
                                max={maxDisease}
                                color="#8b5cf6"
                            />
                        </View>
                    </>
                )}

                {/* ── User Growth ── */}
                <Text style={styles.sectionLabel}>USER GROWTH — LAST 6 MONTHS</Text>
                <View style={styles.card}>
                    <BarGroup
                        items={stats.userGrowth.map(u => ({ label: u.month, value: u.count }))}
                        max={maxUser}
                        color="#3b82f6"
                    />
                </View>

                {/* ── KB Shortcut ── */}
                <TouchableOpacity
                    style={styles.kbBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push('/admin/knowledge-base-upload' as any)}
                >
                    <Ionicons name="cloud-upload-outline" size={20} color={PRIMARY} />
                    <Text style={styles.kbBtnText}>Manage Knowledge Base</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, color, bg }: {
    label: string; value: number | string; icon: any; color: string; bg: string;
}) {
    return (
        <View style={[styles.metricCard, { backgroundColor: bg }]}>
            <View style={[styles.metricIconBox, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.metricValue, { color }]}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function RiskBar({ label, count, total, color, bg }: {
    label: string; count: number; total: number; color: string; bg: string;
}) {
    const pct = Math.round((count / total) * 100);
    return (
        <View style={styles.riskRow}>
            <Text style={styles.riskLabel}>{label}</Text>
            <View style={styles.riskTrack}>
                <View style={[styles.riskFill, { width: `${pct}%` as any, backgroundColor: color }]} />
            </View>
            <View style={[styles.riskPill, { backgroundColor: bg }]}>
                <Text style={[styles.riskPct, { color }]}>{count} ({pct}%)</Text>
            </View>
        </View>
    );
}

function BarGroup({ items, max, color }: { items: { label: string; value: number }[]; max: number; color: string }) {
    const BAR_HEIGHT = 120;
    return (
        <View style={barStyles.container}>
            {items.map((item, i) => {
                const fillPct = max > 0 ? item.value / max : 0;
                const barH = Math.max(fillPct * BAR_HEIGHT, item.value > 0 ? 4 : 0);
                return (
                    <View key={i} style={barStyles.col}>
                        <Text style={barStyles.valLabel}>{item.value > 0 ? item.value : ''}</Text>
                        <View style={[barStyles.track, { height: BAR_HEIGHT }]}>
                            <View style={[barStyles.fill, { height: barH, backgroundColor: color }]} />
                        </View>
                        <Text style={barStyles.axisLabel} numberOfLines={1}>{item.label}</Text>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe:  { flex: 1, backgroundColor: '#f8faf9' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#9ca3af' },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: '#9ca3af',
        letterSpacing: 1.2, marginBottom: 12, marginTop: 20,
    },

    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: {
        width: (width - 52) / 2, borderRadius: 20, padding: 16,
        alignItems: 'flex-start', gap: 6,
    },
    metricIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    metricValue: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
    metricLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 14,
    },

    riskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    riskLabel: { width: 52, fontSize: 13, fontWeight: '700', color: '#374151' },
    riskTrack: { flex: 1, height: 10, backgroundColor: '#f3f4f6', borderRadius: 8, overflow: 'hidden' },
    riskFill: { height: 10, borderRadius: 8 },
    riskPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    riskPct: { fontSize: 11, fontWeight: '700' },

    kbBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
        marginTop: 20, borderWidth: 1, borderColor: '#bbf7d0',
    },
    kbBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: PRIMARY },
});

const barStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    col: { flex: 1, alignItems: 'center', gap: 4 },
    valLabel: { fontSize: 10, fontWeight: '700', color: '#374151', minHeight: 14 },
    track: { width: '100%', backgroundColor: '#f3f4f6', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    fill: { width: '100%', borderRadius: 6 },
    axisLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
});
