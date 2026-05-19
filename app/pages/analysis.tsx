import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { scheduleStepNotifications } from '@/lib/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useScan, ScanResult, TreatmentStep } from '@/context/ScanContext';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { QUERY_KEYS } from '@/lib/queries';

// Upload leaf image to Supabase Storage and return the public URL
async function uploadScanImage(localUri: string, userId: string): Promise<string | null> {
    try {
        const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `${userId}/${Date.now()}.${ext}`;
        const response = await fetch(localUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const { error } = await supabase.storage
            .from('leaf-images')
            .upload(path, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: false });
        if (error) return null;
        const { data } = supabase.storage.from('leaf-images').getPublicUrl(path);
        return data.publicUrl;
    } catch {
        return null;
    }
}

// Disease class labels returned by the /predict backend
const CLASS_LABELS = ['Bird_Eye_Spot', 'Colletotrichum', 'Corynespora', 'Healthy', 'Leaf_Blight', 'Powdery_Mildew'];

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
    fungicide_tips: { title: string; desc: string }[];
    recommended_fungicide: string; water_mix_ratio: string;
    default_day_plan: number; follow_up_days: number;
};
const STATIC_FALLBACK: Record<string, StaticEntry> = {
    Bird_Eye_Spot: {
        name: 'Bird Eye Spot', risk_level: 'Medium',
        description: 'Small circular lesions with dark brown centres and yellow halos. Caused by Bipolaris heveae during humid refoliation periods.',
        what_to_do: ['Apply copper oxychloride or mancozeb during early leaf flush.', 'Collect and destroy fallen infected leaves.', 'Avoid overhead irrigation that prolongs leaf wetness.'],
        fungicide_tips: [{ title: 'Fungicide & Dosage', desc: 'Mancozeb 80WP at 0.2% (2g/L water) or Copper Oxychloride 50WP at 0.3%.' }, { title: 'Spray Schedule', desc: 'Spray every 10–14 days during refoliation flush until new leaves mature.' }],
        recommended_fungicide: 'Mancozeb 80WP', water_mix_ratio: '0.2% (2g/L)', default_day_plan: 14, follow_up_days: 14,
    },
    Colletotrichum: {
        name: 'Colletotrichum (Anthracnose)', risk_level: 'Low',
        description: 'Anthracnose lesions on young leaves caused by Colletotrichum gloeosporioides. Common during wet refoliation periods.',
        what_to_do: ['Spray with carbendazim or thiophanate-methyl during refoliation.', 'Collect and burn fallen infected leaves.', 'Monitor new flushes closely during wet season.'],
        fungicide_tips: [{ title: 'Fungicide & Dosage', desc: 'Carbendazim 50WP at 0.1% (1g/L water) or Chlorothalonil 75WP at 0.2%.' }, { title: 'Spray Schedule', desc: 'Apply at first sign of leaf flush, repeat every 7–10 days for 2–3 applications.' }],
        recommended_fungicide: 'Carbendazim 50WP', water_mix_ratio: '0.1% (1g/L)', default_day_plan: 7, follow_up_days: 7,
    },
    Corynespora: {
        name: 'Corynespora Leaf Fall', risk_level: 'High',
        description: 'Fish-bone necrotic lesions along the midrib caused by Corynespora cassiicola. Causes severe premature leaf drop.',
        what_to_do: ['Apply tebuconazole or propiconazole systemic fungicide immediately.', 'Remove and destroy heavily infected leaves.', 'Isolate affected rows and monitor weekly.'],
        fungicide_tips: [{ title: 'Fungicide & Dosage', desc: 'Tebuconazole 25WG at 0.1% (1g/L) or Benomyl 50WP at 0.1% (1g/L water).' }, { title: 'Spray Schedule', desc: 'Apply every 10–14 days for 3 rounds, then reassess leaf recovery.' }],
        recommended_fungicide: 'Tebuconazole 25WG', water_mix_ratio: '0.1% (1g/L)', default_day_plan: 21, follow_up_days: 21,
    },
    Healthy: {
        name: 'Healthy', risk_level: 'Low',
        description: 'No signs of disease detected. The leaf appears healthy with no visible lesions or discolouration.',
        what_to_do: ['Continue regular monitoring on a weekly basis.', 'Maintain current fertilisation and irrigation schedule.', 'Scout neighbouring trees for early infection signs.'],
        fungicide_tips: [{ title: 'Preventive Spray', desc: 'Consider preventive fungicide at start of refoliation season as a precaution.' }, { title: 'Routine Scouting', desc: 'Scout estate weekly during wet seasons to catch early infections.' }],
        recommended_fungicide: 'None required', water_mix_ratio: 'N/A', default_day_plan: 7, follow_up_days: 30,
    },
    Leaf_Blight: {
        name: 'Fusicoccum Leaf Blight', risk_level: 'High',
        description: 'Dark water-soaked lesions on leaves and young shoots caused by Fusicoccum. Spreads rapidly in wet conditions.',
        what_to_do: ['Apply carbendazim or propiconazole systemic fungicide to all affected trees.', 'Remove and destroy fallen leaves from tree bases.', 'Avoid working in affected areas during rain.'],
        fungicide_tips: [{ title: 'Fungicide & Dosage', desc: 'Carbendazim 50WP at 0.1% (1g/L) or Propiconazole 25EC at 0.1% (1ml/L water).' }, { title: 'Spray Schedule', desc: 'Spray every 10–14 days during active infection. Minimum 3 applications.' }],
        recommended_fungicide: 'Carbendazim 50WP', water_mix_ratio: '0.1% (1g/L)', default_day_plan: 21, follow_up_days: 21,
    },
    Powdery_Mildew: {
        name: 'Powdery Mildew (Oidium)', risk_level: 'Medium',
        description: 'White powdery coating on leaf surfaces caused by Oidium heveae. Affects upper canopy during dry periods.',
        what_to_do: ['Apply wettable sulphur or tridemorph fungicide immediately.', 'Spray early morning when humidity is lower.', 'Remove heavily affected leaves before treatment.'],
        fungicide_tips: [{ title: 'Fungicide & Dosage', desc: 'Sulphur 80WP at 0.3% (3g/L water) or Tridemorph 750EC at 0.1% (1ml/L).' }, { title: 'Spray Schedule', desc: 'Apply every 7–10 days during leaf flush. Stop when new leaves have fully hardened.' }],
        recommended_fungicide: 'Sulphur 80WP', water_mix_ratio: '0.3% (3g/L)', default_day_plan: 10, follow_up_days: 10,
    },
};

const STATIC_FALLBACK_MS: Record<string, StaticEntry> = {
    Bird_Eye_Spot: {
        name: 'Bird Eye Spot', risk_level: 'Medium',
        description: 'Luka bulat kecil dengan pusat coklat gelap dan lingkaran kuning. Disebabkan oleh Bipolaris heveae semasa tempoh penggantian daun yang lembap.',
        what_to_do: ['Gunakan kuprum oksikorida atau mankozeb semasa pelepasan daun awal.', 'Kumpul dan musnahkan daun jangkitan yang gugur.', 'Elakkan pengairan dari atas yang memanjangkan kelembapan daun.'],
        fungicide_tips: [{ title: 'Fungisid & Dos', desc: 'Mancozeb 80WP pada 0.2% (2g/L air) atau Kuprum Oksikorida 50WP pada 0.3%.' }, { title: 'Jadual Semburan', desc: 'Sembur setiap 10–14 hari semasa pelepasan penggantian daun sehingga daun baru matang.' }],
        recommended_fungicide: 'Mancozeb 80WP', water_mix_ratio: '0.2% (2g/L)', default_day_plan: 14, follow_up_days: 14,
    },
    Colletotrichum: {
        name: 'Colletotrichum (Antraknos)', risk_level: 'Low',
        description: 'Luka antraknos pada daun muda disebabkan oleh Colletotrichum gloeosporioides. Biasa semasa tempoh penggantian daun yang basah.',
        what_to_do: ['Sembur dengan karbendazim atau thiophanat-metil semasa penggantian daun.', 'Kumpul dan bakar daun jangkitan yang gugur.', 'Pantau pelepasan baru dengan rapi semasa musim hujan.'],
        fungicide_tips: [{ title: 'Fungisid & Dos', desc: 'Karbendazim 50WP pada 0.1% (1g/L air) atau Klorotalonil 75WP pada 0.2%.' }, { title: 'Jadual Semburan', desc: 'Gunakan pada tanda pertama pelepasan daun, ulang setiap 7–10 hari untuk 2–3 aplikasi.' }],
        recommended_fungicide: 'Karbendazim 50WP', water_mix_ratio: '0.1% (1g/L)', default_day_plan: 7, follow_up_days: 7,
    },
    Corynespora: {
        name: 'Luruhan Daun Corynespora', risk_level: 'High',
        description: 'Luka nekrotik tulang ikan di sepanjang urat tengah disebabkan oleh Corynespora cassiicola. Menyebabkan gugur daun pramatang yang teruk.',
        what_to_do: ['Gunakan fungisid sistemik tebukonazol atau propikonazol dengan segera.', 'Buang dan musnahkan daun yang dijangkiti teruk.', 'Asingkan baris yang terjejas dan pantau setiap minggu.'],
        fungicide_tips: [{ title: 'Fungisid & Dos', desc: 'Tebukonazol 25WG pada 0.1% (1g/L) atau Benomil 50WP pada 0.1% (1g/L air).' }, { title: 'Jadual Semburan', desc: 'Gunakan setiap 10–14 hari untuk 3 pusingan, kemudian nilai semula pemulihan daun.' }],
        recommended_fungicide: 'Tebukonazol 25WG', water_mix_ratio: '0.1% (1g/L)', default_day_plan: 21, follow_up_days: 21,
    },
    Healthy: {
        name: 'Sihat', risk_level: 'Low',
        description: 'Tiada tanda-tanda penyakit dikesan. Daun kelihatan sihat tanpa luka atau perubahan warna yang ketara.',
        what_to_do: ['Teruskan pemantauan berkala setiap minggu.', 'Kekalkan jadual baja dan pengairan semasa.', 'Pantau pokok berjiran untuk tanda jangkitan awal.'],
        fungicide_tips: [{ title: 'Semburan Pencegahan', desc: 'Pertimbangkan fungisid pencegahan pada permulaan musim penggantian daun sebagai langkah berjaga-jaga.' }, { title: 'Pengintipan Rutin', desc: 'Pantau ladang setiap minggu semasa musim hujan untuk mengesan jangkitan awal.' }],
        recommended_fungicide: 'Tidak diperlukan', water_mix_ratio: 'T/B', default_day_plan: 7, follow_up_days: 30,
    },
    Leaf_Blight: {
        name: 'Keradangan Daun Fusicoccum', risk_level: 'High',
        description: 'Luka gelap berair pada daun dan pucuk muda disebabkan oleh Fusicoccum. Merebak dengan cepat dalam keadaan basah.',
        what_to_do: ['Gunakan fungisid sistemik karbendazim atau propikonazol pada semua pokok yang terjejas.', 'Buang dan musnahkan daun gugur dari pangkal pokok.', 'Elakkan bekerja di kawasan yang terjejas semasa hujan.'],
        fungicide_tips: [{ title: 'Fungisid & Dos', desc: 'Karbendazim 50WP pada 0.1% (1g/L) atau Propikonazol 25EC pada 0.1% (1ml/L air).' }, { title: 'Jadual Semburan', desc: 'Sembur setiap 10–14 hari semasa jangkitan aktif. Minimum 3 aplikasi.' }],
        recommended_fungicide: 'Karbendazim 50WP', water_mix_ratio: '0.1% (1g/L)', default_day_plan: 21, follow_up_days: 21,
    },
    Powdery_Mildew: {
        name: 'Embun Tepung (Oidium)', risk_level: 'Medium',
        description: 'Lapisan tepung putih pada permukaan daun disebabkan oleh Oidium heveae. Menjejaskan kanopi atas semasa tempoh kering.',
        what_to_do: ['Gunakan fungisid sulfur basah atau tridemorph dengan segera.', 'Sembur pada waktu awal pagi apabila kelembapan lebih rendah.', 'Buang daun yang terjejas teruk sebelum rawatan.'],
        fungicide_tips: [{ title: 'Fungisid & Dos', desc: 'Sulfur 80WP pada 0.3% (3g/L air) atau Tridemorph 750EC pada 0.1% (1ml/L).' }, { title: 'Jadual Semburan', desc: 'Gunakan setiap 7–10 hari semasa pelepasan daun. Berhenti apabila daun baru telah mengeras sepenuhnya.' }],
        recommended_fungicide: 'Sulfur 80WP', water_mix_ratio: '0.3% (3g/L)', default_day_plan: 10, follow_up_days: 10,
    },
};

// ── Backend URL ───────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.EXPO_PUBLIC_RAG_BACKEND_URL ?? 'http://localhost:8000';

export default function AnalysisPage() {
    const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
    const { setCurrentScan, saveToHistory } = useScan();
    const { language, t } = useLanguage();
    const queryClient = useQueryClient();
    const fallback = language === 'ms' ? STATIC_FALLBACK_MS : STATIC_FALLBACK;

    // Connectivity state (null = still checking)
    const [isOnline, setIsOnline] = useState<boolean | null>(null);

    useEffect(() => {
        NetInfo.fetch().then(s => setIsOnline(s.isConnected ?? false));
        const unsub = NetInfo.addEventListener(s => setIsOnline(s.isConnected ?? false));
        return unsub;
    }, []);

    const [mockResult, setMockResult] = useState<ScanResult | null>(null);
    const [modelClass, setModelClass] = useState<string>('');
    const [predicting, setPredicting] = useState(true);
    const [ragLoading, setRagLoading] = useState(false);
    const [predictError, setPredictError] = useState<string | null>(null);
    const [notALeaf, setNotALeaf] = useState(false);
    const [allProbabilities, setAllProbabilities] = useState<{ label: string; prob: number }[]>([]);
    const [convertingPlan, setConvertingPlan] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedScanId, setSavedScanId] = useState<string | null>(null); // set after first Supabase save
    const [savedTreeId, setSavedTreeId] = useState<string | null>(null);
    const [milestoneCache, setMilestoneCache] = useState<{ steps: TreatmentStep[]; expertTip?: string } | null>(null);

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
        fungicideTips: data.fungicide_tips,
        fungicide: data.recommended_fungicide,
        waterMix: data.water_mix_ratio,
        dayPlan: data.default_day_plan,
        followUpDays: data.follow_up_days,
        treatmentSteps: buildFallbackSteps(data.default_day_plan),
        imageUri: imageUri || undefined,
        scanDate: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
        location: '',
    });

    // ── Phase A: Prediction — backend /predict endpoint ──────────────────────
    useEffect(() => {
        if (!imageUri) { setPredicting(false); return; }

        (async () => {
            try {
                let cls: string;
                let confidence: number;
                let all_probabilities: Record<string, number>;

                const formData = new FormData();
                formData.append('file', { uri: imageUri, name: 'leaf.jpg', type: 'image/jpeg' } as any);
                const res = await fetch(`${BACKEND_URL}/predict`, { method: 'POST', body: formData });
                if (!res.ok) throw new Error(await res.text());
                const json: { disease: string; confidence: number; all_probabilities: Record<string, number> } = await res.json();
                cls = json.disease;
                confidence = json.confidence;
                all_probabilities = json.all_probabilities;

                const ranked = CLASS_LABELS
                    .map(lbl => ({ label: fallback[lbl]?.name ?? lbl.replace(/_/g, ' '), prob: all_probabilities[lbl] ?? 0 }))
                    .sort((a, b) => b.prob - a.prob);
                setAllProbabilities(ranked);

                if (isUnreliable(all_probabilities, confidence)) {
                    setNotALeaf(true);
                    setPredicting(false);
                    return;
                }

                const staticData = fallback[cls] ?? fallback['Healthy'];
                const confidencePct = Math.round(confidence * 100);
                setModelClass(cls);
                setMockResult(buildScanResult(staticData, confidencePct));
                setPredicting(false);

                // ── Phase B: RAG enrichment (online only, non-blocking) ───
                if (cls === 'Healthy') return;
                const netState = await NetInfo.fetch();
                if (!netState.isConnected) return; // skip RAG when offline

                setRagLoading(true);
                try {
                    const ragRes = await fetch(`${BACKEND_URL}/disease-info`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ disease_class: cls, language }),
                    });
                    if (ragRes.ok) {
                        const rag = await ragRes.json();
                        setMockResult(prev => prev ? {
                            ...prev,
                            diseaseName: rag.disease_name ?? prev.diseaseName,
                            risk: rag.risk_level ?? prev.risk,
                            description: rag.description ?? prev.description,
                            whatToDo: rag.what_to_do ?? prev.whatToDo,
                            fungicideTips: rag.fungicide_tips ?? prev.fungicideTips,
                            fungicide: rag.recommended_fungicide ?? prev.fungicide,
                            waterMix: rag.water_mix_ratio ?? prev.waterMix,
                            dayPlan: rag.estimated_recovery_days ?? prev.dayPlan,
                            followUpDays: rag.follow_up_days ?? prev.followUpDays,
                        } : prev);
                        setAllProbabilities(prev => prev.map(item =>
                            item.label === staticData.name || item.label === STATIC_FALLBACK[cls]?.name
                                ? { ...item, label: rag.disease_name ?? item.label } : item
                        ));
                    }
                } catch { /* keep static fallback silently */ } finally {
                    setRagLoading(false);
                }
            } catch (e: any) {
                setPredictError(e?.message ?? 'Prediction failed');
                setPredicting(false);
            }
        })();
    }, [imageUri]);

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

        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
            Alert.alert('Offline', t.connectToSave);
            return;
        }

        setConvertingPlan(true);
        try {
            // ── Step 1: Generate milestone steps ─────────────────────────
            let steps: TreatmentStep[] = buildFallbackSteps(mockResult.dayPlan);
            let expertTip: string | undefined;

            if (modelClass && modelClass !== 'Healthy') {
                try {
                    const res = await fetch(`${BACKEND_URL}/generate-milestones`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ disease_class: modelClass, recovery_days: Math.round(mockResult.dayPlan), language }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        steps = (data.steps as any[]).map((s, i) => ({
                            id: i + 1,
                            title: s.title,
                            desc: s.description,
                            status: (i === 0 ? 'current' : 'upcoming') as 'current' | 'upcoming',
                            date: formatDateOffset(s.day_offset ?? 0),
                            dayOffset: s.day_offset ?? 0,
                        }));
                        expertTip = data.expert_tip;
                    }
                } catch { /* use fallback steps */ }
            }

            // ── Step 2: Auth check ────────────────────────────────────────
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { Alert.alert(t.notSignedIn, t.pleaseSignIn); return; }

            const treeLabel = locationLabel.trim() || scanAddress || 'Unknown Plot';

            // ── Step 3: Find or create tree (reuse if already saved) ──────
            let treeId: string | null = savedTreeId;
            if (!treeId) {
                const { data: existingTree } = await supabase
                    .from('trees').select('id')
                    .eq('user_uid', user.id).eq('label_name', treeLabel).maybeSingle();
                if (existingTree) {
                    treeId = existingTree.id;
                } else {
                    const { data: newTree, error: treeErr } = await supabase
                        .from('trees')
                        .insert({ user_uid: user.id, label_name: treeLabel, latitude: scanLat ?? null, longitude: scanLng ?? null })
                        .select('id').single();
                    if (treeErr || !newTree) throw new Error(treeErr?.message ?? 'Tree insert failed');
                    treeId = newTree.id;
                }
                setSavedTreeId(treeId);
            }

            // ── Step 4: Reuse existing scan or insert new one ─────────────
            let scanId = savedScanId;
            if (!scanId) {
                const uploadedUrl = imageUri ? await uploadScanImage(imageUri, user.id) : null;
                const recommendationJson = {
                    what_to_do_next: scanResult.whatToDo,
                    keep_your_farm_safe: scanResult.fungicideTips,
                    follow_up_action: `Scan these trees again in ${scanResult.followUpDays} days to monitor healing progress.`,
                };
                const { data: scan, error: scanErr } = await supabase
                    .from('scans')
                    .insert({
                        tree_id: treeId,
                        disease_name: scanResult.diseaseName,
                        disease_description: scanResult.description,
                        image_url: uploadedUrl ?? imageUri ?? null,
                        recommendation_json: recommendationJson,
                        confidence_score: scanResult.confidence,
                        risk_level: scanResult.risk.toLowerCase() as 'low' | 'medium' | 'high',
                        follow_up_days: scanResult.followUpDays,
                        model_version: 'v1',
                        status: 'converted_to_plan',
                    })
                    .select('id').single();
                if (scanErr || !scan) throw new Error(scanErr?.message ?? 'Scan insert failed');
                scanId = scan.id;
                setSavedScanId(scanId);
            } else {
                // Update existing scan status to converted_to_plan
                await supabase.from('scans').update({ status: 'converted_to_plan' }).eq('id', scanId);
            }

            // ── Step 5: Insert treatment plan ─────────────────────────────
            const expertTipText = expertTip
                ?? `Apply ${scanResult.fungicide} (${scanResult.waterMix}) and re-scan in ${scanResult.followUpDays} days.`;

            const { data: plan, error: planErr } = await supabase
                .from('treatment_plans')
                .insert({
                    scan_id: scanId,
                    tree_id: treeId,
                    title: `${scanResult.diseaseName} Treatment`,
                    disease_name: scanResult.diseaseName,
                    estimated_recovery_days: Math.max(1, Math.round(scanResult.dayPlan)),
                    overall_progress: 0,
                    status: 'active',
                    expert_tip: expertTipText,
                    recommended_fungicide: scanResult.fungicide ?? null,
                    water_mix_ratio: scanResult.waterMix ?? null,
                })
                .select('id').single();
            if (planErr || !plan) throw new Error(planErr?.message ?? 'Plan insert failed');

            // ── Step 6: Insert steps ──────────────────────────────────────
            const stepStatusMap: Record<string, string> = { current: 'ongoing', upcoming: 'upcoming', completed: 'completed' };
            const totalSteps = steps.length;
            const stepsToInsert = steps.map((step, i) => {
                const offsetDays = step.dayOffset ?? Math.round(i * scanResult.dayPlan / Math.max(totalSteps - 1, 1));
                return {
                    treatment_plan_id: plan.id,
                    step_order: i + 1,
                    title: step.title,
                    description: step.desc,
                    status: stepStatusMap[step.status] ?? 'upcoming',
                    due_date: new Date(Date.now() + offsetDays * 864e5).toISOString(),
                };
            });

            const { error: stepsErr } = await supabase.from('treatment_plan_steps').insert(stepsToInsert);
            if (stepsErr) throw new Error(stepsErr?.message ?? 'Steps insert failed');

            scheduleStepNotifications(
                stepsToInsert.map((s, i) => ({ id: `${plan.id}-step-${i}`, title: s.title, due_date: s.due_date ?? null })),
                `${scanResult.diseaseName} Treatment`,
                treeLabel,
            ).catch(() => {});

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history(user.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plans(user.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.homeData(user.id) });

            setMilestoneCache({ steps, expertTip });
            setCurrentScan({ ...scanResult, treatmentSteps: steps, expertTip });

            router.push('/pages/treatment');
        } catch (e: any) {
            Alert.alert(t.saveFailed, `Error: ${e?.message ?? 'Unknown error'}`);
        } finally {
            setConvertingPlan(false);
        }
    };

    // Save scan only (no treatment plan) — use "Convert to Milestone" to save with a plan
    const handleSaveReport = async () => {
        if (!mockResult) return;

        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
            Alert.alert('Offline', t.connectToSave);
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert(t.notSignedIn, t.pleaseSignIn);
                return;
            }

            const treeLabel = locationLabel.trim() || scanAddress || 'Unknown Plot';

            // Reuse tree if already saved from a previous action
            let treeId: string | null = savedTreeId;
            if (!treeId) {
                const { data: existingTree } = await supabase
                    .from('trees').select('id')
                    .eq('user_uid', user.id).eq('label_name', treeLabel).maybeSingle();
                if (existingTree) {
                    treeId = existingTree.id;
                } else {
                    const { data: newTree, error: treeErr } = await supabase
                        .from('trees')
                        .insert({ user_uid: user.id, label_name: treeLabel, latitude: scanLat ?? null, longitude: scanLng ?? null })
                        .select('id').single();
                    if (treeErr || !newTree) throw new Error(treeErr?.message ?? 'Tree insert failed');
                    treeId = newTree.id;
                }
                setSavedTreeId(treeId);
            }

            // Only insert scan if not already saved
            if (!savedScanId) {
                const uploadedUrl = imageUri ? await uploadScanImage(imageUri, user.id) : null;
                const recommendationJson = {
                    what_to_do_next: scanResult.whatToDo,
                    keep_your_farm_safe: scanResult.fungicideTips,
                    follow_up_action: `Scan these trees again in ${scanResult.followUpDays} days to monitor healing progress.`,
                };
                const { data: scan, error: scanErr } = await supabase
                    .from('scans')
                    .insert({
                        tree_id: treeId,
                        disease_name: scanResult.diseaseName,
                        disease_description: scanResult.description,
                        image_url: uploadedUrl ?? imageUri ?? null,
                        recommendation_json: recommendationJson,
                        confidence_score: scanResult.confidence,
                        risk_level: scanResult.risk.toLowerCase() as 'low' | 'medium' | 'high',
                        follow_up_days: scanResult.followUpDays,
                        model_version: 'v1',
                        status: 'new',
                    })
                    .select('id').single();
                if (scanErr || !scan) throw new Error(scanErr?.message ?? 'Scan insert failed');
                setSavedScanId(scan.id);
            }

            setCurrentScan(scanResult);
            saveToHistory(scanResult);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history(user.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.homeData(user.id) });

            Alert.alert(
                t.reportSavedTitle,
                t.reportSavedMsg(scanResult.diseaseName, treeLabel),
                [{ text: t.goHome, style: 'cancel', onPress: () => router.replace('/' as any) }]
            );
        } catch (e: any) {
            Alert.alert(t.saveFailed, `Error: ${e?.message ?? 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (predicting) {
        return (
            <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.textMuted, fontSize: 15, textAlign: 'center' }}>{t.analysingLeaf}</Text>
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
                        {t.noLeafTitle}
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 }}>
                        {t.noLeafDesc}
                    </Text>
                </View>

                {/* Show what it detected anyway for transparency */}
                {allProbabilities.length > 0 && (
                    <View style={[styles.card, { marginBottom: 24 }]}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 12 }}>
                            {t.modelOutputLabel}
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
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMain, marginBottom: 4 }}>{t.scanTipsTitle}</Text>
                    {[t.scanTip1, t.scanTip2, t.scanTip3, t.scanTip4].map((tip, i) => (
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
                    <Text style={styles.primaryBtnText}>{t.scanAgain}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (predictError) {
        return (
            <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
                <Ionicons name="warning" size={40} color="#c62828" />
                <Text style={{ color: '#c62828', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                    {t.couldNotAnalyse}
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                    {predictError}
                </Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{t.goBack}</Text>
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
                    <Text style={styles.logoText}>GETY</Text>
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
                        <Text style={styles.title}>{t.treatmentPlanPrepared}</Text>
                        <Text style={styles.subtitle}>{t.analysisSubtitle}</Text>
                    </View>
                </View>

                <View style={styles.dangerBadge}>
                    <Ionicons name="warning" size={14} color={COLORS.dangerText} />
                    <Text style={styles.dangerBadgeText}>{t.foundBadge(scanResult.diseaseName)}</Text>
                </View>

                {/* ── Offline Banner ── */}
                {isOnline === false && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="cloud-offline-outline" size={18} color="#92400e" />
                        <Text style={styles.offlineBannerText}>{t.offlineBanner}</Text>
                    </View>
                )}

                {/* Section 1: What disease is this? */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgGreen }]}>
                            <Ionicons name="folder" size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.cardTitle}>{t.whatDiseaseIs}</Text>
                    </View>
                    {ragLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={{ fontSize: 13, color: '#6b7280' }}>{t.loadingDescription}</Text>
                        </View>
                    ) : (
                        <Text style={styles.cardText}>{scanResult.description}</Text>
                    )}
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
                            <Text style={styles.cardTitle}>{t.detectionConfidence}</Text>
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

                {/* Sections 2–4: loading / offline / loaded states */}
                {ragLoading ? (
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 18, padding: 28, alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary }}>{t.analysingWithAI}</Text>
                        <Text style={{ fontSize: 13, color: '#4b7c5e', textAlign: 'center' }}>{t.analysingWithAIDesc}</Text>
                    </View>
                ) : isOnline === false ? (
                    /* Offline: show local-data note instead of full RAG sections */
                    <View style={styles.offlineRagCard}>
                        <Ionicons name="information-circle-outline" size={20} color="#1e5b43" style={{ marginBottom: 6 }} />
                        <Text style={styles.offlineRagText}>{t.offlineRagNote}</Text>
                    </View>
                ) : (
                    <>
                        {/* Section 2: What to do next */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgOrange }]}>
                                    <MaterialCommunityIcons name="clipboard-check" size={16} color={COLORS.orangeText} />
                                </View>
                                <Text style={styles.cardTitle}>{t.whatToDoNext}</Text>
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

                        {/* Section 3: Fungicide Treatment Guide */}
                        <View style={styles.grayCard}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: COLORS.iconBgOrange }]}>
                                    <MaterialCommunityIcons name="flask-outline" size={18} color={COLORS.orangeText} />
                                </View>
                                <Text style={styles.cardTitle}>{t.fungicideGuide}</Text>
                            </View>

                            <View style={styles.gridRow}>
                                {(scanResult.fungicideTips ?? []).map((tip, idx) => (
                                    <View key={idx} style={styles.gridItem}>
                                        <MaterialCommunityIcons
                                            name={idx === 0 ? 'flask' : 'calendar-clock'}
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
                                <Text style={styles.followUpTitle}>{t.followUpAction}</Text>
                            </View>
                            <Text style={styles.followUpText}>
                                {t.followUpText(scanResult.followUpDays)}
                            </Text>
                        </View>
                    </>
                )}

                {/* ── GPS Location Tag ── */}
                <View style={styles.gpsCard}>
                    <View style={styles.gpsCardHeader}>
                        <View style={styles.gpsIconBox}>
                            <Ionicons name="location" size={18} color={COLORS.primary} />
                        </View>
                        <View style={styles.gpsHeaderText}>
                            <Text style={styles.gpsTitle}>{t.treeLocationTag}</Text>
                            <Text style={styles.gpsSubtitle}>{t.treeLocationSubtitle}</Text>
                        </View>
                    </View>

                    {scanLat && scanLng ? (
                        // Location captured — show result
                        <View style={styles.gpsCaptured}>
                            <View style={styles.gpsCoordRow}>
                                <View style={styles.gpsCoordItem}>
                                    <Text style={styles.gpsCoordLabel}>{t.latitude}</Text>
                                    <Text style={styles.gpsCoordValue}>{scanLat.toFixed(6)}</Text>
                                </View>
                                <View style={styles.gpsCoordDivider} />
                                <View style={styles.gpsCoordItem}>
                                    <Text style={styles.gpsCoordLabel}>{t.longitude}</Text>
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
                                <Text style={styles.gpsRetapText}>{t.recaptureLocation}</Text>
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
                                {gpsLoading ? t.gettingLocation : t.tapToTagGPS}
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
                            <Text style={styles.gpsTitle}>{t.plotLabel}</Text>
                            <Text style={styles.gpsSubtitle}>{t.plotLabelSubtitle}</Text>
                        </View>
                    </View>
                    <TextInput
                        style={styles.labelInput}
                        placeholder={t.plotPlaceholder}
                        placeholderTextColor="#9ca3af"
                        value={locationLabel}
                        onChangeText={setLocationLabel}
                        maxLength={60}
                        returnKeyType="done"
                    />
                    {locationLabel.trim().length > 0 && (
                        <View style={styles.labelPreview}>
                            <Ionicons name="checkmark-circle" size={14} color="#2eb86a" />
                            <Text style={styles.labelPreviewText}>{t.willBeSavedAs(locationLabel.trim())}</Text>
                        </View>
                    )}
                </View>

                {/* Confidence Row */}
                <View style={styles.confidenceRow}>
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>{t.confidenceLabel}</Text>
                        <Text style={styles.confidenceValue}>{scanResult.confidence}%</Text>
                    </View>
                    <View style={styles.confidenceDivider} />
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>{t.riskLevel}</Text>
                        <Text style={[styles.confidenceValue, { color: scanResult.risk === 'High' ? '#c62828' : scanResult.risk === 'Medium' ? '#f59e0b' : '#2eb86a' }]}>
                            {scanResult.risk}
                        </Text>
                    </View>
                    <View style={styles.confidenceDivider} />
                    <View style={styles.confidenceItem}>
                        <Text style={styles.confidenceLabel}>{t.treatment}</Text>
                        <Text style={styles.confidenceValue}>{t.days(scanResult.dayPlan)}</Text>
                    </View>
                </View>

                <View style={{ height: 16 }} />

                {/* Action Buttons */}
                {modelClass !== 'Healthy' && (
                    <TouchableOpacity
                        style={[styles.primaryBtn, convertingPlan && { opacity: 0.75 }]}
                        onPress={handleConvertPlan}
                        activeOpacity={0.9}
                        disabled={convertingPlan}
                    >
                        {convertingPlan
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <MaterialCommunityIcons name="playlist-edit" size={24} color="#fff" />}
                        <Text style={styles.primaryBtnText}>
                            {convertingPlan ? t.generatingPlan : t.convertToMilestone}
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={styles.secondaryBtnRow}>
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: COLORS.iconBgOrange }, (saving || isOnline === false) && { opacity: 0.5 }]}
                        onPress={handleSaveReport}
                        activeOpacity={0.8}
                        disabled={saving || isOnline === false}
                    >
                        <MaterialCommunityIcons name="bookmark" size={18} color={COLORS.orangeText} />
                        <Text style={[styles.secondaryBtnText, { color: COLORS.orangeText }]}>
                            {saving ? t.saving : t.saveReport}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: '#e5e7eb' }]} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="chat-processing" size={18} color={COLORS.textMain} />
                        <Text style={[styles.secondaryBtnText, { color: COLORS.textMain }]}>{t.askAI}</Text>
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

    // Offline banner
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#fef3c7',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fcd34d',
    },
    offlineBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#92400e',
        fontWeight: '600',
        lineHeight: 18,
    },
    offlineRagCard: {
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderRadius: 18,
        padding: 24,
        marginBottom: 16,
        gap: 4,
    },
    offlineRagText: {
        fontSize: 13,
        color: '#4b7c5e',
        textAlign: 'center',
        lineHeight: 20,
    },

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
