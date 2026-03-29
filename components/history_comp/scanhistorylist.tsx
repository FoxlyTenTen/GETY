import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

type DbStep = {
    id: string;
    step_order: number;
    title: string;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
};

type DbPlan = {
    id: string;
    overall_progress: number;
    expert_tip: string | null;
    treatment_plan_steps: DbStep[];
};

type DbScan = {
    id: string;
    disease_name: string;
    confidence_score: number;
    risk_level: 'low' | 'medium' | 'high';
    image_url: string | null;
    follow_up_days: number;
    scanned_at: string;
    recommendation_json: {
        what_to_do_next?: string[];
        keep_your_farm_safe?: { title: string; desc: string }[];
        follow_up_action?: string;
    } | null;
    tree: {
        id: string;
        label_name: string;
        latitude: number | null;
        longitude: number | null;
    } | null;
    treatment_plans: DbPlan[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const COLORS = {
    primary: '#1e5b43',
    card: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
};

// DB risk_level is lowercase; UI shows capitalised
function riskLabel(r: string) {
    return r.charAt(0).toUpperCase() + r.slice(1); // 'high' → 'High'
}
function riskColor(r: string) {
    return r === 'high' ? '#ef4444' : r === 'medium' ? '#f59e0b' : '#2eb86a';
}
function riskBg(r: string) {
    return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fff3e0' : '#dcfce7';
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

function groupScans(scans: DbScan[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { label: string; items: DbScan[] }[] = [
        { label: 'TODAY', items: [] },
        { label: 'THIS WEEK', items: [] },
        { label: 'EARLIER', items: [] },
    ];

    scans.forEach(scan => {
        const d = new Date(scan.scanned_at);
        if (d >= today) groups[0].items.push(scan);
        else if (d >= weekAgo) groups[1].items.push(scan);
        else groups[2].items.push(scan);
    });

    return groups.filter(g => g.items.length > 0);
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ScanHistoryList() {
    const router = useRouter();
    const [scans, setScans] = useState<DbScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            // Step 1: Get the current logged-in user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setScans([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Step 2: Get ALL tree IDs that belong to this user
            // .eq() on a direct column is always reliable
            const { data: userTrees, error: treeErr } = await supabase
                .from('trees')
                .select('id')
                .eq('user_uid', user.id);

            if (treeErr) throw treeErr;
            const treeIds = (userTrees ?? []).map((t: { id: string }) => t.id);

            if (treeIds.length === 0) {
                // User has no trees yet → no scans
                setScans([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Step 3: Fetch ALL scans for those trees
            // .in('tree_id', treeIds) reliably returns every matching row
            const { data, error: fetchErr } = await supabase
                .from('scans')
                .select(`
                    id,
                    disease_name,
                    confidence_score,
                    risk_level,
                    image_url,
                    follow_up_days,
                    scanned_at,
                    recommendation_json,
                    tree:trees (
                        id, label_name, latitude, longitude
                    ),
                    treatment_plans (
                        id, overall_progress, expert_tip,
                        treatment_plan_steps (
                            id, step_order, title, status
                        )
                    )
                `)
                .in('tree_id', treeIds)
                .order('scanned_at', { ascending: false });

            if (fetchErr) throw fetchErr;
            setScans((data as unknown as DbScan[]) ?? []);
        } catch (e: any) {
            console.error('[history] fetch error:', e?.message ?? e);
            setError(e?.message ?? 'Failed to load history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Reload every time the History tab comes into focus
    useFocusEffect(useCallback(() => {
        setLoading(true);
        load();
    }, [load]));

    const onRefresh = () => { setRefreshing(true); load(); };

    const handlePress = (item: DbScan) => {
        router.push({
            pathname: '/pages/detail_history' as any,
            params: { scanId: item.id },
        });
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.empty}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptyText}>Loading history...</Text>
            </View>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <View style={styles.empty}>
                <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Could not load history</Text>
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity onPress={load} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Empty ──────────────────────────────────────────────────────────────────
    if (scans.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="leaf-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Scans Yet</Text>
                <Text style={styles.emptyText}>Scan a leaf and save your report to build history.</Text>
            </View>
        );
    }

    const groups = groupScans(scans);

    // ✅ Use View, NOT ScrollView — the parent ScrollView in history.tsx handles scrolling.
    // A nested ScrollView with scrollEnabled={false} causes only the first card to be visible.
    return (
        <View>
            {groups.map(group => (
                <View key={group.label}>
                    <Text style={styles.sectionHeader}>{group.label}</Text>
                    <View style={styles.groupList}>
                        {group.items.map(item => (
                            <ScanCard key={item.id} item={item} onPress={() => handlePress(item)} />
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

// ─── Scan Card ──────────────────────────────────────────────────────────────────

function ScanCard({ item, onPress }: { item: DbScan; onPress: () => void }) {
    const plan = item.treatment_plans?.[0];
    const steps = (plan?.treatment_plan_steps ?? [])
        .sort((a, b) => a.step_order - b.step_order);
    const total = steps.length;
    const done = steps.filter(s => s.status === 'completed').length;
    const pct = total > 0 ? (done / total) * 100 : 0;
    const nextStep = steps.find(s => s.status !== 'completed');

    const tree = item.tree;
    const location = tree?.label_name || 'Unknown Plot';
    const hasGPS = !!(tree?.latitude && tree?.longitude);
    const scanDate = formatDate(item.scanned_at);

    // Get fungicide from recommendation_json if available (stored by analysis.tsx)
    // expert_tip format: "Apply Mancozeb 80WP (20L Water Mix) and re-scan in 14 days."
    const fungicide = plan?.expert_tip
        ? plan.expert_tip.replace(/^Apply /, '').split(' (')[0]
        : null;

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            {/* Image with risk badge */}
            <View style={styles.imageWrap}>
                <Image
                    source={item.image_url ? { uri: item.image_url } : require('@/assets/images/leaf.jpeg')}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
                <View style={[styles.riskBadge, { backgroundColor: riskBg(item.risk_level) }]}>
                    <Text style={[styles.riskText, { color: riskColor(item.risk_level) }]}>
                        {riskLabel(item.risk_level)}
                    </Text>
                </View>
            </View>

            {/* Card body */}
            <View style={styles.cardBody}>
                <View style={styles.topRow}>
                    <Text style={styles.diseaseName} numberOfLines={2}>{item.disease_name}</Text>
                    <View style={styles.confPill}>
                        <Text style={styles.confText}>{item.confidence_score}%</Text>
                    </View>
                </View>

                {/* Confidence bar */}
                <View style={styles.confBarBg}>
                    <View style={[styles.confBarFill, { width: `${item.confidence_score}%` as any }]} />
                </View>

                {/* Location */}
                <View style={styles.metaRow}>
                    <Ionicons
                        name={hasGPS ? 'location' : 'location-outline'}
                        size={12}
                        color={hasGPS ? COLORS.primary : COLORS.muted}
                    />
                    <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
                </View>

                {/* Scan date */}
                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
                    <Text style={styles.metaText}>{scanDate}</Text>
                </View>

                {/* Milestone progress bar */}
                {total > 0 && (
                    <View style={styles.progressSection}>
                        <View style={styles.progBg}>
                            <View style={[styles.progFill, { width: `${pct}%` as any }]} />
                        </View>
                        <View style={styles.progLabelRow}>
                            <Text style={styles.progLabel}>{done}/{total} milestones</Text>
                            {nextStep && (
                                <Text style={styles.nextText} numberOfLines={1}>
                                    Next: {nextStep.title}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Fungicide tag */}
                {fungicide && (
                    <View style={styles.fungRow}>
                        <MaterialCommunityIcons name="flask-outline" size={11} color={COLORS.primary} />
                        <Text style={styles.fungText} numberOfLines={1}>{fungicide}</Text>
                    </View>
                )}
            </View>

            <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </View>
        </TouchableOpacity>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
    emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: {
        backgroundColor: '#1e5b43', paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 20, marginTop: 8,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    sectionHeader: {
        fontSize: 11, fontWeight: '800', color: '#9ca3af',
        letterSpacing: 1.2, marginBottom: 12, marginTop: 4,
    },
    groupList: { gap: 14, marginBottom: 24 },

    card: {
        backgroundColor: COLORS.card, borderRadius: 24,
        flexDirection: 'row', overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    // Fixed height — '100%' inside a nested ScrollView resolves to full screen height
    imageWrap: { width: 90, height: 130 },
    cardImage: { width: 90, height: 130 },
    riskBadge: {
        position: 'absolute', top: 8, left: 8,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    riskText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

    cardBody: { flex: 1, padding: 14, gap: 5 },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    diseaseName: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
    confPill: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    confText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

    confBarBg: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
    confBarFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 4 },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, color: COLORS.muted, flex: 1 },

    progressSection: { marginTop: 2 },
    progBg: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden', marginBottom: 3 },
    progFill: { height: 5, backgroundColor: '#a8e6cf', borderRadius: 5 },
    progLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
    nextText: { fontSize: 10, color: COLORS.primary, fontWeight: '700', flex: 1, textAlign: 'right' },

    fungRow: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#f0fdf4', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
    },
    fungText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
    chevron: { alignSelf: 'center', paddingHorizontal: 10 },
});
