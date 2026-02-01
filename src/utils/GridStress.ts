/**
 * Grid Stress Logic
 * Calculates a 'Stress Index' (0-100) based on Price and Load factors.
 */

export function calculateGridStress(price: number, load: number, maxLoad: number = 25000): { index: number, level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' } {
    // Normalize factors
    const priceFactor = Math.min(price / 200, 1); // Cap at 200 EUR as "High"
    const loadFactor = Math.min(load / maxLoad, 1);

    // Weighted average (Load is slightly more critical for physical stress)
    const rawIndex = (priceFactor * 0.4 + loadFactor * 0.6) * 100;

    // Determine Level
    let level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (rawIndex > 80) level = 'CRITICAL';
    else if (rawIndex > 60) level = 'HIGH';
    else if (rawIndex > 40) level = 'MODERATE';

    return { index: Math.round(rawIndex), level };
}

export function getStressColor(level: string): string {
    switch (level) {
        case 'CRITICAL': return '#ff3b30'; // --energy-red
        case 'HIGH': return '#f59e0b';     // Warm Orange
        case 'MODERATE': return '#ffd700'; // --energy-amber
        default: return '#00ff9d';         // --energy-green
    }
}
