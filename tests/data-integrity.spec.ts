import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env file
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

test.describe('Data Integrity & Consistency', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);

        // Add a zone via store instead of Leaflet click (now using Google Maps)
        await trackZoneById(page, 'SE-SE3');
        await page.waitForTimeout(500);

        await page.waitForSelector('button.w-full', { timeout: 15000 });
    });

    test('Zone List should display valid number prices', async ({ page }) => {
        const zoneButtons = page.locator('button.w-full');
        const count = await zoneButtons.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const button = zoneButtons.nth(i);
            const priceSpan = button.locator('div.font-mono');
            const priceText = await priceSpan.innerText();
            const price = parseFloat(priceText);

            expect(price).not.toBeNaN();
            console.log(`Verified zone price: ${price}`);
        }
    });

    test('Selection State Consistency', async ({ page }) => {
        const firstButton = page.locator('button.w-full').first();
        await firstButton.click();

        // Updated class for dark theme (bg-blue-500/20)
        await expect(firstButton).toHaveClass(/bg-blue-500/);

        // Blue dot indicator (now bg-blue-400)
        const dot = firstButton.locator('.bg-blue-400.rounded-full');
        await expect(dot).toBeVisible();
    });

    test('SE4 should display correct price for current hour', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));

        const apiKey = process.env.VITE_ENTSOE_API_KEY;
        expect(apiKey).toBeDefined();

        const zoneId = '10Y1001A1001A47J'; // SE4
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

        const url = `https://web-api.tp.entsoe.eu/api?securityToken=${apiKey}&documentType=A44&in_Domain=${zoneId}&out_Domain=${zoneId}&periodStart=${periodStart}&periodEnd=${periodEnd}`;

        console.log(`Fetching verification data from ENTSO-E for ${periodStart}...`);

        const response = await fetch(url);
        expect(response.ok).toBeTruthy();
        const xmlText = await response.text();

        const result = await parseStringPromise(xmlText);

        const timeSeries = result.Publication_MarketDocument.TimeSeries;
        const points = timeSeries[0].Period[0].Point;
        const prices = points.map((p: any) => parseFloat(p['price.amount'][0]));

        const currentHour = now.getHours();
        const expectedPrice = prices[currentHour];

        console.log(`Expected Price for hour ${currentHour}: ${expectedPrice}`);

        await page.reload();
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                const state = window.gridStore.getState();
                if (!state.trackedZones.includes('SE-SE4')) {
                    state.toggleTrackedZone('SE-SE4');
                }
            }
        });

        await page.waitForTimeout(5000);

        const se4Button = page.locator('button').filter({ hasText: 'SE-SE4' });
        await expect(se4Button).toBeVisible({ timeout: 15000 });

        const priceSpan = se4Button.locator('div.font-mono').first();
        await expect(priceSpan).toBeVisible({ timeout: 5000 });
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`Displayed Price in App: ${displayedPrice}`);
        expect(displayedPrice).toBeCloseTo(expectedPrice, 1);
    });

});
