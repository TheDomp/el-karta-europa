// src/services/EntsoeService.ts
import { addDays, format } from 'date-fns';
import type { GenerationMix } from '../store/useGridStore';


// Types


// Chaos Configuration
export const ChaosConfig = {
    enabled: false,
    failureRate: 0.3, // 30% chance of failure
    latency: 2000,    // 2s latency
};

// Use proxy in development to avoid CORS, full URL in production/test if not using dev server proxy (but tests use dev server so proxy works)
const API_BASE = import.meta.env.DEV
    ? '/entsoe-api'
    : 'https://web-api.tp.entsoe.eu/api';
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
    const url = new URL(API_BASE, window.location.origin);
    if (!API_KEY) console.error('[EntsoeService] API_KEY is MISSING!');

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
    console.log(`[EntsoeService] Parsed ${points.length} points from XML.`);

    // Map points to values
    const values = points.map(point => {
        if (type === 'price') {
            const amount = point.getElementsByTagName('price.amount')[0]?.textContent;
            return amount ? parseFloat(amount) : 0;
        } else {
            const quantity = point.getElementsByTagName('quantity')[0]?.textContent;
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

    console.log('[EntsoeService] Fetching Price:', url);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`ENTSO-E API Error: ${res.status} ${res.statusText}`);
        const xml = await res.text();

        const values = parseEntsoeXml(xml, 'price');

        // Throw if no values to force fallback
        if (!values || values.length === 0) {
            throw new Error('No price data available in ENTSO-E response');
        }

        return values;
    } catch (err: any) {
        console.error("[EntsoeService] Fetch Price Failed:", err);
        throw err;
    }
}

/**
 * PSR Type Mapping for Generation Mix
 */
const PSR_TYPE_MAPPING: Record<string, string> = {
    'B01': 'biomass',
    'B02': 'coal', // Hard Coal
    'B03': 'gas',  // Coal Gas
    'B04': 'gas',
    'B05': 'coal', // Hard Coal
    'B06': 'gas',  // Oil (grouped into Gas/Oil usually or Other) -> USER called it Gas/Olja. Let's map Oil to gas simply for the chart or 'other'. Users chart says "Gas/Olja", so 'gas' is fine.
    'B09': 'other', // Geothermal
    'B10': 'hydro', // Pumped Store
    'B11': 'hydro', // Run of River
    'B12': 'hydro', // Reservoir
    'B14': 'nuclear',
    'B15': 'other',
    'B16': 'solar',
    'B17': 'other', // Waste
    'B18': 'wind', // Offshore
    'B19': 'wind', // Onshore
    'B20': 'other'
};

/**
 * Fetches Generation Mix (Document Type: A75 - Actual Generation per Type)
 */


// ... (imports remain)

// ... (previous code)

/**
 * Fetches Generation Mix (Document Type: A75 - Actual Generation per Type)
 */
export async function fetchGenerationMix(zoneId: string, date: Date = new Date()): Promise<GenerationMix | null> {
    await applyChaos();

    const periodStart = format(date, "yyyyMMdd") + "0000";
    const periodEnd = format(date, "yyyyMMdd") + "2300"; // End of same day

    // A75 = Actual Generation per Type
    // ProcessType A16 = Realised
    const url = buildUrl({
        documentType: 'A75',
        processType: 'A16',
        in_Domain: zoneId,
        periodStart,
        periodEnd,
    });

    console.log('[EntsoeService] Fetching Mix:', url);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`ENTSO-E API Error: ${res.statusText}`);
        const xml = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "text/xml");

        const timeSeriesList = Array.from(doc.querySelectorAll('TimeSeries'));

        // Initial Mix
        const mix: Record<string, number> = {
            nuclear: 0, hydro: 0, wind: 0, solar: 0, gas: 0, coal: 0, other: 0
        };

        // Determine Resolution to calculate point index
        // Resolution is usually PT60M (1h) or PT15M (15min)
        const resolutionStr = doc.querySelector('Period > resolution')?.textContent || 'PT60M';
        const resolutionMinutes = resolutionStr.includes('PT15M') ? 15 : 60;
        const pointsPerHour = 60 / resolutionMinutes;

        // Current Hour index (0-23)
        const currentHour = new Date().getHours();
        const targetPointIndex = (currentHour * pointsPerHour) + 1; // 1-based index

        timeSeriesList.forEach(ts => {
            const psrType = ts.querySelector('MktPSRType > psrType')?.textContent;
            if (!psrType) return;

            const category = PSR_TYPE_MAPPING[psrType] || 'other';

            // Find point matching current hour
            const point = ts.querySelector(`Period > Point:nth-of-type(${targetPointIndex})`);
            const quantity = point?.getElementsByTagName('quantity')[0]?.textContent;

            if (quantity) {
                const val = parseFloat(quantity);
                if (!isNaN(val)) {
                    mix[category] = (mix[category] || 0) + val;
                }
            }
        });

        // Calculate percentages
        const total = Object.values(mix).reduce((a, b) => a + b, 0);
        if (total === 0) return null; // No data found

        const percentages: Record<string, number> = { ...mix };
        Object.keys(percentages).forEach(k => {
            percentages[k] = Math.round((percentages[k] / total) * 100);
        });

        // Normalize to exactly 100? No need for now, close enough
        return percentages as unknown as GenerationMix;

    } catch (err) {
        console.error("Fetch Mix Failed:", err);
        return null;
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

// Map of European Bidding Zones (Map ID -> EIC Code)
export const ZONE_EIC_MAPPINGS: Record<string, string> = {
    // Sweden
    'SE1': '10Y1001A1001A44P',
    'SE2': '10Y1001A1001A45N',
    'SE3': '10Y1001A1001A46L',
    'SE4': '10Y1001A1001A47J',
    'SE-SE1': '10Y1001A1001A44P',
    'SE-SE2': '10Y1001A1001A45N',
    'SE-SE3': '10Y1001A1001A46L',
    'SE-SE4': '10Y1001A1001A47J',

    // Norway
    'NO1': '10YNO-1--------2',
    'NO2': '10YNO-2--------T',
    'NO3': '10YNO-3--------J',
    'NO4': '10YNO-4--------9',
    'NO5': '10Y1001A1001A48H',
    'NO-NO1': '10YNO-1--------2',
    'NO-NO2': '10YNO-2--------T',
    'NO-NO3': '10YNO-3--------J',
    'NO-NO4': '10YNO-4--------9',
    'NO-NO5': '10Y1001A1001A48H',

    // Finland
    'FI': '10YFI-1--------U',

    // Denmark
    'DK1': '10YDK-1--------W',
    'DK2': '10YDK-2--------M',
    'DK-DK1': '10YDK-1--------W',
    'DK-DK2': '10YDK-2--------M',

    // Germanic / Central
    'DE': '10Y1001A1001A82H', // DE-LU
    'NL': '10YNL----------L',
    'BE': '10YBE----------2',
    'AT': '10YAT-APG------L',
    'PL': '10YPL-AREA-----S',
    'CH': '10YCH-SWISSGRIDZ',
    'CZ': '10YCZ-CEPS-----N',
    'SK': '10YSK-SEPS-----K',
    'HU': '10YHU-MAVIR----U',

    // France
    'FR': '10YFR-RTE------C',

    // Iberia
    'ES': '10YES-REE------0',
    'PT': '10YPT-REN------W',

    // UK / Ireland
    'GB': '10YGB----------A',
    'IE': '10Y1001A1001A59C', // SEM (Single Electricity Market)

    // Baltics
    'EE': '10Y1001A1001A39I',
    'LV': '10YLV-1001A00074',
    'LT': '10YLT-1001A0008Q',

    // Italy
    'IT-NO': '10YDOM-1001A0318',  // North
    'IT-CNO': '10YDOM-1001A0307', // Centre-North
    'IT-CSO': '10YDOM-1001A0308', // Centre-South
    'IT-SO': '10YDOM-1001A0309',  // South
    'IT-SIC': '10YDOM-1001A0170', // Sicily
    'IT-SAR': '10YDOM-1001A0158', // Sardinia
    'IT': '10YIT-GRTN-----B',     // National (Fallback)

    // Others
    'GR': '10YGR-HTSO-----Y',
    'RO': '10YRO-TEL------P',
    'BG': '10YCA-BULGARIA-R',
};
