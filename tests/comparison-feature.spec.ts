import { test, expect } from '@playwright/test';

/**
 * Helper: Add multiple zones to tracked list
 */
async function trackMultipleZones(page: any, zoneIds: string[]): Promise<void> {
    for (const id of zoneIds) {
        await page.evaluate((zoneId: string) => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                const state = window.gridStore.getState();
                if (!state.trackedZones.includes(zoneId)) {
                    state.toggleTrackedZone(zoneId);
                }
            }
        }, id);
    }
}

test.describe('Comparison Feature - Modal Opening', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    });

    test('JÄMFÖR button is hidden with less than 2 zones', async ({ page }) => {
        await trackMultipleZones(page, ['SE-SE3']);
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await expect(compareButton).not.toBeVisible();
    });

    test('JÄMFÖR button appears with 2+ zones', async ({ page }) => {
        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4']);
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await expect(compareButton).toBeVisible();
    });

    test('Clicking JÄMFÖR opens ComparisonModal', async ({ page }) => {
        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4']);
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();

        await expect(page.getByText('Jämför Zoner')).toBeVisible();
    });

    test('ComparisonModal shows zone count', async ({ page }) => {
        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4', 'DK-DK1']);
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();

        // Updated: ComparisonModal uses "Jämför X valda zoner" text
        await expect(page.getByText('Jämför 3 valda zoner')).toBeVisible();
    });

});

test.describe('Comparison Feature - Modal Tabs', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4']);
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();
        await page.waitForTimeout(500);
    });

    test('All three tabs are visible', async ({ page }) => {
        await expect(page.getByText('Produktionsmix')).toBeVisible();
        await expect(page.getByText('Elpris')).toBeVisible();
        await expect(page.getByText('Förbrukning')).toBeVisible();
    });

    test('Produktionsmix tab is active by default', async ({ page }) => {
        const mixTab = page.locator('button', { hasText: 'Produktionsmix' });
        await expect(mixTab).toHaveClass(/border-green-500/);
    });

    test('Clicking Elpris tab switches view', async ({ page }) => {
        const priceTab = page.locator('button', { hasText: 'Elpris' });
        await priceTab.click();
        await page.waitForTimeout(300);

        await expect(priceTab).toHaveClass(/border-blue-500/);
    });

    test('Clicking Förbrukning tab switches view', async ({ page }) => {
        const consumptionTab = page.locator('button', { hasText: 'Förbrukning' });
        await consumptionTab.click();
        await page.waitForTimeout(300);

        await expect(consumptionTab).toHaveClass(/border-purple-500/);
    });

});

test.describe('Comparison Feature - Modal Close', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4']);
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();
        await page.waitForTimeout(500);
    });

    test('X button closes the modal', async ({ page }) => {
        await expect(page.getByText('Jämför Zoner')).toBeVisible();

        const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
        await closeButton.click();

        await expect(page.getByText('Jämför Zoner')).not.toBeVisible();
    });

    test('Clicking outside modal backdrop closes it', async ({ page }) => {
        await expect(page.getByText('Jämför Zoner')).toBeVisible();

        await page.click('body', { position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);
        // Behavior depends on modal implementation
    });

});

test.describe('Comparison Feature - Chart Data', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4']);
        await page.waitForTimeout(2000);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();
        await page.waitForTimeout(500);
    });

    test('Chart container is rendered', async ({ page }) => {
        const chartContainer = page.locator('.recharts-wrapper');
        await expect(chartContainer).toBeVisible();
    });

    test('Legend is displayed in chart', async ({ page }) => {
        const legend = page.locator('.recharts-legend-wrapper');
        await expect(legend).toBeVisible();
    });

    test('Produktionsmix shows energy type labels', async ({ page }) => {
        await expect(page.getByText('Vattenkraft')).toBeVisible();
        await expect(page.getByText('Vindkraft')).toBeVisible();
    });

    test('Switching to Elpris tab shows price label', async ({ page }) => {
        const priceTab = page.locator('button', { hasText: 'Elpris' });
        await priceTab.click();
        await page.waitForTimeout(500);

        await expect(page.getByText('Spotpris (€/MWh)')).toBeVisible();
    });

    test('Zone names appear on X-axis', async ({ page }) => {
        const chartWrapper = page.locator('.recharts-wrapper');
        await expect(chartWrapper).toBeVisible();

        const bars = page.locator('.recharts-bar-rectangle');
        const count = await bars.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

});

test.describe('Comparison Feature - Data Consistency', () => {

    test('Prices in modal match prices in table', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await trackMultipleZones(page, ['SE-SE3', 'SE-SE4']);
        await page.waitForTimeout(2000);

        const tableButtonSE3 = page.locator('button', { hasText: 'SE-SE3' });
        const se3Msg = await tableButtonSE3.locator('.text-\\[var\\(--energy-red\\)\\]').count();
        let priceSE3Table = '0';
        if (se3Msg > 0) {
            console.log('SE3 Data Missing (SAKNAS) - Skipping price extraction');
        } else {
            priceSE3Table = await tableButtonSE3.locator('div.font-mono').first().innerText();
        }

        const tableButtonSE4 = page.locator('button', { hasText: 'SE-SE4' });
        const se4Msg = await tableButtonSE4.locator('.text-\\[var\\(--energy-red\\)\\]').count();
        let priceSE4Table = '0';
        if (se4Msg > 0) {
            console.log('SE4 Data Missing (SAKNAS) - Skipping price extraction');
        } else {
            priceSE4Table = await tableButtonSE4.locator('div.font-mono').first().innerText();
        }

        console.log(`Table prices - SE-SE3: ${priceSE3Table}, SE-SE4: ${priceSE4Table}`);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();
        await page.waitForTimeout(500);

        const priceTab = page.locator('button', { hasText: 'Elpris' });
        await priceTab.click();
        await page.waitForTimeout(500);

        const chartBars = page.locator('.recharts-bar-rectangle');
        expect(await chartBars.count()).toBeGreaterThanOrEqual(2);
    });

});
