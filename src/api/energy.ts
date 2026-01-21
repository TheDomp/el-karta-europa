// src/api/energy.ts
// Utility functions for fetching energy data from the backend API.
// The API is expected to return an array of EnergyData objects defined in src/types/energy.ts.

import type { EnergyData } from "../types/energy";

/**
 * Fetches the latest energy data for all bidding zones.
 *
 * The function uses the native `fetch` API and returns a promise that resolves
 * to an array of {@link EnergyData}. It throws an error if the HTTP request
 * fails or if the response cannot be parsed as JSON.
 *
 * @param endpoint - The base URL of the energy endpoint. Defaults to `/api/energy`.
 * @returns Promise<EnergyData[]>
 */
export async function fetchEnergyData(endpoint: string = "/api/energy"): Promise<EnergyData[]> {
    const response = await fetch(endpoint, {
        method: "GET",
        headers: {
            "Accept": "application/json",
        },
        // credentials are omitted – adjust if your API requires authentication
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch energy data: ${response.status} ${response.statusText} – ${errorText}`);
    }

    const data: unknown = await response.json();
    // Basic runtime validation – ensures we got an array of objects with required fields.
    if (!Array.isArray(data)) {
        throw new Error("Energy API response is not an array");
    }

    // Cast to EnergyData after a lightweight check.
    return data.map((item) => {
        const d = item as Record<string, any>;
        if (
            typeof d.zoneId !== "string" ||
            typeof d.zoneName !== "string" ||
            typeof d.demand !== "number" ||
            typeof d.spotPrice !== "number" ||
            typeof d.carbonIntensity !== "number" ||
            typeof d.productionMix !== "object" ||
            typeof d.timestamp !== "string"
        ) {
            throw new Error("Malformed EnergyData object received from API");
        }
        return d as EnergyData;
    });
}

/**
 * Convenience wrapper that fetches data for a single zone.
 *
 * @param zoneId - Identifier of the bidding zone (e.g., "DE-LU").
 * @returns Promise<EnergyData>
 */
export async function fetchEnergyDataForZone(zoneId: string): Promise<EnergyData> {
    const all = await fetchEnergyData();
    const zone = all.find((d) => d.zoneId === zoneId);
    if (!zone) {
        throw new Error(`No energy data found for zone ${zoneId}`);
    }
    return zone;
}
