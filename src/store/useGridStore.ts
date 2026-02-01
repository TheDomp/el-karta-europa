import { create } from 'zustand';
import { ChaosConfig } from '../services/EntsoeService';

export interface GenerationMix {
    nuclear: number;
    hydro: number;
    wind: number;
    solar: number;
    gas: number;
    coal: number;
    other: number;
    timestamp?: string; // Time of the data point (e.g. "09:00")
}

export interface GridZoneData {
    id: string;
    price: number;
    load: number;
    carbonIntensity?: number;
    windGeneration?: number;
    generationMix?: GenerationMix;
    isSupported?: boolean;
}

interface GridState {
    currentTime: Date;
    isChaosEnabled: boolean;
    timeMode: 'HISTORICAL' | 'LIVE' | 'FORECAST';
    selectedZone: string | null;
    zonesData: GridZoneData[];
    isLoading: boolean;
    error: string | null;

    // New: Tracked Zones (User selection)
    trackedZones: string[];
    loadingZones: string[]; // New: Track which specific zones are loading

    // Actions
    setTime: (date: Date) => void;
    toggleChaos: () => void;
    setZone: (zoneId: string | null) => void;
    toggleTrackedZone: (zoneId: string) => void;
    clearTrackedZones: () => void;
    setZoneLoading: (zoneId: string, isLoading: boolean) => void; // New Action
    setZonesData: (data: GridZoneData[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useGridStore = create<GridState>((set, get) => ({
    currentTime: new Date(),
    isChaosEnabled: false,
    timeMode: 'LIVE',
    selectedZone: null,
    zonesData: [],
    isLoading: true,
    error: null,
    trackedZones: [], // Start empty as requested
    loadingZones: [],

    setTime: (date: Date) => {
        const now = new Date();
        const diffMinutes = (date.getTime() - now.getTime()) / (1000 * 60);

        let mode: 'HISTORICAL' | 'LIVE' | 'FORECAST' = 'LIVE';
        if (diffMinutes < -5) mode = 'HISTORICAL';
        if (diffMinutes > 5) mode = 'FORECAST';

        set({ currentTime: date, timeMode: mode });
    },

    toggleChaos: () => {
        const newVal = !get().isChaosEnabled;
        ChaosConfig.enabled = newVal;
        set({ isChaosEnabled: newVal });
    },

    setZone: (zoneId) => set({ selectedZone: zoneId }),

    toggleTrackedZone: (zoneId) => {
        const current = get().trackedZones;
        if (current.includes(zoneId)) {
            set({ trackedZones: current.filter(id => id !== zoneId) });
        } else {
            set({ trackedZones: [...current, zoneId] });
        }
    },

    clearTrackedZones: () => set({ trackedZones: [] }),

    setZoneLoading: (zoneId, isLoading) => {
        const current = get().loadingZones;
        if (isLoading) {
            if (!current.includes(zoneId)) set({ loadingZones: [...current, zoneId] });
        } else {
            set({ loadingZones: current.filter(id => id !== zoneId) });
        }
    },

    setZonesData: (data) => set({ zonesData: data, isLoading: false, error: null }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error, isLoading: false }),
}));

// Expose store for testing in Development
if (import.meta.env.DEV) {
    // @ts-ignore
    window.gridStore = useGridStore;
}
