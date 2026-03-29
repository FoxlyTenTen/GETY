import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { useScan, DEFAULT_SCAN, ScanResult } from '@/context/ScanContext';

const COLORS = {
    primary: '#1e5b43',
    background: '#f8faf9',
    textMain: '#1a1a1a',
    textMuted: '#6b7280',
    cardBg: '#ffffff',
    dangerBg: '#ffebee',
    dangerText: '#c62828',
    iconBgGreen: '#a8e6cf',
    iconBgOrange: '#fcece3',
    orangeText: '#a4715c',
    grayBg: '#f6f6f6',
    followUpBg: '#e8f5e9',
};

// Helper: build treatment steps from a day plan duration
function buildSteps(dayPlan: number) {
    const today = new Date();
    const addDays = (d: number): string => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + d);
        return dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }); // e.g. "28 Mar"
    };
    return [
        { id: 1, title: 'Initial Application',   desc: 'Apply first fungicide spray at full dose.',         status: 'current'  as const, date: addDays(0) },
        { id: 2, title: 'Secondary Spray',        desc: 'Follow-up spray. Check leaf coverage.',             status: 'upcoming' as const, date: addDays(Math.floor(dayPlan * 0.3)) },
        { id: 3, title: 'Observation Period',     desc: 'Monitor leaf recovery and note progress.',          status: 'upcoming' as const, date: addDays(Math.floor(dayPlan * 0.6)) },
        { id: 4, title: 'Final Assessment',       desc: 'Final check — verify tree health status.',          status: 'upcoming' as const, date: addDays(dayPlan) },
    ];
}

// ── Pure local mockup disease data ──────────────────────────────────────────────
// Replace this with real AI/model output when integrating
const MOCKUP_DISEASE_DATA = [
    {
        name: 'Pestalotiopsis Leaf Fall',
        risk_level: 'High' as const,
        description: 'Circular brown spots detected on the leaves. This is Pestalotiopsis, a common fungus that causes early leaf fall, reducing latex yield significantly.',
        what_to_do: [
            'Prune infected branches immediately and burn them away from the estate.',
            'Apply copper-based fungicide spray during the next dry spell.',
            'Isolate affected trees to prevent spread to neighbouring rows.',
        ],
        prevention_tips: [
            { title: 'Water Drainage', desc: 'Ensure good drainage in low-lying areas to prevent waterlogging.' },
            { title: 'Tree Spacing', desc: 'Maintain 5–6 m spacing to allow airflow between canopies.' },
        ],
        recommended_fungicide: 'Mancozeb 80WP',
        water_mix_ratio: '20L Water Mix',
        default_day_plan: 14,
        follow_up_days: 14,
    },
    {
        name: 'Rubber Powdery Mildew',
        risk_level: 'Medium' as const,
        description: 'White powdery coating detected on leaf surfaces. Likely Oidium heveae affecting the upper canopy. Early intervention can prevent yield loss.',
        what_to_do: [
            'Apply wettable sulfur or trifloxystrobin fungicide immediately.',
            'Avoid overhead irrigation to reduce leaf surface moisture.',
            'Remove heavily affected leaves before treatment.',
        ],
        prevention_tips: [
            { title: 'Humidity Control', desc: 'Improve ventilation to reduce canopy humidity.' },
            { title: 'Monitoring', desc: 'Scout weekly during high-humidity periods.' },
        ],
        recommended_fungicide: 'Sulfur 80WP',
        water_mix_ratio: '15L Water Mix',
        default_day_plan: 10,
        follow_up_days: 10,
    },
    {
        name: 'Phytophthora Leaf Blight',
        risk_level: 'High' as const,
        description: 'Dark water-soaked lesions found on leaves and young shoots. Phytophthora thrives in wet conditions and spreads rapidly through rain splash.',
        what_to_do: [
            'Apply phosphonate-based systemic fungicide to all affected trees.',
            'Remove and destroy fallen leaves from the base of trees.',
            'Avoid working in affected areas during rainy weather.',
        ],
        prevention_tips: [
            { title: 'Drainage', desc: 'Ensure water does not pool at the base of trees.' },
            { title: 'Ground Cover', desc: 'Use mulch to prevent rain splash from infecting lower leaves.' },
        ],
        recommended_fungicide: 'Fosetyl-Al 80WP',
        water_mix_ratio: '25L Water Mix',
        default_day_plan: 21,
        follow_up_days: 21,
    },
    {
        name: 'Colletotrichum Leaf Disease',
        risk_level: 'Low' as const,
        description: 'Small anthracnose lesions observed on young leaves. Colletotrichum infection is common during wet re-foliation periods but manageable with timely treatment.',
        what_to_do: [
            'Spray with carbendazim or thiophanate-methyl during re-foliation.',
            'Collect and burn fallen infected leaves.',
        ],
        prevention_tips: [
            { title: 'Timing', desc: 'Schedule fungicide application before the re-foliation flush.' },
            { title: 'Spacing', desc: 'Maintain open canopy to reduce moisture retention.' },
        ],
        recommended_fungicide: 'Carbendazim 50WP',
        water_mix_ratio: '10L Water Mix',
        default_day_plan: 7,
        follow_up_days: 7,
    },
];

export default function AnalysisPage() {
    const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
    const { setCurrentScan, saveToHistory } = useScan();

    // ── Pure mockup — randomly pick a disease from local data ─────────────────
    const [mockResult, setMockResult] = useState<ScanResult>({
        ...DEFAULT_SCAN,
        id: `scan-${Date.now()}`,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Pick a random mockup disease (replace with real ML result later)
        const diseaseData = MOCKUP_DISEASE_DATA[Math.floor(Math.random() * MOCKUP_DISEASE_DATA.length)];
        const confidence = Math.floor(Math.random() * 15) + 82; // 82–96%
        const steps = buildSteps(diseaseData.default_day_plan);

        setMockResult({
            id: `scan-${Date.now()}`,
            diseaseName: diseaseData.name,
            confidence,
            risk: diseaseData.risk_level,
            description: diseaseData.description,
            whatToDo: diseaseData.what_to_do,
            preventionTips: diseaseData.prevention_tips,
            fungicide: diseaseData.recommended_fungicide,
            waterMix: diseaseData.water_mix_ratio,
            dayPlan: diseaseData.default_day_plan,
            followUpDays: diseaseData.follow_up_days,
            treatmentSteps: steps,
            imageUri: imageUri || undefined,
            scanDate: new Date().toLocaleDateString('en-MY', {
                day: 'numeric', month: 'short', year: 'numeric',
            }),
            location: '', // will be set by user via label input
        });
    }, []);

    // ── GPS State ────────────────────────────────────────────────────────────
    const [gpsLoading, setGpsLoading] = useState(false);
    const [scanLat, setScanLat] = useState<number | undefined>(undefined);
    const [scanLng, setScanLng] = useState<number | undefined>(undefined);
    const [scanAddress, setScanAddress] = useState<string | undefined>(undefined);
    const [locationLabel, setLocationLabel] = useState(''); // user-typed plot label

    const handleCaptureGPS = async () => {
        setGpsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Location permission is required to tag this scan.');
                setGpsLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setScanLat(loc.coords.latitude);
            setScanLng(loc.coords.longitude);
            const [place] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            if (place) {
                const label = [
                    place.street, place.district, place.city, place.region,
                ].filter(Boolean).join(', ');
                setScanAddress(label || 'Unknown location');
            }
        } catch {
            alert('Unable to get location. Please ensure GPS is enabled.');
        } finally {
            setGpsLoading(false);
        }
    };

    // Final scan result (merged with GPS)
    const scanResult: ScanResult = {
        ...mockResult,
        imageUri: imageUri || undefined,
        scanLat,
        scanLng,
        scanAddress,
        // Use user-typed label if provided, else fall back to GPS address, else default
        location: locationLabel.trim() || scanAddress || 'Unknown Plot',
    };

    const handleConvertPlan = () => {
        setCurrentScan(scanResult);
        router.push('/pages/treatment');
    };

    const handleSaveReport = async () => {
        setSaving(true);
        try {
            // Save to ScanContext (local in-session storage)
            setCurrentScan(scanResult);
            saveToHistory(scanResult);

            // TODO: When ready, add your Supabase save logic here.
            // Import { supabase } from '@/lib/supabase' and call your insert queries.

            Alert.alert(
                '✅ Report Saved',
                'Your scan was saved locally. View your treatment milestones now?',
                [
                    {
                        text: 'View Milestones',
                        onPress: () => {
                            router.replace('/(tabs)/reminder' as any);
                        },
                    },
                    {
                        text: 'Go Home',
                        style: 'cancel',
                        onPress: () => router.replace('/' as any),
                    },
                ]
            );
        } catch (e: any) {
            console.error('handleSaveReport error:', e?.message ?? e);
            Alert.alert('Error', 'Failed to save report. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const result = scanResult;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Ionicons name="leaf" size={20} color={COLORS.primary} />
                    <Text style={styles.logoText}>LatexGuard</Text>
                </View>
                <TouchableOpacity style={styles.bellButton}>
                    <Ionicons name="notifications" size={20} color={COLORS.textMain} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Top Section */}
                <View style={styles.topSection}>
                    <View style={styles.assistantIconContainer}>
                        <MaterialCommunityIcons name="robot" size={28} color="#fff" />
                    </View>
                    <View style={styles.topTextContent}>
                        <Text style={styles.title}>Treatment Plan Prepared</Text>
                        <Text style={styles.subtitle}>Our smart assistant has analyzed your rubber tree scan.</Text>
                    </View>
                </View>

                <View style={styles.dangerBadge}>
                    <Ionicons name="warning" size={14} color={COLORS.dangerText} />
                    <Text style={styles.dangerBadgeText}>{result.diseaseName} Found</Text>
                </View>

                {/* Section 1: What disease is this? */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgGreen }]}>
                            <Ionicons name="folder" size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.cardTitle}>What disease is this?</Text>
                    </View>
                    <Text style={styles.cardText}>{result.description}</Text>
                    <Image
                        source={imageUri ? { uri: imageUri } : require('@/assets/images/leaf.jpeg')}
                        style={styles.leafImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Section 2: What to do next */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgOrange }]}>
                            <MaterialCommunityIcons name="clipboard-check" size={16} color={COLORS.orangeText} />
                        </View>
                        <Text style={styles.cardTitle}>What to do next</Text>
                    </View>

                    {result.whatToDo.map((step, idx) => (
                        <View key={idx} style={styles.stepItem}>
                            <View style={styles.stepCircle}>
                                <Text style={styles.stepNumber}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                        </View>
                    ))}
                </View>

                {/* Section 3: Keep your farm safe */}
                <View style={styles.grayCard}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgOrange }]}>
                            <MaterialCommunityIcons name="shield-half-full" size={18} color={COLORS.orangeText} />
                        </View>
                        <Text style={styles.cardTitle}>Keep your farm safe</Text>
                    </View>

                    <View style={styles.gridRow}>
                        {result.preventionTips.map((tip, idx) => (
                            <View key={idx} style={styles.gridItem}>
                                <MaterialCommunityIcons
                                    name={idx === 0 ? 'water-outline' : 'map-marker-radius'}
                                    size={22}
                                    color={COLORS.primary}
                                    style={{ marginBottom: 12 }}
                                />
                                <Text style={styles.gridTitle}>{tip.title}</Text>
                                <Text style={styles.gridDesc}>{tip.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Section 4: FOLLOW-UP ACTION */}
                <View style={styles.followUpCard}>
                    <View style={styles.followUpHeader}>
                        <MaterialCommunityIcons name="calendar-check" size={16} color={COLORS.primary} />
                        <Text style={styles.followUpTitle}>FOLLOW-UP ACTION</Text>
                    </View>
                    <Text style={styles.followUpText}>
                        Scan these specific trees again in {result.followUpDays} days to monitor healing progress.
                    </Text>
                </View>

                {/* ── GPS Location Tag ── */}
                <View style={styles.gpsCard}>
                    <View style={styles.gpsCardHeader}>
                        <View style={styles.gpsIconBox}>
                            <Ionicons name="location" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.gpsHeaderText}>
                            <Text style={styles.gpsTitle}>Tree Location Tag</Text>
                            <Text style={styles.gpsSubtitle}>Pin the exact GPS coordinates of this tree</Text>
                        </View>
                    </View>

                    {scanLat && scanLng ? (
                        // Location captured — show result
                        <View style={styles.gpsCaptured}>
                            <View style={styles.gpsCoordRow}>
                                <View style={styles.gpsCoordItem}>
                                    <Text style={styles.gpsCoordLabel}>LATITUDE</Text>
                                    <Text style={styles.gpsCoordValue}>{scanLat.toFixed(6)}</Text>
                                </View>
                                <View style={styles.gpsCoordDivider} />
                                <View style={styles.gpsCoordItem}>
                                    <Text style={styles.gpsCoordLabel}>LONGITUDE</Text>
                                    <Text style={styles.gpsCoordValue}>{scanLng.toFixed(6)}</Text>
                                </View>
                            </View>
                            {scanAddress && (
                                <View style={styles.gpsAddressRow}>
                                    <Ionicons name="map-outline" size={14} color={COLORS.textMuted} />
                                    <Text style={styles.gpsAddressText}>{scanAddress}</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.gpsRetapBtn}
                                onPress={handleCaptureGPS}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="refresh" size={14} color={COLORS.primary} />
                                <Text style={styles.gpsRetapText}>Re-capture location</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // No location yet — show capture button
                        <TouchableOpacity
                            style={styles.gpsCaptureBtn}
                            onPress={handleCaptureGPS}
                            activeOpacity={0.85}
                            disabled={gpsLoading}
                        >
                            {gpsLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="locate" size={20} color="#fff" />
                            )}
                            <Text style={styles.gpsCaptureBtnText}>
                                {gpsLoading ? 'Getting location...' : 'Tap to Tag GPS Location'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Plot Label Input ── */}
                <View style={styles.labelCard}>
                    <View style={styles.labelHeader}>
                        <View style={styles.gpsIconBox}>
                            <Ionicons name="pricetag" size={16} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.gpsTitle}>Plot / Tree Label</Text>
                            <Text style={styles.gpsSubtitle}>Enter a name to identify this tree or plot</Text>
                        </View>
                    </View>
                    <TextInput
                        style={styles.labelInput}
                        placeholder="e.g. North Plot B-12, Plot A Section 3..."
                        placeholderTextColor="#9ca3af"
                        value={locationLabel}
                        onChangeText={setLocationLabel}
                        maxLength={60}
                        returnKeyType="done"
                    />
                    {locationLabel.trim().length > 0 && (
                        <View style={styles.labelPreview}>
                            <Ionicons name="checkmark-circle" size={14} color="#2eb86a" />
                            <Text style={styles.labelPreviewText}>Will be saved as: "{locationLabel.trim()}"</Text>
                        </View>
                    )}
                </View>

                {/* Confidence Row */}
                <View style={styles.confidenceRow}>
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>Confidence</Text>
                        <Text style={styles.confidenceValue}>{result.confidence}%</Text>
                    </View>
                    <View style={styles.confidenceDivider} />
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>Risk Level</Text>
                        <Text style={[styles.confidenceValue, { color: result.risk === 'High' ? '#c62828' : result.risk === 'Medium' ? '#f59e0b' : '#2eb86a' }]}>
                            {result.risk}
                        </Text>
                    </View>
                    <View style={styles.confidenceDivider} />
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>Treatment</Text>
                        <Text style={styles.confidenceValue}>{result.dayPlan} Days</Text>
                    </View>
                </View>

                <View style={{ height: 16 }} />

                {/* Action Buttons */}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleConvertPlan} activeOpacity={0.9}>
                    <MaterialCommunityIcons name="playlist-edit" size={24} color="#fff" />
                    <Text style={styles.primaryBtnText}>Convert to Milestone Plan</Text>
                </TouchableOpacity>

                <View style={styles.secondaryBtnRow}>
                    <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: COLORS.iconBgOrange }]} onPress={handleSaveReport} activeOpacity={0.8} disabled={saving}>
                        <MaterialCommunityIcons name="bookmark" size={18} color={COLORS.orangeText} />
                        <Text style={[styles.secondaryBtnText, { color: COLORS.orangeText }]}>
                            {saving ? 'Saving...' : 'Save Report'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: '#e5e7eb' }]} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="chat-processing" size={18} color={COLORS.textMain} />
                        <Text style={[styles.secondaryBtnText, { color: COLORS.textMain }]}>Ask AI</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
    },
    bellButton: {
        padding: 5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
    },
    assistantIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topTextContent: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#000',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        lineHeight: 20,
    },
    dangerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.dangerBg,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        gap: 8,
        marginBottom: 24,
    },
    dangerBadgeText: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.dangerText,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    grayCard: {
        backgroundColor: COLORS.grayBg,
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
    },
    cardText: {
        fontSize: 14,
        color: COLORS.textMain,
        lineHeight: 24,
        marginBottom: 16,
    },
    leafImage: {
        width: '100%',
        height: 160,
        borderRadius: 12,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 20,
    },
    stepCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    stepNumber: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textMain,
        lineHeight: 22,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    gridItem: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
    },
    gridTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#000',
        marginBottom: 6,
    },
    gridDesc: {
        fontSize: 12,
        color: COLORS.textMuted,
        lineHeight: 18,
    },
    followUpCard: {
        backgroundColor: COLORS.followUpBg,
        borderLeftWidth: 4,
        borderColor: COLORS.primary,
        borderRadius: 20,
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
        padding: 20,
        marginBottom: 24,
    },
    followUpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    followUpTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    followUpText: {
        fontSize: 14,
        color: COLORS.textMain,
        lineHeight: 22,
    },
    confidenceRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    confidenceItem: {
        flex: 1,
        alignItems: 'center',
    },
    confidenceDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#e5e7eb',
    },
    confidenceLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    confidenceValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#000',
    },
    primaryBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        gap: 10,
        marginBottom: 16,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtnRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '800',
    },

    // ── GPS Card Styles ────────────────────────────────────────────────────────
    gpsCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    gpsCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    gpsIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#e8f5e9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gpsHeaderText: { flex: 1 },
    gpsTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
    gpsSubtitle: { fontSize: 12, color: COLORS.textMuted },
    gpsCaptureBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 10,
    },
    gpsCaptureBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    gpsCaptured: {
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        padding: 16,
    },
    gpsCoordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    gpsCoordItem: { flex: 1, alignItems: 'center' },
    gpsCoordLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    gpsCoordValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary,
        fontVariant: ['tabular-nums'],
    },
    gpsCoordDivider: { width: 1, height: 36, backgroundColor: '#c6f6d5' },
    gpsAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    gpsAddressText: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
    gpsRetapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderColor: '#c6f6d5',
        marginTop: 4,
    },
    gpsRetapText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

    // Plot label input card
    labelCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    labelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    labelInput: {
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
        color: '#111827',
        fontWeight: '500',
    },
    labelPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingHorizontal: 4,
    },
    labelPreviewText: { fontSize: 12, color: '#2eb86a', fontWeight: '600', flex: 1 },
});
