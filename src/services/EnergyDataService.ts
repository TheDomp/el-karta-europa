import type { EnergyData, ProductionMix } from '../types/energy';

const EUROPEAN_ZONES = [
    { id: 'DE-LU', name: 'Germany-Luxembourg' },
    { id: 'FR', name: 'France' },
    { id: 'SE-3', name: 'Sweden Zone 3' },
    { id: 'NO-1', name: 'Norway Zone 1' },
    { id: 'ES', name: 'Spain' },
    { id: 'IT-NORTH', name: 'Italy North' },
    { id: 'PL', name: 'Poland' },
    { id: 'DK-1', name: 'Denmark Zone 1' },
];

export class EnergyDataService {
    static async getCurrentMarketData(): Promise<EnergyData[]> {
        return EUROPEAN_ZONES.map(zone => {
            const spotPrice = 20 + Math.random() * 180; // 20 - 200 EUR
            const demand = 10000 + Math.random() * 50000; // Mock demand in MW
            const carbonIntensity = 50 + Math.random() * 600; // 50 - 650 gCO2/kWh

            const mix: ProductionMix = {
                wind: Math.random() * 40,
                solar: Math.random() * 20,
                nuclear: zone.id === 'FR' ? 70 : Math.random() * 10,
                gas: Math.random() * 30,
                hydro: (zone.id.startsWith('NO') || zone.id.startsWith('SE')) ? 60 : Math.random() * 20,
                coal: zone.id === 'PL' ? 60 : Math.random() * 10,
                biomass: Math.random() * 5,
            };

            return {
                zoneId: zone.id,
                zoneName: zone.name,
                demand,
                spotPrice,
                carbonIntensity,
                productionMix: mix,
                timestamp: new Date().toISOString(),
            };
        });
    }

    static getPriceColor(price: number): string {
        // Neon Green (low) to Deep Pulse Red (high)
        // Range: 20 (green) to 200 (red)
        const ratio = Math.min(Math.max((price - 20) / 180, 0), 1);
        const r = Math.floor(ratio * 255);
        const g = Math.floor((1 - ratio) * 255);
        const b = Math.floor(ratio * 50); // Subtle pulse
        return `rgb(${r}, ${g}, ${b})`;
    }
}
