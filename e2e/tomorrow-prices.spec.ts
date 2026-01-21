import { test, expect } from '@playwright/test';

test.describe('GridWatch AI - Tomorrow Prices Flow', () => {

    test('User can travel to tomorrow and view forecast', async ({ page }) => {
        // 1. Navigate to App
        await page.goto('http://localhost:5173');

        // 2. Verify Map Loads
        await expect(page.locator('canvas')).toBeVisible();
        await expect(page.getByText('NextGen System Transparency')).toBeVisible();

        // 3. QA: Verify "System Conscience" is active
        const conscience = page.locator('.glass', { hasText: 'System Conscience' });
        await expect(conscience).toBeVisible();

        // 4. Time Travel: Move Slider to Tomorrow (+24h)
        // Locate slider by its attribute or label
        const slider = page.locator('input[type="range"]');
        await slider.fill('24'); // +24 hours

        // 5. Verify Mode Change
        await expect(page.getByText('FORECAST MODE')).toBeVisible();

        // 6. Verify visual feedback (simulated)
        // We expect the map to reflect "Forecast" state, which might be subtle, 
        // but the mode badge is a strong assertion.

        // 7. Chaos Test (Optional Flow)
        // Open QA Panel
        await page.getByRole('button').filter({ has: page.locator('svg[class*="lucide-activity"]') }).click();
        await expect(page.getByText('QA Control Center')).toBeVisible();

        // Enable Chaos
        await page.getByRole('button', { name: /Simulate System Failure/i }).click(); // Selector might need refining depending on actual button text/aria

        // Verify Warning
        await expect(page.getByText('Warning: API requests may now randomly fail')).toBeVisible();
    });

});
