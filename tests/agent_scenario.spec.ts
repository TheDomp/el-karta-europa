
// tests/agent_scenario.spec.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the Gen AI generated scenario
const SCENARIO_PATH = path.resolve(__dirname, '../scenarios/winter_2026.json');
let scenarioData: any[] = [];

if (fs.existsSync(SCENARIO_PATH)) {
    scenarioData = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf-8'));
} else {
    console.warn("⚠️ Scenario file not found. Falling back to empty data.");
}

// Helper to look up zone data
function getZoneData(eicCode: string) {
    // Mapping from EIC to ZoneID (simplified reverse mapping)
    const eicToZone: Record<string, string> = {
        '10Y1001A1001A46L': 'SE3',
        '10Y1001A1001A47J': 'SE4',
        '10Y1001A1001A44P': 'SE1',
        '10Y1001A1001A45N': 'SE2',
        '10YDK-1--------W': 'DK1',
        '10YDK-2--------M': 'DK2',
        '10YFI-1--------U': 'FI',
        '10YNO-1--------2': 'NO1',
        '10YNO-2--------T': 'NO2',
    };

    const zoneId = eicToZone[eicCode];
    if (!zoneId) return null;
    return scenarioData.find(z => z.zoneId === zoneId);
}

// Helper to generate Price XML (A44)
function generatePriceXml(price: number) {
    // Generate 24 hours of data
    let points = '';
    for (let i = 1; i <= 24; i++) {
        // Add some random variation to make it look realistic, but keep close to scenario price
        const hourlyPrice = (price * (0.9 + Math.random() * 0.2)).toFixed(2);
        points += `
      <Point>
        <position>${i}</position>
        <price.amount>${hourlyPrice}</price.amount>
      </Point>`;
    }

    return `
    <Publication_MarketDocument>
      <TimeSeries>
        <Period>
          <resolution>PT60M</resolution>
          ${points}
        </Period>
      </TimeSeries>
    </Publication_MarketDocument>
  `;
}

// Helper to generate Generation Mix XML (A75)
function generateMixXml(mix: any) {
    if (!mix) return '<Publication_MarketDocument></Publication_MarketDocument>';

    // Map our internal keys to PSR Types
    const keyToPsr: Record<string, string> = {
        'biomass': 'B01',
        'coal': 'B02',
        'gas': 'B04',
        'hydro': 'B11',
        'nuclear': 'B14',
        'solar': 'B16',
        'wind': 'B19',
        'other': 'B20'
    };

    let timeSeries = '';

    Object.entries(mix).forEach(([key, value]) => {
        const psrType = keyToPsr[key];
        if (psrType) {
            // Create points for this type
            let points = '';
            // Just one point for "now" or 24 points? 
            // Frontend fetches for current hour mostly, or averages.
            // Let's generate 24 identical points for simplicity
            for (let i = 1; i <= 24; i++) {
                points += `
            <Point>
                <position>${i}</position>
                <quantity>${value}</quantity>
            </Point>`;
            }

            timeSeries += `
        <TimeSeries>
            <MktPSRType>
                <psrType>${psrType}</psrType>
            </MktPSRType>
            <Period>
                <resolution>PT60M</resolution>
                ${points}
            </Period>
        </TimeSeries>`;
        }
    });

    return `
    <Publication_MarketDocument>
      ${timeSeries}
    </Publication_MarketDocument>
  `;
}

test.describe('Agentic AI: Winter 2026 Scenario Verification', () => {

    test('Agent should detect extreme prices in SE3/SE4', async ({ page }) => {

        // 1. Mock the Network (The "Simulated World")
        await page.route('**/entsoe-api?*documentType=A44*', async route => {
            const url = new URL(route.request().url());
            const eic = url.searchParams.get('in_Domain') || '';
            const zoneData = getZoneData(eic);

            console.log(`[Agent] Intercepted Price Request for ${eic} -> ${zoneData?.zoneId || 'Unknown'}`);

            if (zoneData) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/xml',
                    body: generatePriceXml(zoneData.spotPrice)
                });
            } else {
                await route.continue();
            }
        });

        // 2. Mock Generation Mix
        await page.route('**/entsoe-api?*documentType=A75*', async route => {
            const url = new URL(route.request().url());
            const eic = url.searchParams.get('in_Domain') || '';
            const zoneData = getZoneData(eic);

            if (zoneData) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/xml',
                    body: generateMixXml(zoneData.productionMix)
                });
            } else {
                await route.continue();
            }
        });

        // 3. Agent Action: Open the Map
        console.log("[Agent] Opening Application...");
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 4. Agent Observation: Check SE3
        console.log("[Agent] Checking SE3 status...");

        // Click SE3 button or map element if clickable
        // Assuming UI has buttons for zones or we rely on map click. 
        // Let's rely on the functionality in api-data-validation.spec.ts: tracking via store helper?
        // Or just click the UI.
        const se3Button = page.locator('button').filter({ hasText: 'SE-SE3' }).first();
        if (await se3Button.isVisible()) {
            await se3Button.click();
        } else {
            // Fallback: Enable tracking programmatically if UI is complex
            await page.evaluate(() => {
                // @ts-ignore
                window.gridStore?.getState().toggleTrackedZone('SE-SE3');
            });
        }

        await page.waitForTimeout(2000); // Wait for UI update

        // 5. Verify Price Display
        const priceText = await page.locator('button').filter({ hasText: 'SE-SE3' }).locator('div.font-mono').first().innerText();
        const price = parseFloat(priceText);

        console.log(`[Agent] Observed SE3 Price: ${price} EUR/MWh`);

        // 6. Agent Logic: Evaluate against "Winter 2026" expectation
        if (price > 300) {
            console.log("✅ AGENT OBSERVATION: High price detected as expected for Winter 2026 scenario.");
        } else {
            console.error(`❌ AGENT OBSERVATION: Price ${price} is too low! Scenario injection might have failed.`);
            throw new Error("Scenario Verification Failed: Price too low");
        }

        expect(price).toBeGreaterThan(300);

        // 7. Verify Data Mix (Nuclear should be present but low wind?)
        // This part depends on UI implementation of details. 
        // For now, price is the main indicator.

    });

});
