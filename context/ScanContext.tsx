import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TreatmentStep = {
    id: number;
    title: string;
    desc: string;
    status: 'completed' | 'current' | 'upcoming';
    date?: string;
};

export type ScanResult = {
    id: string;              // unique id per scan
    diseaseName: string;
    confidence: number;      // 0-100
    risk: 'High' | 'Medium' | 'Low';
    description: string;
    whatToDo: string[];
    preventionTips: { title: string; desc: string }[];
    fungicide: string;
    waterMix: string;
    dayPlan: number;
    treatmentSteps: TreatmentStep[];
    imageUri?: string;
    scanDate: string;        // e.g. "Oct 14, 2023"
    location: string;        // e.g. "North Plot B-12"
    followUpDays: number;
    // GPS fields captured at scan time
    scanLat?: number;        // e.g. 4.210528
    scanLng?: number;        // e.g. 101.975769
    scanAddress?: string;    // Reverse-geocoded label e.g. "Jalan Ladang, Perak"
};

export type ScanRecord = ScanResult & {
    savedAt: number;         // Date.now() timestamp
    confidence: number;
};

// ─── Default / Mock scan result (used when no scan has been done yet) ────────

export const DEFAULT_SCAN: ScanResult = {
    id: 'demo-001',
    diseaseName: 'Pestalotiopsis Leaf Fall',
    confidence: 98,
    risk: 'High',
    description:
        "The scan shows circular brown spots on the leaves. This is likely Pestalotiopsis, a common fungus that causes leaves to fall early, reducing your rubber yield.",
    whatToDo: [
        "Prune the infected branches and burn them away from the estate to stop the spread.",
        "Apply a copper-based fungicide spray during the next dry spell for maximum effect.",
    ],
    preventionTips: [
        { title: 'Water Control', desc: 'Ensure good drainage in low-lying areas.' },
        { title: 'Tree Spacing', desc: 'Allow air to flow freely between trees.' },
    ],
    fungicide: 'Mancozeb 80WP',
    waterMix: '20L Water Mix',
    dayPlan: 14,
    treatmentSteps: [
        { id: 1, title: 'Initial Application', desc: 'Fungicide sprayed on Oct 15.', status: 'completed', date: 'Oct 15' },
        { id: 2, title: 'Secondary Spray', desc: 'Due in 2 days (Oct 29). Crucial for preventing fungal spores from maturing.', status: 'current', date: 'Oct 29' },
        { id: 3, title: 'Observation Period', desc: 'Monitor for new growth.', status: 'upcoming' },
        { id: 4, title: 'Final Recovery Check', desc: 'Verification of tree health.', status: 'upcoming' },
    ],
    imageUri: undefined,
    scanDate: 'Oct 14, 2023',
    location: 'North Plot B-12',
    followUpDays: 14,
    scanLat: 4.210528,
    scanLng: 101.975769,
    scanAddress: 'Ladang Belum, Perak',
};

// ─── Context ──────────────────────────────────────────────────────────────────

type ScanContextType = {
    currentScan: ScanResult;
    setCurrentScan: (scan: ScanResult) => void;
    history: ScanRecord[];
    saveToHistory: (scan: ScanResult) => void;
    selectedHistoryScan: ScanRecord | null;
    selectHistoryScan: (scan: ScanRecord) => void;
};

const ScanContext = createContext<ScanContextType>({
    currentScan: DEFAULT_SCAN,
    setCurrentScan: () => {},
    history: [],
    saveToHistory: () => {},
    selectedHistoryScan: null,
    selectHistoryScan: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ScanProvider({ children }: { children: ReactNode }) {
    const [currentScan, setCurrentScan] = useState<ScanResult>(DEFAULT_SCAN);
    const [history, setHistory] = useState<ScanRecord[]>([
        // Pre-populate with 2 demo history items so history page is not empty
        {
            ...DEFAULT_SCAN,
            id: 'hist-001',
            diseaseName: 'Pestalotiopsis Leaf Fall',
            confidence: 98,
            scanDate: 'Oct 14, 2023',
            location: 'North Plot B-12',
            savedAt: new Date('2023-10-14').getTime(),
        },
        {
            ...DEFAULT_SCAN,
            id: 'hist-002',
            diseaseName: 'Rubber Powdery Mildew',
            confidence: 87,
            risk: 'Medium',
            description: 'White powdery coating detected on leaf surfaces. Likely Oidium heveae species affecting upper canopy.',
            whatToDo: [
                'Apply wettable sulfur or trifloxystrobin fungicide immediately.',
                'Avoid overhead irrigation to reduce leaf surface moisture.',
            ],
            fungicide: 'Sulfur 80WP',
            waterMix: '15L Water Mix',
            dayPlan: 10,
            scanDate: 'Oct 08, 2023',
            location: 'South Plot A-5',
            savedAt: new Date('2023-10-08').getTime(),
        },
    ]);
    const [selectedHistoryScan, setSelectedHistoryScan] = useState<ScanRecord | null>(null);

    const saveToHistory = (scan: ScanResult) => {
        const record: ScanRecord = {
            ...scan,
            savedAt: Date.now(),
        };
        setHistory(prev => [record, ...prev]);
    };

    const selectHistoryScan = (scan: ScanRecord) => {
        setSelectedHistoryScan(scan);
    };

    return (
        <ScanContext.Provider
            value={{
                currentScan,
                setCurrentScan,
                history,
                saveToHistory,
                selectedHistoryScan,
                selectHistoryScan,
            }}
        >
            {children}
        </ScanContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScan() {
    return useContext(ScanContext);
}
