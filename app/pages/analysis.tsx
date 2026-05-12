import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { useScan, ScanResult, TreatmentStep } from '@/context/ScanContext';
import { supabase } from '@/lib/supabase';

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

// ── Date helper ──────────────────────────────────────────────────────────────
function formatDateOffset(daysFromNow: number): string {
    const dt = new Date();
    dt.setDate(dt.getDate() + daysFromNow);
    return dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

// ── Fallback steps (used for Healthy class or when /generate-milestones fails) ─
function buildFallbackSteps(dayPlan: number): TreatmentStep[] {
    return [
        { id: 1, title: 'Initial Application',  desc: 'Apply first fungicide spray at full dose.',        status: 'current',  date: formatDateOffset(0) },
        { id: 2, title: 'Secondary Spray',       desc: 'Follow-up spray. Check leaf coverage.',            status: 'upcoming', date: formatDateOffset(Math.floor(dayPlan * 0.3)) },
        { id: 3, title: 'Observation Period',    desc: 'Monitor leaf recovery and note progress.',         status: 'upcoming', date: formatDateOffset(Math.floor(dayPlan * 0.6)) },
        { id: 4, title: 'Final Assessment',      desc: 'Final check — verify tree health status.',         status: 'upcoming', date: formatDateOffset(dayPlan) },
    ];
}

// ── Static fallback data (shown immediately while RAG loads, or if RAG fails) ─
type StaticEntry = {
    name: string; risk_level: 'Low' | 'Medium' | 'High';
    description: string; what_to_do: string[];
    prevention_tips: { title: string; desc: string }[];
    recommended_fungicide: string; water_mix_ratio: string;
    default_day_plan: number; follow_up_days: number;
};
const STATIC_FALLBACK: Record<string, StaticEntry> = {
    Bird_Eye_Spot: {
        name: 'Bird Eye Spot', risk_level: 'Medium',
        description: 'Small circular lesions with dark brown centres and yellow halos. Triggered by rain and humid conditions during refoliation.',
        what_to_do: ['Apply copper oxychloride or mancozeb during early leaf flush.', 'Collect and destroy fallen infected leaves.', 'Avoid overhead irrigation that prolongs leaf wetness.'],
        prevention_tips: [{ title: 'Leaf Flush Timing', desc: 'Monitor closely during refoliation when leaves are most vulnerable.' }, { title: 'Canopy Airflow', desc: 'Prune to open the canopy and reduce humidity.' }],
        recommended_fungicide: 'Copper Oxychloride 50WP', water_mix_ratio: '20L Water Mix', default_day_plan: 14, follow_up_days: 14,
    },
    Colletotrichum: {
        name: 'Colletotrichum (Anthracnose)', risk_level: 'Low',
        description: 'Small anthracnose lesions on young leaves. Common during wet refoliation periods but manageable with timely treatment.',
        what_to_do: ['Spray with carbendazim or thiophanate-methyl during refoliation.', 'Collect and burn fallen infected leaves.', 'Monitor new flushes closely during wet season.'],
        prevention_tips: [{ title: 'Timing', desc: 'Schedule fungicide before the refoliation flush.' }, { title: 'Spacing', desc: 'Maintain open canopy to reduce moisture retention.' }],
        recommended_fungicide: 'Carbendazim 50WP', water_mix_ratio: '10L Water Mix', default_day_plan: 7, follow_up_days: 7,
    },
    Corynespora: {
        name: 'Corynespora Leaf Fall', risk_level: 'High',
        description: 'Distinctive fish-bone necrotic lesions along the midrib. Causes premature leaf drop and can severely reduce latex yield.',
        what_to_do: ['Apply tebuconazole or propiconazole systemic fungicide immediately.', 'Remove and destroy heavily infected leaves.', 'Isolate affected rows and monitor weekly.'],
        prevention_tips: [{ title: 'Clone Selection', desc: 'Favour Corynespora-resistant clones when replanting.' }, { title: 'Early Scouting', desc: 'Inspect trees weekly during wet seasons.' }],
        recommended_fungicide: 'Tebuconazole 25WG', water_mix_ratio: '20L Water Mix', default_day_plan: 21, follow_up_days: 21,
    },
    Healthy: {
        name: 'Healthy', risk_level: 'Low',
        description: 'No signs of disease detected. The leaf appears healthy with no visible lesions or discolouration.',
        what_to_do: ['Continue regular monitoring on a weekly basis.', 'Maintain current fertilisation and irrigation schedule.', 'Scout neighbouring trees for early infection signs.'],
        prevention_tips: [{ title: 'Routine Scouting', desc: 'Scout your estate weekly to catch early signs of infection.' }, { title: 'Balanced Nutrition', desc: 'Ensure adequate potassium and magnesium for leaf health.' }],
        recommended_fungicide: 'None required', water_mix_ratio: 'N/A', default_day_plan: 7, follow_up_days: 30,
    },
    Leaf_Blight: {
        name: 'Fusicoccum Leaf Blight', risk_level: 'High',
        description: 'Dark water-soaked lesions on leaves and young shoots. Thrives in wet conditions and spreads rapidly through rain splash.',
        what_to_do: ['Apply phosphonate-based systemic fungicide to all affected trees.', 'Remove and destroy fallen leaves from tree bases.', 'Avoid working in affected areas during rain.'],
        prevention_tips: [{ title: 'Drainage', desc: 'Ensure water does not pool at the base of trees.' }, { title: 'Ground Cover', desc: 'Use mulch to prevent rain splash onto lower leaves.' }],
        recommended_fungicide: 'Fosetyl-Al 80WP', water_mix_ratio: '25L Water Mix', default_day_plan: 21, follow_up_days: 21,
    },
    Powdery_Mildew: {
        name: 'Powdery Mildew (Oidium)', risk_level: 'Medium',
        description: 'White powdery coating on leaf surfaces. Likely Oidium heveae affecting the upper canopy. Early intervention prevents yield loss.',
        what_to_do: ['Apply wettable sulfur or trifloxystrobin fungicide immediately.', 'Avoid overhead irrigation to reduce leaf surface moisture.', 'Remove heavily affected leaves before treatment.'],
        prevention_tips: [{ title: 'Humidity Control', desc: 'Improve ventilation to reduce canopy humidity.' }, { title: 'Monitoring', desc: 'Scout weekly during high-humidity periods.' }],
        recommended_fungicide: 'Sulfur 80WP', water_mix_ratio: '15L Water Mix', default_day_plan: 10, follow_up_days: 10,
    },
};

// ── Backend URL ───────────────────────────────────────────────────────────────
const BACKEND_URL = 'http://172.17.92.193:8000';

export default function AnalysisPage() {
    const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
    const { setCurrentScan, saveToHistory } = useScan();

    const [mockResult, setMockResult] = useState<ScanResult | null>(null);
    const [modelClass, setModelClass] = useState<string>('');
    const [predicting, setPredicting] = useState(true);
    const [ragLoading, setRagLoading] = useState(false);
    const [predictError, setPredictError] = useState<string | null>(null);
    const [notALeaf, setNotALeaf] = useState(false);
    const [allProbabilities, setAllProbabilities] = useState<{ label: string; prob: number }[]>([]);
    const [convertingPlan, setConvertingPlan] = useState(false);
    const [saving, setSaving] = useState(false);

    const isUnreliable = (probs: Record<string, number>, topConf: number): boolean => {
        if (topConf < 0.60) return true;
        const entropy = -Object.values(probs).reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
        const maxEntropy = Math.log(Object.keys(probs).length);
        return entropy / maxEntropy > 0.80;
    };

    const buildScanResult = (data: StaticEntry, confidencePct: number): ScanResult => ({
        id: `scan-${Date.now()}`,
        diseaseName: data.name,
        confidence: confidencePct,
        risk: data.risk_level,
        description: data.description,
        whatToDo: data.what_to_do,
        preventionTips: data.prevention_tips,
        fungicide: data.recommended_fungicide,
        waterMix: data.water_mix_ratio,
        dayPlan: data.default_day_plan,
        followUpDays: data.follow_up_days,
        treatmentSteps: buildFallbackSteps(data.default_day_plan),
        imageUri: imageUri || undefined,
        scanDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
        location: '',
    });

    useEffect(() => {
        if (!imageUri) { setPredicting(false); return; }
        (async () => {
            try {
                // ── Phase A: TFLite prediction ────────────────────────────
                const formData = new FormData();
                formData.append('file', { uri: imageUri, name: 'leaf.jpg', type: 'image/jpeg' } as any);

                const res = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData });
                if (!res.ok) throw new Error(await res.text());

                const json: { disease: string; confidence: number; all_probabilities: Record<string, number> } = await res.json();

                const ranked = Object.entries(json.all_probabilities)
                    .map(([cls, prob]) => ({ label: STATIC_FALLBACK[cls]?.name ?? cls.replace(/_/g, ' '), prob }))
                    .sort((a, b) => b.prob - a.prob);
                setAllProbabilities(ranked);

                if (isUnreliable(json.all_probabilities, json.confidence)) {
                    setNotALeaf(true);
                    setPredicting(false);
                    return;
                }

                const cls = json.disease;
                const staticData = STATIC_FALLBACK[cls] ?? STATIC_FALLBACK['Healthy'];
                const confidencePct = Math.round(json.confidence * 100);

                setModelClass(cls);
                setMockResult(buildScanResult(staticData, confidencePct));
                setPredicting(false);

                // ── Phase B: RAG enrichment (background, non-blocking) ────
                if (cls === 'Healthy') return;
                setRagLoading(true);
                try {
                    const ragRes = await fetch(`${BACKEND_URL}/disease-info`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ disease_class: cls }),
                    });
                    if (ragRes.ok) {
                        const rag = await ragRes.json();
                        setMockResult(prev => prev ? {
                            ...prev,
                            diseaseName: rag.disease_name ?? prev.diseaseName,
                            risk: rag.risk_level ?? prev.risk,
                            description: rag.description ?? prev.description,
                            whatToDo: rag.what_to_do ?? prev.whatToDo,
                            preventionTips: rag.prevention_tips ?? prev.preventionTips,
                            fungicide: rag.recommended_fungicide ?? prev.fungicide,
                            waterMix: rag.water_mix_ratio ?? prev.waterMix,
                            dayPlan: rag.estimated_recovery_days ?? prev.dayPlan,
                            followUpDays: rag.follow_up_days ?? prev.followUpDays,
                        } : prev);
                        // Update probability bar labels if disease name changed
                        setAllProbabilities(prev => prev.map(item =>
                            item.label === staticData.name ? { ...item, label: rag.disease_name ?? item.label } : item
                        ));
                    }
                } catch { /* silently keep static fallback */ } finally {
                    setRagLoading(false);
                }
            } catch (e: any) {
                setPredictError(e?.message ?? 'Prediction failed');
                setPredicting(false);
            }
        })();
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

    // Final scan result (merged with GPS) — only valid after predicting is done
    const scanResult: ScanResult = mockResult ? {
        ...mockResult,
        imageUri: imageUri || undefined,
        scanLat,
        scanLng,
        scanAddress,
        location: locationLabel.trim() || scanAddress || 'Unknown Plot',
    } : {} as ScanResult;

    const handleConvertPlan = async () => {
        if (!mockResult) return;
        setConvertingPlan(true);
        try {
            let steps: TreatmentStep[] = buildFallbackSteps(mockResult.dayPlan);
            let expertTip: string | undefined;

            if (modelClass && modelClass !== 'Healthy') {
                try {
                    const res = await fetch(`${BACKEND_URL}/generate-milestones`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ disease_class: modelClass, recovery_days: Math.round(mockResult.dayPlan) }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        steps = (data.steps as any[]).map((s, i) => ({
                            id: i + 1,
                            title: s.title,
                            desc: s.description,
                            status: (i === 0 ? 'current' : 'upcoming') as 'current' | 'upcoming',
                            date: formatDateOffset(s.day_offset ?? 0),
                        }));
                        expertTip = data.expert_tip;
                    }
                } catch { /* use fallback steps */ }
            }

            setCurrentScan({ ...scanResult, treatmentSteps: steps, expertTip });
            router.push('/pages/treatment');
        } finally {
            setConvertingPlan(false);
        }
    };

    const handleSaveReport = async () => {
        if (!mockResult) return;
        setSaving(true);
        try {
            // ── Step 1: Check auth session ────────────────────────────────
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Not Signed In', 'Please sign in to save a report.');
                setSaving(false);
                return;
            }

            const treeLabel = locationLabel.trim() || scanAddress || 'Unknown Plot';

            // ── Step 2: Find or create tree ───────────────────────────────
            let treeId: string | null = null;
            const { data: existingTree } = await supabase
                .from('trees')
                .select('id')
                .eq('user_uid', user.id)
                .eq('label_name', treeLabel)
                .maybeSingle();

            if (existingTree) {
                treeId = existingTree.id;
                console.log('[save] reusing tree:', treeId);
            } else {
                const { data: newTree, error: treeErr } = await supabase
                    .from('trees')
                    .insert({
                        user_uid: user.id,
                        label_name: treeLabel,
                        latitude: scanLat ?? null,
                        longitude: scanLng ?? null,
                    })
                    .select('id')
                    .single();
                if (treeErr || !newTree) throw new Error(treeErr?.message ?? 'Tree insert failed');
                treeId = newTree.id;
                console.log('[save] created tree:', treeId);
            }

            // ── Step 3: Build recommendation_json (matches DB schema) ─────
            const recommendationJson = {
                what_to_do_next: scanResult.whatToDo,
                keep_your_farm_safe: scanResult.preventionTips,
                follow_up_action: `Scan these trees again in ${scanResult.followUpDays} days to monitor healing progress.`,
            };

            // ── Step 4: Insert scan ───────────────────────────────────────
            const { data: scan, error: scanErr } = await supabase
                .from('scans')
                .insert({
                    tree_id: treeId,
                    disease_name: scanResult.diseaseName,
                    disease_description: scanResult.description,
                    image_url: imageUri || null,
                    recommendation_json: recommendationJson,
                    confidence_score: scanResult.confidence,
                    risk_level: scanResult.risk.toLowerCase() as 'low' | 'medium' | 'high',
                    follow_up_days: scanResult.followUpDays,
                    model_version: 'best_float32-tflite-v1',
                    status: 'converted_to_plan',
                })
                .select('id')
                .single();
            if (scanErr || !scan) throw new Error(scanErr?.message ?? 'Scan insert failed');
            console.log('[save] scan inserted:', scan.id);

            // ── Step 5: Create treatment plan ─────────────────────────────
            const expertTipText = scanResult.expertTip
                ?? `Apply ${scanResult.fungicide} (${scanResult.waterMix}) and re-scan in ${scanResult.followUpDays} days.`;

            const { data: plan, error: planErr } = await supabase
                .from('treatment_plans')
                .insert({
                    scan_id: scan.id,
                    tree_id: treeId,
                    title: `${scanResult.diseaseName} Treatment`,
                    disease_name: scanResult.diseaseName,
                    estimated_recovery_days: scanResult.dayPlan,
                    overall_progress: 0,
                    status: 'active',
                    expert_tip: expertTipText,
                })
                .select('id')
                .single();
            if (planErr || !plan) throw new Error(planErr?.message ?? 'Plan insert failed');
            console.log('[save] plan inserted:', plan.id);

            // ── Step 6: Insert treatment steps from AI-generated plan ─────
            const stepStatusMap: Record<string, string> = { current: 'ongoing', upcoming: 'upcoming', completed: 'completed' };
            const stepsToInsert = scanResult.treatmentSteps.map((step, i) => ({
                treatment_plan_id: plan.id,
                step_order: i + 1,
                title: step.title,
                description: step.desc,
                status: stepStatusMap[step.status] ?? 'upcoming',
                due_date: new Date(Date.now() + i * Math.floor(scanResult.dayPlan / 3) * 864e5).toISOString(),
            }));

            const { error: stepsErr } = await supabase.from('treatment_plan_steps').insert(stepsToInsert);
            if (stepsErr) throw new Error(stepsErr?.message ?? 'Steps insert failed');
            console.log('[save] steps inserted');

            // ── Step 7: Save locally to ScanContext too ───────────────────
            setCurrentScan(scanResult);
            saveToHistory(scanResult);

            Alert.alert(
                '✅ Report Saved',
                `Scan saved to database!\n\nDisease: ${scanResult.diseaseName}\nTree: ${treeLabel}`,
                [
                    {
                        text: 'View Milestones',
                        onPress: () => router.replace('/(tabs)/milestone' as any),
                    },
                    {
                        text: 'Go Home',
                        style: 'cancel',
                        onPress: () => router.replace('/' as any),
                    },
                ]
            );
        } catch (e: any) {
            console.error('[save] error:', e?.message ?? e);
            Alert.alert('Save Failed', `Error: ${e?.message ?? 'Unknown error'}\n\nCheck console for details.`);
        } finally {
            setSaving(false);
        }
    };

    if (predicting) {
        return (
            <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>Analysing leaf image...</Text>
            </SafeAreaView>
        );
    }

    if (notALeaf) {
        return (
            <SafeAreaView style={[styles.safeArea, { padding: 32 }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center', gap: 16, marginBottom: 32 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff3cd', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="scan-outline" size={36} color="#b45309" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' }}>
                        No Rubber Leaf Detected
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 }}>
                        The model could not confidently identify a rubber leaf in this image. This may happen if the image is blurry, too far away, or does not show a leaf.
                    </Text>
                </View>

                {/* Show what it detected anyway for transparency */}
                {allProbabilities.length > 0 && (
                    <View style={[styles.card, { marginBottom: 24 }]}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 12 }}>
                            MODEL OUTPUT (LOW CONFIDENCE)
                        </Text>
                        {allProbabilities.map((item, idx) => (
                            <View key={item.label} style={{ marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <Text style={{ fontSize: 12, color: idx === 0 ? '#b45309' : COLORS.textMuted, fontWeight: idx === 0 ? '700' : '400' }}>
                                        {item.label}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: idx === 0 ? '#b45309' : COLORS.textMuted, fontWeight: '700' }}>
                                        {(item.prob * 100).toFixed(1)}%
                                    </Text>
                                </View>
                                <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                    <View style={{ height: 6, width: `${item.prob * 100}%` as any, backgroundColor: idx === 0 ? '#f59e0b' : '#d1d5db', borderRadius: 3 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginBottom: 4 }}>Tips for a better scan:</Text>
                    {[
                        'Hold the camera 20–30 cm from the leaf',
                        'Ensure the leaf fills most of the frame',
                        'Scan in good natural lighting, avoid shadows',
                        'Use a single leaf, not a cluster',
                    ].map((tip, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={{ marginTop: 2 }} />
                            <Text style={{ fontSize: 13, color: COLORS.textMain, flex: 1 }}>{tip}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 32 }]}
                    onPress={() => router.back()}
                    activeOpacity={0.9}
                >
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Scan Again</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (predictError) {
        return (
            <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
                <Ionicons name="warning" size={40} color="#c62828" />
                <Text style={{ color: '#c62828', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                    Could not analyse image
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                    {predictError}
                </Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

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
                    <Text style={styles.dangerBadgeText}>{scanResult.diseaseName} Found</Text>
                </View>

                {/* Section 1: What disease is this? */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgGreen }]}>
                            <Ionicons name="folder" size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.cardTitle}>What disease is this?</Text>
                    </View>
                    <Text style={styles.cardText}>{scanResult.description}</Text>
                    <Image
                        source={imageUri ? { uri: imageUri } : require('@/assets/images/leaf.jpeg')}
                        style={styles.leafImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Section 1b: All class probabilities */}
                {allProbabilities.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                                <Ionicons name="stats-chart" size={16} color="#0369a1" />
                            </View>
                            <Text style={styles.cardTitle}>Detection Confidence</Text>
                        </View>
                        {allProbabilities.map((item, idx) => {
                            const pct = item.prob * 100;
                            const isTop = idx === 0;
                            return (
                                <View key={item.label} style={{ marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 13, fontWeight: isTop ? '800' : '500', color: isTop ? COLORS.primary : COLORS.textMuted }}>
                                            {item.label}
                                        </Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isTop ? COLORS.primary : COLORS.textMuted }}>
                                            {pct.toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                        <View style={{ height: 8, width: `${pct}%` as any, backgroundColor: isTop ? COLORS.primary : '#a8e6cf', borderRadius: 4 }} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* RAG loading banner */}
                {ragLoading && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>Fetching AI analysis from knowledge base...</Text>
                    </View>
                )}

                {/* Section 2: What to do next */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgOrange }]}>
                            <MaterialCommunityIcons name="clipboard-check" size={16} color={COLORS.orangeText} />
                        </View>
                        <Text style={styles.cardTitle}>What to do next</Text>
                    </View>

                    {scanResult.whatToDo.map((step, idx) => (
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
                        {scanResult.preventionTips.map((tip, idx) => (
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
                        Scan these specific trees again in {scanResult.followUpDays} days to monitor healing progress.
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
                        <Text style={styles.confidenceValue}>{scanResult.confidence}%</Text>
                    </View>
                    <View style={styles.confidenceDivider} />
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>Risk Level</Text>
                        <Text style={[styles.confidenceValue, { color: scanResult.risk === 'High' ? '#c62828' : scanResult.risk === 'Medium' ? '#f59e0b' : '#2eb86a' }]}>
                            {scanResult.risk}
                        </Text>
                    </View>
                    <View style={styles.confidenceDivider} />
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>Treatment</Text>
                        <Text style={styles.confidenceValue}>{scanResult.dayPlan} Days</Text>
                    </View>
                </View>

                <View style={{ height: 16 }} />

                {/* Action Buttons */}
                <TouchableOpacity style={[styles.primaryBtn, convertingPlan && { opacity: 0.75 }]} onPress={handleConvertPlan} activeOpacity={0.9} disabled={convertingPlan}>
                    {convertingPlan
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <MaterialCommunityIcons name="playlist-edit" size={24} color="#fff" />}
                    <Text style={styles.primaryBtnText}>{convertingPlan ? 'Generating Plan...' : 'Convert to Milestone Plan'}</Text>
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
