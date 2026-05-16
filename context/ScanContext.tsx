import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TreatmentStep = {
    id: number;
    title: string;
    desc: string;
    status: 'completed' | 'current' | 'upcoming';
    date?: string;
    dayOffset?: number;
};

export type ScanResult = {
    id: string;
    diseaseName: string;
    confidence: number;        // 0-100
    risk: 'High' | 'Medium' | 'Low';
    description: string;
    whatToDo: string[];
    fungicideTips: { title: string; desc: string }[];
    fungicide: string;
    waterMix: string;
    dayPlan: number;
    treatmentSteps: TreatmentStep[];
    expertTip?: string;        // AI-generated tip from /generate-milestones
    imageUri?: string;
    scanDate: string;
    location: string;
    followUpDays: number;
    scanLat?: number;
    scanLng?: number;
    scanAddress?: string;
};

export type ScanRecord = ScanResult & {
    savedAt: number;
    confidence: number;
};

// ─── Context ──────────────────────────────────────────────────────────────────

type ScanContextType = {
    currentScan: ScanResult | null;
    setCurrentScan: (scan: ScanResult) => void;
    history: ScanRecord[];
    saveToHistory: (scan: ScanResult) => void;
    selectedHistoryScan: ScanRecord | null;
    selectHistoryScan: (scan: ScanRecord) => void;
};

const ScanContext = createContext<ScanContextType>({
    currentScan: null,
    setCurrentScan: () => {},
    history: [],
    saveToHistory: () => {},
    selectedHistoryScan: null,
    selectHistoryScan: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ScanProvider({ children }: { children: ReactNode }) {
    const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
    const [history, setHistory] = useState<ScanRecord[]>([]);
    const [selectedHistoryScan, setSelectedHistoryScan] = useState<ScanRecord | null>(null);

    const saveToHistory = (scan: ScanResult) => {
        const record: ScanRecord = { ...scan, savedAt: Date.now() };
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
