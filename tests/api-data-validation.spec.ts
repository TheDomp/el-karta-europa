import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

// Zone EIC mappings for testing
const ZONE_EIC_MAPPINGS: Record<string, string> = {
    'SE-SE1': '10Y1001A1001A44P',
    'SE-SE2': '10Y1001A1001A45N',
    'SE-SE3': '10Y1001A1001A46L',
    'SE-SE4': '10Y1001A1001A47J',
    'DK-DK1': '10YDK-1--------W',
    'DK-DK2': '10YDK-2--------M',
    'NO-NO1': '10YNO-1--------2',
    'NO-NO2': '10YNO-2--------T',
    'FI': '10YFI-1--------U',
};

/**
 * Helper: Fetch price from ENTSO-E API for a given zone
 */
async function fetchApiPrice(zoneId: string, eicCode: string): Promise<{ price: number; hour: number }> {
    const apiKey = process.env.VITE_ENTSOE_API_KEY;
    if (!apiKey) throw new Error('API key not defined');

    const now = new Date();
    const formatDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}${mm}${dd}0000`;
    };

    const periodStart = formatDate(now);
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    const periodEnd = formatDate(nextDay);

    const url = `https://web-api.tp.entsoe.eu/api?securityToken=${apiKey}&documentType=A44&in_Domain=${eicCode}&out_Domain=${eicCode}&periodStart=${periodStart}&periodEnd=${periodEnd}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const result = await parseStringPromise(xmlText);

    const timeSeries = result.Publication_MarketDocument?.TimeSeries;
    if (!timeSeries || !timeSeries[0]?.Period?.[0]?.Point) {
        throw new Error(`No price data available for ${zoneId}`);
    }

    const points = timeSeries[0].Period[0].Point;
    const prices = points.map((p: any) => parseFloat(p['price.amount'][0]));
    const currentHour = now.getHours();

    return { price: prices[currentHour], hour: currentHour };
}

/**
 * Helper: Track a specific zone by ID via the store
 */
async function trackZoneById(page: any, zoneId: string): Promise<void> {
    await page.evaluate((id: string) => {
        // @ts-ignore
        if (window.gridStore) {
            // @ts-ignore
            const state = window.gridStore.getState();
            if (!state.trackedZones.includes(id)) {
                state.toggleTrackedZone(id);
            }
        }
    }, zoneId);
}

test.describe('API Data Validation - Price Accuracy', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    });

    test('SE-SE3 displays correct price from API', async ({ page }) => {
        const zoneId = 'SE-SE3';
        const eicCode = ZONE_EIC_MAPPINGS[zoneId];

        let apiData: { price: number; hour: number };
        try {
            apiData = await fetchApiPrice(zoneId, eicCode);
            console.log(`[API] ${zoneId} Hour ${apiData.hour}: ${apiData.price} €/MWh`);
        } catch (e) {
            console.log(`[API] Skipping ${zoneId} - API data unavailable`);
            test.skip();
            return;
        }

        await trackZoneById(page, zoneId);
        await page.waitForTimeout(5000); // Wait for data fetch and UI update

        const zoneButton = page.locator('button').filter({ hasText: zoneId });
        await expect(zoneButton).toBeVisible({ timeout: 15000 });

        const priceSpan = zoneButton.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`[UI] ${zoneId} displayed: ${displayedPrice} €/MWh`);
        expect(displayedPrice).toBeCloseTo(apiData.price, 1);
    });

    test('SE-SE4 displays correct price from API', async ({ page }) => {
        const zoneId = 'SE-SE4';
        const eicCode = ZONE_EIC_MAPPINGS[zoneId];

        let apiData: { price: number; hour: number };
        try {
            apiData = await fetchApiPrice(zoneId, eicCode);
            console.log(`[API] ${zoneId} Hour ${apiData.hour}: ${apiData.price} €/MWh`);
        } catch (e) {
            console.log(`[API] Skipping ${zoneId} - API data unavailable`);
            test.skip();
            return;
        }

        await trackZoneById(page, zoneId);
        await page.waitForTimeout(5000);

        const zoneButton = page.locator('button').filter({ hasText: zoneId });
        await expect(zoneButton).toBeVisible({ timeout: 15000 });

        const priceSpan = zoneButton.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`[UI] ${zoneId} displayed: ${displayedPrice} €/MWh`);
        expect(displayedPrice).toBeCloseTo(apiData.price, 1);
    });

    test('SE-SE1 displays correct price from API', async ({ page }) => {
        const zoneId = 'SE-SE1';
        const eicCode = ZONE_EIC_MAPPINGS[zoneId];

        let apiData: { price: number; hour: number };
        try {
            apiData = await fetchApiPrice(zoneId, eicCode);
            console.log(`[API] ${zoneId} Hour ${apiData.hour}: ${apiData.price} €/MWh`);
        } catch (e) {
            console.log(`[API] Skipping ${zoneId} - API data unavailable`);
            test.skip();
            return;
        }

        await trackZoneById(page, zoneId);
        await page.waitForTimeout(5000);

        const zoneButton = page.locator('button').filter({ hasText: zoneId });
        await expect(zoneButton).toBeVisible({ timeout: 15000 });

        const priceSpan = zoneButton.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`[UI] ${zoneId} displayed: ${displayedPrice} €/MWh`);
        expect(displayedPrice).toBeCloseTo(apiData.price, 1);
    });

    test('SE-SE2 displays correct price from API', async ({ page }) => {
        const zoneId = 'SE-SE2';
        const eicCode = ZONE_EIC_MAPPINGS[zoneId];

        let apiData: { price: number; hour: number };
        try {
            apiData = await fetchApiPrice(zoneId, eicCode);
            console.log(`[API] ${zoneId} Hour ${apiData.hour}: ${apiData.price} €/MWh`);
        } catch (e) {
            console.log(`[API] Skipping ${zoneId} - API data unavailable`);
            test.skip();
            return;
        }

        await trackZoneById(page, zoneId);
        await page.waitForTimeout(5000);

        const zoneButton = page.locator('button').filter({ hasText: zoneId });
        await expect(zoneButton).toBeVisible({ timeout: 15000 });

        const priceSpan = zoneButton.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`[UI] ${zoneId} displayed: ${displayedPrice} €/MWh`);
        expect(displayedPrice).toBeCloseTo(apiData.price, 1);
    });

    test('DK-DK1 displays correct price from API', async ({ page }) => {
        const zoneId = 'DK-DK1';
        const eicCode = ZONE_EIC_MAPPINGS[zoneId];

        let apiData: { price: number; hour: number };
        try {
            apiData = await fetchApiPrice(zoneId, eicCode);
            console.log(`[API] ${zoneId} Hour ${apiData.hour}: ${apiData.price} €/MWh`);
        } catch (e) {
            console.log(`[API] Skipping ${zoneId} - API data unavailable`);
            test.skip();
            return;
        }

        await trackZoneById(page, zoneId);
        await page.waitForTimeout(5000);

        const zoneButton = page.locator('button').filter({ hasText: zoneId });
        await expect(zoneButton).toBeVisible({ timeout: 15000 });

        const priceSpan = zoneButton.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`[UI] ${zoneId} displayed: ${displayedPrice} €/MWh`);
        expect(displayedPrice).toBeCloseTo(apiData.price, 1);
    });

});

test.describe('API Data Validation - Data Format', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('Zone prices are displayed in EUR/MWh format', async ({ page }) => {
        await trackZoneById(page, 'SE-SE3');
        await page.waitForTimeout(3000);

        const priceLabel = page.locator('text=EUR / MWh');
        await expect(priceLabel.first()).toBeVisible();
    });

    test('Zone prices are valid numbers (not NaN)', async ({ page }) => {
        await trackZoneById(page, 'SE-SE3');
        await page.waitForTimeout(3000);

        const priceSpan = page.locator('button').filter({ hasText: 'SE-SE3' }).locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 10000 });
        const priceText = await priceSpan.innerText();
        const price = parseFloat(priceText);

        expect(price).not.toBeNaN();
        expect(price).toBeGreaterThanOrEqual(0);
    });

    test('Zone prices have 1 decimal place', async ({ page }) => {
        await trackZoneById(page, 'SE-SE3');
        await page.waitForTimeout(3000);

        const zoneButton = page.locator('button').filter({ hasText: 'SE-SE3' });
        await expect(zoneButton).toBeVisible({ timeout: 10000 });
        const priceSpan = zoneButton.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();

        expect(priceText).toMatch(/^\d+\.\d{1}$/);
    });

});

test.describe('API Data Validation - Multiple Zones Consistency', () => {

    test('Multiple selected zones all display valid prices', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const zonesToTrack = ['SE-SE3', 'SE-SE4'];
        for (const zoneId of zonesToTrack) {
            await trackZoneById(page, zoneId);
        }

        await page.waitForTimeout(5000);

        for (const zoneId of zonesToTrack) {
            const zoneButton = page.locator('button').filter({ hasText: zoneId });
            await expect(zoneButton).toBeVisible({ timeout: 10000 });
            const priceSpan = zoneButton.locator('div.font-mono').first();
            await expect(priceSpan).toBeVisible({ timeout: 5000 });
            const priceText = await priceSpan.innerText();
            const price = parseFloat(priceText);

            expect(price).not.toBeNaN();
            console.log(`Zone ${zoneId}: ${price} €/MWh`);
        }
    });

});
