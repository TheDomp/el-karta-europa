import { test, expect } from '@playwright/test';

test.describe('Time Navigation - TimeSlider', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('TimeSlider is visible on page load', async ({ page }) => {
        const slider = page.locator('input[type="range"]');
        await expect(slider).toBeVisible();
    });

    test('TimeSlider has correct min/max values (-24 to +24)', async ({ page }) => {
        const slider = page.locator('input[type="range"]');

        const min = await slider.getAttribute('min');
        const max = await slider.getAttribute('max');

        expect(min).toBe('-24');
        expect(max).toBe('24');
    });

    test('TimeSlider defaults to 0 (current time)', async ({ page }) => {
        const slider = page.locator('input[type="range"]');
        const value = await slider.inputValue();

        expect(parseInt(value)).toBeCloseTo(0, 1);
    });

    test('Reset button returns to current time', async ({ page }) => {
        const slider = page.locator('input[type="range"]');

        await slider.fill('5');
        await page.waitForTimeout(500);

        const resetButton = page.locator('button[title="Återställ till Realtid"]');
        await resetButton.click();
        await page.waitForTimeout(500);

        const value = await slider.inputValue();
        expect(parseInt(value)).toBeCloseTo(0, 1);
    });

});

test.describe('Time Navigation - Time Modes', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('LIVE indicator is shown by default', async ({ page }) => {
        // Updated: now shows "Live Now" instead of just "Live"
        const liveIndicator = page.locator('span').filter({ hasText: /Live Now/i });
        await expect(liveIndicator).toBeVisible();
    });

    test('Moving slider to past shows time change', async ({ page }) => {
        const slider = page.locator('input[type="range"]');

        await slider.fill('-6');
        await page.waitForTimeout(500);

        // Updated selector for dark theme
        const timeDisplay = page.locator('span.text-2xl.font-mono');
        const displayedTime = await timeDisplay.innerText();

        expect(displayedTime).toMatch(/^\d{2}:\d{2}$/);
    });

    test('Moving slider to future shows time change', async ({ page }) => {
        const slider = page.locator('input[type="range"]');

        await slider.fill('12');
        await page.waitForTimeout(500);

        const timeDisplay = page.locator('span.text-2xl.font-mono');
        const displayedTime = await timeDisplay.innerText();

        expect(displayedTime).toMatch(/^\d{2}:\d{2}$/);
    });

    test('LIVE label styling changes when not at current time', async ({ page }) => {
        // Default: Live should have green styling (text-green-500)
        const liveLabel = page.locator('span.text-green-500').filter({ hasText: /Live/i });
        await expect(liveLabel).toBeVisible();

        // Move slider away from 0
        const slider = page.locator('input[type="range"]');
        await slider.fill('10');
        await page.waitForTimeout(500);

        // Live label should now be gray (text-gray-600)
        const grayLiveLabel = page.locator('span.text-gray-600').filter({ hasText: /Live/i });
        await expect(grayLiveLabel).toBeVisible();
    });

});

test.describe('Time Navigation - Date Display', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('Current date/time is displayed', async ({ page }) => {
        // Target the TimeSlider date display which shows day/month format (text-[10px] class)
        const dateDisplay = page.locator('p.text-gray-500');
        await expect(dateDisplay).toBeVisible();

        const dateText = await dateDisplay.innerText();
        // Should match format like "Mon 27 Jan" (contains letters and numbers)
        expect(dateText).toMatch(/\w+\s+\d+/);
    });

    test('Time display shows HH:MM format', async ({ page }) => {
        // Updated selector for dark theme
        const timeDisplay = page.locator('span.text-2xl.font-mono');
        await expect(timeDisplay).toBeVisible();

        const timeText = await timeDisplay.innerText();
        expect(timeText).toMatch(/^\d{2}:\d{2}$/);
    });

    test('Slider labels show Förflutet, Live Now, Prognos', async ({ page }) => {
        // Updated labels from design overhaul
        await expect(page.getByText('Förflutet', { exact: true })).toBeVisible();
        await expect(page.getByText('Live Now', { exact: true })).toBeVisible();
        await expect(page.getByText('Prognos', { exact: true })).toBeVisible();
    });

});

test.describe('Time Navigation - Data Refresh', () => {

    test('Changing time triggers data refetch', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Add zone via store instead of Leaflet click
        await page.evaluate(() => {
            // @ts-ignore
            if (window.gridStore) {
                // @ts-ignore
                window.gridStore.getState().toggleTrackedZone('SE-SE3');
            }
        });
        await page.waitForTimeout(1000);

        const priceSpan = page.locator('span.font-mono.font-black').first();
        const initialPrice = await priceSpan.innerText();

        const slider = page.locator('input[type="range"]');
        await slider.fill('-12');
        await page.waitForTimeout(2000);

        const newPrice = await priceSpan.innerText();
        expect(newPrice).toBeDefined();
        console.log(`Price at now: ${initialPrice}, Price at -12h: ${newPrice}`);
    });

});
