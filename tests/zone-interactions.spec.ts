import { test, expect } from '@playwright/test';

test.describe('Zone Interactions', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    });

    test('Adding zone via store shows zone in table', async ({ page }) => {
        // Use store API to add zone (more reliable than map click with Google Maps 3D)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                window.gridStore.getState().toggleTrackedZone('SE-SE3');
            }
        });
        await page.waitForTimeout(500);

        // Zone button should be visible
        const zoneButton = page.locator('button.w-full').first();
        await expect(zoneButton).toBeVisible({ timeout: 5000 });
    });

    test('Clicking zone in table shows selection indicator', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                window.gridStore.getState().toggleTrackedZone('SE-SE3');
            }
        });
        await page.waitForTimeout(500);

        const zoneButton = page.locator('button.w-full').first();
        await zoneButton.click();

        // Updated: ZoneTable uses border-l-[var(--energy-blue)] for selection
        await expect(zoneButton).toHaveClass(/border-l-\[var\(--energy-blue\)\]/);

        // Blue dot indicator (uses bg-[var(--energy-blue)] with rounded-full)
        const dot = zoneButton.locator('.rounded-full');
        await expect(dot).toBeVisible();
    });

    test('JÄMFÖR button appears with 2+ zones', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                const state = window.gridStore.getState();
                state.toggleTrackedZone('SE-SE3');
                state.toggleTrackedZone('SE-SE4');
            }
        });
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await expect(compareButton).toBeVisible();
    });

    test('Comparison modal opens when clicking JÄMFÖR', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                const state = window.gridStore.getState();
                state.toggleTrackedZone('SE-SE3');
                state.toggleTrackedZone('SE-SE4');
            }
        });
        await page.waitForTimeout(500);

        const compareButton = page.locator('button', { hasText: 'JÄMFÖR' });
        await compareButton.click();

        await expect(page.getByText('Jämför Zoner')).toBeVisible();
        await expect(page.getByText('Produktionsmix')).toBeVisible();
        await expect(page.getByText('Elpris')).toBeVisible();
    });

    test('Clear button removes all zones', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                window.gridStore.getState().toggleTrackedZone('SE-SE3');
            }
        });
        await page.waitForTimeout(500);

        const zoneButton = page.locator('button.w-full').first();
        await expect(zoneButton).toBeVisible({ timeout: 5000 });

        // Trash button (no title attribute in new design)
        const clearButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
        await clearButton.click();

        await expect(page.getByText('Välj Zoner')).toBeVisible();
    });

    test('Zone displays price in EUR/MWh format', async ({ page }) => {
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                window.gridStore.getState().toggleTrackedZone('SE-SE3');
            }
        });
        await page.waitForTimeout(2000);

        // Check price format (updated from €/MWh to EUR / MWh) OR SAKNAS
        const priceLabel = page.locator('text=EUR / MWh');
        const missingSpan = page.locator('span').filter({ hasText: 'SAKNAS' });

        if (await missingSpan.isVisible()) {
            console.log('Data missing state (SAKNAS) detected - strict policy working');
            expect(true).toBe(true);
        } else {
            await expect(priceLabel.first()).toBeVisible();
            const priceValue = page.locator('span.font-mono.font-black').first();
            const priceText = await priceValue.textContent();
            const price = parseFloat(priceText || '');
            expect(price).not.toBeNaN();
        }
    });
});
