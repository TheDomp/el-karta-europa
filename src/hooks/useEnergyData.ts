// src/hooks/useEnergyData.ts
// React hook for fetching energy data using the API utilities.

import { useState, useEffect } from "react";
import { fetchEnergyData, fetchEnergyDataForZone } from "../api/energy";
import type { EnergyData } from "../types/energy";

/**
 * Hook that fetches all energy data.
 * Returns the data array, a loading flag and any error encountered.
 */
export function useEnergyData() {
    const [data, setData] = useState<EnergyData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const result = await fetchEnergyData();
                if (!cancelled) {
                    setData(result);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e.message ?? "Unknown error");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return { data, loading, error };
}

/**
 * Hook that fetches data for a single zone.
 */
export function useEnergyDataForZone(zoneId: string) {
    const [data, setData] = useState<EnergyData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const result = await fetchEnergyDataForZone(zoneId);
                if (!cancelled) setData(result);
            } catch (e: any) {
                if (!cancelled) setError(e.message ?? "Unknown error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [zoneId]);

    return { data, loading, error };
}
