import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useScan, ScanRecord } from '@/context/ScanContext';

/* ─────────────────────────────────────────────────────────────────────────────
   DATA SOURCE: Local ScanContext history (in-memory, populated when user saves a scan).
   TODO: Replace useScan() with a Supabase fetch when ready to connect the database.
───────────────────────────────────────────────────────────────────────────── */

const COLORS = {
    primary: '#1e5b43',
    card: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
};

function riskColor(risk: string) {
    return risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#2eb86a';
}
function riskBg(risk: string) {
    return risk === 'High' ? '#fee2e2' : risk === 'Medium' ? '#fff3e0' : '#dcfce7';
}

function groupScans(scans: ScanRecord[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { label: string; items: ScanRecord[] }[] = [
        { label: 'TODAY', items: [] },
        { label: 'THIS WEEK', items: [] },
        { label: 'EARLIER', items: [] },
    ];

    scans.forEach(scan => {
        const d = new Date(scan.savedAt);
        if (d >= today) groups[0].items.push(scan);
        else if (d >= weekAgo) groups[1].items.push(scan);
        else groups[2].items.push(scan);
    });

    return groups.filter(g => g.items.length > 0);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ScanHistoryList() {
    const router = useRouter();
    const { history } = useScan();

    const handlePress = (item: ScanRecord) => {
        router.push({
            pathname: '/pages/detail_history' as any,
            params: { scanId: item.id },
        });
    };

    if (history.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="leaf-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Scans Yet</Text>
                <Text style={styles.emptyText}>Scan a leaf and save your report to build history.</Text>
            </View>
        );
    }

    const groups = groupScans(history);

    return (
        <ScrollView scrollEnabled={false}>
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
        </ScrollView>
    );
}

// ── Scan Card ──────────────────────────────────────────────────────────────────

function ScanCard({ item, onPress }: { item: ScanRecord; onPress: () => void }) {
    const steps    = item.treatmentSteps ?? [];
    const total    = steps.length;
    const done     = steps.filter(s => s.status === 'completed').length;
    const pct      = total > 0 ? (done / total) * 100 : 0;
    const nextStep = steps.find(s => s.status !== 'completed');

    const diseaseName = item.diseaseName ?? 'Unknown Disease';
    const risk        = item.risk;
    const location    = item.scanAddress || item.location || 'Unknown Plot';
    const hasGPS      = !!(item.scanLat && item.scanLng);
    const scanDate    = item.scanDate;
    const fungicide   = item.fungicide;

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            {/* Image with risk badge overlay */}
            <View style={styles.imageWrap}>
                <Image
                    source={item.imageUri ? { uri: item.imageUri } : require('@/assets/images/leaf.jpeg')}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
                <View style={[styles.riskBadge, { backgroundColor: riskBg(risk) }]}>
                    <Text style={[styles.riskText, { color: riskColor(risk) }]}>{risk}</Text>
                </View>
            </View>

            {/* Card body */}
            <View style={styles.cardBody}>
                <View style={styles.topRow}>
                    <Text style={styles.diseaseName} numberOfLines={2}>{diseaseName}</Text>
                    <View style={styles.confPill}>
                        <Text style={styles.confText}>{item.confidence}%</Text>
                    </View>
                </View>

                {/* Confidence bar */}
                <View style={styles.confBarBg}>
                    <View style={[styles.confBarFill, { width: `${item.confidence}%` as any }]} />
                </View>

                {/* Location */}
                <View style={styles.metaRow}>
                    <Ionicons name={hasGPS ? 'location' : 'location-outline'} size={12}
                        color={hasGPS ? COLORS.primary : COLORS.muted} />
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

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
    emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 32 },
    sectionHeader: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.2, marginBottom: 12, marginTop: 4 },
    groupList: { gap: 14, marginBottom: 24 },

    card: {
        backgroundColor: COLORS.card, borderRadius: 24,
        flexDirection: 'row', overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    imageWrap: { width: 90, position: 'relative' },
    cardImage: { width: 90, height: '100%' as any, minHeight: 160 },
    riskBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
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
