/**
 * Anomaly Detection Logic
 * Uses statistical methods (Z-Score) to identify outliers in energy data.
 */

// Threshold for Z-Score (typically 2 or 3)
const Z_THRESHOLD = 2.5;

export interface Anomaly {
    index: number;
    value: number;
    type: 'SPIKE_HIGH' | 'SPIKE_LOW' | 'NEGATIVE_PRICE';
    severity: 'WARNING' | 'CRITICAL';
}

export function detectAnomalies(data: number[]): Anomaly[] {
    if (data.length === 0) return [];

    const anomalies: Anomaly[] = [];

    // 1. Calculate Mean
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;

    // 2. Calculate Standard Deviation
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // 3. Find Outliers
    data.forEach((val, i) => {
        // Check 1: Negative Prices (Critical for producers)
        if (val < 0) {
            anomalies.push({
                index: i,
                value: val,
                type: 'NEGATIVE_PRICE',
                severity: 'CRITICAL'
            });
            return;
        }

        const zScore = (val - mean) / stdDev;

        if (Math.abs(zScore) > Z_THRESHOLD) {
            anomalies.push({
                index: i,
                value: val,
                type: zScore > 0 ? 'SPIKE_HIGH' : 'SPIKE_LOW',
                severity: Math.abs(zScore) > 3.5 ? 'CRITICAL' : 'WARNING'
            });
        }
    });

    return anomalies;
}
