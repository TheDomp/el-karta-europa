// src/services/EntsoeService.ts
import { addDays, format } from 'date-fns';
import { detectAnomalies } from '../utils/AnomalyDetection';

// Types
export interface EntsoeDataPoint {
    position: number;
    price?: number;
    load?: number;
    generation?: number;
}

export interface ZoneData {
    zoneId: string;
    prices: number[]; // 24h array
    load: number[];   // 24h array
    timestamp: string;
}

// Chaos Configuration
export const ChaosConfig = {
    enabled: false,
    failureRate: 0.3, // 30% chance of failure
    latency: 2000,    // 2s latency
};

const API_BASE = 'https://web-api.transparency.entsoe.eu/api';
// Use a proxy in production, or ensure CORS is handled. For demo/localhost, explicit proxy or extension might be needed 
// if ENTSO-E doesn't support CORS. 
// NOTE: ENTSO-E Transparency API generally supports CORS for simple GETs but sometimes requires a proxy.
const API_KEY = import.meta.env.VITE_ENTSOE_API_KEY;

// Helper: Simulate Chaos
async function applyChaos() {
    if (!ChaosConfig.enabled) return;

    // Simulate Latency
    await new Promise(r => setTimeout(r, Math.random() * ChaosConfig.latency));

    // Simulate Failure
    if (Math.random() < ChaosConfig.failureRate) {
        throw new Error('CHAOS_SIMULATION: 503 Service Unavailable (Simulated by GridWatch AI)');
    }
}

// Helper: Build URL
function buildUrl(params: Record<string, string>): string {
    const url = new URL(API_BASE);
    url.searchParams.append('securityToken', API_KEY);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    return url.toString();
}

/**
 * Helper: Parse XML using browser DOMParser
 */
function parseEntsoeXml(xmlStr: string, type: 'price' | 'load'): number[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, "text/xml");

    // Check for API Error in XML
    const reasonText = doc.querySelector('Reason > text');
    if (reasonText) {
        console.warn("ENTSO-E API Message:", reasonText.textContent);
    }

    // Traverse: Publication_MarketDocument -> TimeSeries -> Period -> Point
    const points = Array.from(doc.querySelectorAll('TimeSeries > Period > Point'));

    // Map points to values
    const values = points.map(point => {
        if (type === 'price') {
            const amount = point.querySelector('price\\.amount')?.textContent;
            return amount ? parseFloat(amount) : 0;
        } else {
            const quantity = point.querySelector('quantity')?.textContent;
            return quantity ? parseFloat(quantity) : 0;
        }
    });

    return values;
}

/**
 * Fetches Day-Ahead Prices (Document Type: A44, Price Document)
 */
export async function fetchDayAheadPrices(zoneId: string, date: Date = new Date()): Promise<number[]> {
    await applyChaos(); // Inject chaos if enabled

    const periodStart = format(date, "yyyyMMdd") + "0000";
    const periodEnd = format(addDays(date, 1), "yyyyMMdd") + "0000";

    const url = buildUrl({
        documentType: 'A44',
        in_Domain: zoneId,
        out_Domain: zoneId,
        periodStart,
        periodEnd,
    });

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`ENTSO-E API Error: ${res.statusText}`);
        const xml = await res.text();
        return parseEntsoeXml(xml, 'price');
    } catch (err) {
        console.error("Fetch Data Failed:", err);
        throw err;
    }
}

/**
 * Fetches Actual Total Load (Document Type: A65, System Total Load)
 */
export async function fetchLoad(zoneId: string, date: Date = new Date()): Promise<number[]> {
    await applyChaos();

    const periodStart = format(date, "yyyyMMdd") + "0000";
    const periodEnd = format(addDays(date, 1), "yyyyMMdd") + "0000";

    const url = buildUrl({
        documentType: 'A65',
        processType: 'A16', // Realised
        outBiddingZone_Domain: zoneId,
        periodStart,
        periodEnd,
    });

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`ENTSO-E API Error: ${res.statusText}`);
        const xml = await res.text();
        return parseEntsoeXml(xml, 'load');
    } catch (err) {
        console.error("Fetch Load Failed:", err);
        throw err;
    }
}

// Map of Swedish Zones
export const SWEDISH_ZONES = {
    SE1: '10Y1001A1001A44P',
    SE2: '10Y1001A1001A45N',
    SE3: '10Y1001A1001A46L',
    SE4: '10Y1001A1001A47J',
};
