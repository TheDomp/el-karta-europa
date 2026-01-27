import { useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import zonesGeoJson from '../assets/data/zones.json';
import { fetchDayAheadPrices, fetchGenerationMix, ZONE_EIC_MAPPINGS } from '../services/EntsoeService';
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

                            // Fetch Real Mix (or fallback to empty)
                            const realMix = await fetchGenerationMix(eicCode, currentTime);
                            if (!realMix) {
                                console.warn(`[DataSynchronizer] Mix missing for ${id}, using fallback`);
                            }

                            const mix = realMix || MockDataService.getEmptyMix();

                            // Load is still often mocked if not available, keeping simple random for now as in original
                            const load = 5000 + (Math.random() * 5000);

                            return {
                                id,
                                price: parseFloat(price.toFixed(2)),
                                load: Math.round(load),
                                isSupported: true,
                                windGeneration: Math.round(1000 + Math.random() * 2000),
                                carbonIntensity: Math.round(20 + Math.random() * 200),
                                generationMix: mix
                            };
                        } catch (e: any) {
                            console.log(`[DataSynchronizer] Fetch failed for ${id}, falling back to mock.`, e.message || e);
                            // Fall through to mock logic below
                        } finally {
                            setZoneLoading(id, false);
                        }
                    }

                    // 3. FALLBACK / NON-TRACKED ZONES (Mock Logic)
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
