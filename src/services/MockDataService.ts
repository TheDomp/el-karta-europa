import type { GenerationMix, GridZoneData } from '../store/useGridStore';

export class MockDataService {
    /**
     * Generate mock data for a supported but untracked zone, or as fallback
     */
    static generateMockData(id: string, hour: number, isChaosEnabled: boolean): GridZoneData {
        console.log(`[MockDataService] Generating mock data for ${id}`);

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

        // Generation Mix Mock Logic
        let mix = { nuclear: 0, hydro: 0, wind: 0, solar: 0, gas: 0, coal: 0, other: 0 };

        if (id.includes('SE') || id.includes('NO')) {
            // Hydro Heavy
            mix = { nuclear: 30, hydro: 45, wind: 20, solar: 2, gas: 0, coal: 0, other: 3 };
            if (id.includes('NO')) mix.nuclear = 0;
            if (id.includes('SE1') || id.includes('SE2')) { mix.hydro = 60; mix.nuclear = 0; }
        } else if (id === 'FR') {
            // Nuclear Heavy
            mix = { nuclear: 70, hydro: 10, wind: 10, solar: 5, gas: 5, coal: 0, other: 0 };
        } else if (id.includes('DE') || id.includes('PL') || id.includes('NL')) {
            // Coal/Wind/Gas
            mix = { nuclear: 0, hydro: 5, wind: 35, solar: 15, gas: 25, coal: 15, other: 5 };
        } else if (isSouth) {
            // Solar/Gas
            mix = { nuclear: 10, hydro: 10, wind: 15, solar: 30, gas: 35, coal: 0, other: 0 };
        } else {
            // Default Mix
            mix = { nuclear: 10, hydro: 20, wind: 20, solar: 10, gas: 30, coal: 5, other: 5 };
        }

        // Add noise
        Object.keys(mix).forEach(key => {
            // @ts-ignore
            mix[key] = Math.max(0, mix[key] + (Math.random() * 5 - 2.5));
        });

        // CLEANUP: Force Gas/Coal to 0 for Nordic countries to be realistic
        if (id.includes('SE') || id.includes('NO')) {
            mix.gas = 0;
            mix.coal = 0;
        }

        let price = basePrice + timeFactor - solarDiscount + (Math.random() * 5);
        let load = 5000 + (Math.random() * 5000);

        if (isChaosEnabled) {
            price *= (1 + Math.random());
        }

        return {
            id,
            price: parseFloat(price.toFixed(2)),
            load: Math.round(load),
            isSupported: true, // Mark as supported even if mocked
            windGeneration: Math.round(1000 + Math.random() * 2000),
            carbonIntensity: Math.round(20 + Math.random() * 200),
            generationMix: mix
        };
    }

    /**
    * Returns a fallback/empty mix object
    */
    static getEmptyMix(): GenerationMix {
        return { nuclear: 0, hydro: 0, wind: 0, solar: 0, gas: 0, coal: 0, other: 0 };
    }
}
