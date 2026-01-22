import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env file since dotenv is not configured in Playwright
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

test.describe('Data Integrity & Consistency', () => {

    test.beforeEach(async ({ page }) => {
        // Targeting localhost:3000 where the production build is served
        await page.goto('/');

        // Wait for the map to render (give it a moment to fetch geojson)
        await page.waitForTimeout(2000);

        // Robustness: Attempt to click the first interactive path (Zone) on the map
        // The class 'leaflet-interactive' is standard for Leaflet polygons
        const firstZone = page.locator('path.leaflet-interactive').first();

        // Check if we found any path
        if (await firstZone.count() > 0) {
            // Force click because sometimes SVG overlays can be tricky with pointer events
            await firstZone.click({ force: true });
        } else {
            // Fallback: Try clicking center of screen if selectors fail
            const viewport = page.viewportSize();
            if (viewport) {
                await page.mouse.click(viewport.width / 2, viewport.height / 2 - 50);
            }
        }

        // Wait for ANY item to appear in the ZoneTable list
        // This confirms that at least one zone was selected and data is displaying
        await page.waitForSelector('button.w-full.flex', { timeout: 15000 });
    });

    test('Zone List should display valid number prices', async ({ page }) => {
        // Get all buttons in the list
        const zoneButtons = page.locator('button.w-full.flex');
        const count = await zoneButtons.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const button = zoneButtons.nth(i);

            // Find the price text within this button (font-mono span)
            const priceSpan = button.locator('span.font-mono');
            const priceText = await priceSpan.innerText();

            // Convert to number
            const price = parseFloat(priceText);

            // Assertions
            expect(price).not.toBeNaN();
            console.log(`Verified zone price: ${price}`);
        }
    });

    test('Selection State Consistency', async ({ page }) => {
        // Instead of looking for SE3 specifically, let's grab the FIRST zone in the list
        const firstButton = page.locator('button.w-full.flex').first();

        // Click it to ensure it is the "active" selection (even if already selected, clicking ensures we test the interaction)
        await firstButton.click();

        // Verify it becomes active (bg-blue-50/50 class)
        await expect(firstButton).toHaveClass(/bg-blue-50\/50/);

        // Verify the blue dot indicator is visible inside it
        const dot = firstButton.locator('.bg-blue-500.rounded-full');
        await expect(dot).toBeVisible();

        // Consistency: Verify that the tooltip (if we knew how to check it easily) or Map updates
        // For now, testing the List Internal Consistency is good step 1.
    });

    test('SE4 should display correct price for current hour', async ({ page }) => {
        // Capture browser logs
        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));

        // 1. Fetch "Truth" from ENTSO-E API
        // NOTE: Uses VITE_ENTSOE_API_KEY from process.env (loaded by Playwright automatically from .env)
        const apiKey = process.env.VITE_ENTSOE_API_KEY;
        expect(apiKey).toBeDefined();

        const zoneId = '10Y1001A1001A47J'; // SE4
        const now = new Date();

        // Helper to format date for ENTSO-E (YYYYMMDD0000)
        const formatDate = (date: Date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}${mm}${dd}0000`; // Start of day
        };

        const periodStart = formatDate(now);
        // Next day start
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        const periodEnd = formatDate(nextDay);

        const url = `https://web-api.tp.entsoe.eu/api?securityToken=${apiKey}&documentType=A44&in_Domain=${zoneId}&out_Domain=${zoneId}&periodStart=${periodStart}&periodEnd=${periodEnd}`;

        console.log(`Fetching verification data from ENTSO-E for ${periodStart}...`);

        const response = await fetch(url);
        expect(response.ok).toBeTruthy();
        const xmlText = await response.text();

        // Parse XML using xml2js
        const result = await parseStringPromise(xmlText);

        // Traverse to get points
        // Structure: Publication_MarketDocument -> TimeSeries -> Period -> Point
        const timeSeries = result.Publication_MarketDocument.TimeSeries;
        // Find the right timeseries if multiple? usually just one for A44/Price
        const points = timeSeries[0].Period[0].Point;

        // Extract values
        const prices = points.map((p: any) => parseFloat(p['price.amount'][0]));

        // Get Current Hour Price
        // Assuming the array starts at 00:00 local time (CET/CEST) for SE4
        const currentHour = now.getHours();
        const expectedPrice = prices[currentHour];

        console.log(`Expected Price for hour ${currentHour}: ${expectedPrice}`);

        // 2. Check App
        // Refresh page to ensure fresh data
        await page.reload();
        await page.waitForTimeout(3000); // Wait for fetch

        // Programmatically ensure SE-SE4 is tracked so it appears in the table
        const syncPromise = page.waitForEvent('console', {
            predicate: msg => msg.text().includes('SE-SE4 Live: Hour') && !msg.text().includes('Failed'),
            timeout: 20000
        });

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

        // Wait for the sync to complete based on the console log
        console.log('Waiting for App to sync SE-SE4 live data...');
        await syncPromise;
        console.log('App synced live data.');


        // Find SE4 in the list
        // Note: The app might not display "SE4" text explicitly, but the ID "SE-SE4"
        // Let's assume the rows are there. We need to find the specific button for SE-SE4.

        // We can find by text "SE-SE4" or "Sverige" if unique, but "SE-SE4" is safer.
        // The ZoneTable component renders: {zone.id} which is "SE-SE4"
        const se4Button = page.locator('button', { hasText: 'SE-SE4' });

        // Ensure it's visible (scroll if needed)
        await expect(se4Button).toBeVisible();

        // Get the price text
        const priceSpan = se4Button.locator('span.font-mono');
        const priceText = await priceSpan.innerText();
        const displayedPrice = parseFloat(priceText);

        console.log(`Displayed Price in App: ${displayedPrice}`);

        // 3. Compare
        // Allow small floating point diff if necessary, or string match
        // The app performs toFixed(2), so we should compare to that.
        expect(displayedPrice).toBeCloseTo(expectedPrice, 2);
    });

});
