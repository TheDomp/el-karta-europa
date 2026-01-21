import { useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import zonesGeoJson from '../assets/data/zones.json';

// Extended List including new European Zones
const ALL_ZONES = zonesGeoJson.features.map((f: any) => f.properties.zoneName || f.id);

export const DataSynchronizer = () => {
    const { currentTime, setZonesData, setLoading, setError, isChaosEnabled } = useGridStore();

    useEffect(() => {
        const syncData = async () => {
            setLoading(true);
            try {
                // Generate data for ALL available zones in GeoJSON
                const results = ALL_ZONES.map((id) => {
                    const hour = currentTime.getHours();

                    // Simple deterministic simulation for demo
                    // Higher latitudes (SE1, NO1) -> often cheaper hydro/wind?
                    // Central Europe (DE, NL) -> higher base price?

                    let basePrice = 40;
                    if (id.includes('DE') || id.includes('NL') || id.includes('GB')) basePrice = 65;
                    if (id === 'FR') basePrice = 55;
                    if (id.startsWith('IT-')) basePrice = 75;
                    if (id === 'ES' || id === 'PT') basePrice = 35;
                    if (id === 'SE-SE4' || id === 'DK-DK2') basePrice = 50;

                    // Solar curve logic for South
                    const isSouth = ['ES', 'PT', 'GR'].includes(id) || id.startsWith('IT-');
                    const timeFactor = Math.sin((hour - 4) / 12 * Math.PI) * (isSouth ? 20 : 15);

                    // South is cheaper in midday due to Solar 
                    let solarDiscount = 0;
                    if (isSouth && hour > 10 && hour < 16) solarDiscount = 25;

                    let price = basePrice + timeFactor - solarDiscount + (Math.random() * 5);
                    let load = 5000 + (Math.random() * 5000);

                    if (isChaosEnabled) {
                        price *= (1 + Math.random());
                    }

                    return {
                        id,
                        price: parseFloat(price.toFixed(2)),
                        load: Math.round(load),
                        windGeneration: Math.round(1000 + Math.random() * 2000),
                        carbonIntensity: Math.round(20 + Math.random() * 200)
                    };
                });

                setZonesData(results);
            } catch (err: any) {
                setError(err.message);
            }
        };

        syncData();
        const interval = setInterval(syncData, 60000);
        return () => clearInterval(interval);
    }, [currentTime, isChaosEnabled, setZonesData, setLoading, setError]);

    return null;
};
