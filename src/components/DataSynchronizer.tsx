import { useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import zonesGeoJson from '../assets/data/zones.json';
import { fetchDayAheadPrices, fetchGenerationMix, fetchLoad, ZONE_EIC_MAPPINGS } from '../services/EntsoeService';
import { MockDataService } from '../services/MockDataService';

// Extended List including new European Zones
const ALL_ZONES = zonesGeoJson.features.map((f: any) => f.properties.zoneName || f.id);

export const DataSynchronizer = () => {
    const { currentTime, setZonesData, setLoading, setError, isChaosEnabled, trackedZones, setZoneLoading } = useGridStore();

    useEffect(() => {
        const syncData = async () => {
            setLoading(true);
            try {
                // Generate data for ALL available zones in GeoJSON
                const results = await Promise.all(ALL_ZONES.map(async (id) => {
                    const eicCode = ZONE_EIC_MAPPINGS[id];
                    const hour = currentTime.getHours();

                    // 1. UNSUPPORTED ZONES (Gray)
                    if (!eicCode) {
                        return {
                            id,
                            price: 0,
                            load: 0,
                            isSupported: false,
                            windGeneration: 0,
                            carbonIntensity: 0,
                            generationMix: MockDataService.getEmptyMix()
                        };
                    }

                    // 2. TRACKED ZONES (Try Live Data)
                    if (trackedZones.includes(id)) {
                        setZoneLoading(id, true);
                        try {
                            const prices = await fetchDayAheadPrices(eicCode, currentTime);
                            const price = prices[hour];

                            if (price === undefined || isNaN(price)) {
                                throw new Error('Price data missing for current hour');
                            }

                            // Fetch Real Mix
                            const realMix = await fetchGenerationMix(eicCode, currentTime);
                            const mix = realMix || MockDataService.getEmptyMix();

                            // Fetch Real Load
                            let load = 0;
                            try {
                                const loads = await fetchLoad(eicCode, currentTime);
                                load = loads[hour] || 0;
                            } catch (loadErr) {
                                console.warn(`[DataSynchronizer] Load missing for ${id} - returning 0`);
                                // Keep load as 0 -> "Data missing" check in UI
                            }

                            // Calculate Derived Metrics strictly from data
                            // 1. Wind Generation (MW) -> Approximate from Load * Mix% if exact Gen MW not available separately
                            // (Since we only have Mix %, this implies Net Gen ~= Load, which is close enough for display if imports ignored)
                            const windPct = mix.wind || 0;
                            const windGeneration = Math.round(load * (windPct / 100));

                            // 2. Carbon Intensity (gCO2/kWh) -> Estimate from Mix
                            // Factors (IPCC 2014 approx): Coal 820, Gas 490, Oil 650, Nuclear 12, Wind 11, Solar 45, Hydro 24
                            // Mix has: coal, gas, nuclear, wind, solar, hydro, other (assume other=700)
                            const ci =
                                (mix.coal * 820) +
                                (mix.gas * 490) +
                                (mix.nuclear * 12) +
                                (mix.wind * 11) +
                                (mix.solar * 45) +
                                (mix.hydro * 24) +
                                (mix.other * 700);
                            const carbonIntensity = Math.round(ci / 100);

                            return {
                                id,
                                price: parseFloat(price.toFixed(2)),
                                load: Math.round(load),
                                isSupported: true,
                                windGeneration,
                                carbonIntensity,
                                generationMix: mix
                            };
                        } catch (e: any) {
                            console.error(`[DataSynchronizer] Fetch failed for ${id}:`, e.message || e);
                            return {
                                id,
                                price: 0,
                                load: 0,
                                isSupported: false, // Mark as unsupported/error so UI can show "Data Missing"
                                windGeneration: 0,
                                carbonIntensity: 0,
                                generationMix: MockDataService.getEmptyMix()
                            };
                        } finally {
                            setZoneLoading(id, false);
                        }
                    }

                    // 3. FALLBACK / NON-TRACKED ZONES (Mock Logic)
                    // Keep mock logic ONLY for untracked zones to keep the map looking populated.
                    // Strict data policy applies to what the user explicitly interacts with (Tracked Zones).
                    return MockDataService.generateMockData(id, hour, isChaosEnabled);
                }));

                setZonesData(results);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        syncData();
        const interval = setInterval(syncData, 60000);
        return () => clearInterval(interval);
    }, [currentTime, isChaosEnabled, setZonesData, setLoading, setError, trackedZones, setZoneLoading]);

    return null;
};
