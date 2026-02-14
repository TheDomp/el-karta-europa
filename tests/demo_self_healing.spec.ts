import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generatePriceXml(price: number) {
    let points = '';
    for (let i = 1; i <= 24; i++) {
        points += `<Point><position>${i}</position><price.amount>${price}</price.amount></Point>`;
    }
    return `<Publication_MarketDocument><TimeSeries><Period><resolution>PT60M</resolution>${points}</Period></TimeSeries></Publication_MarketDocument>`;
}

test.use({ headless: false });

test.describe('🤖 Self-Healing Agent Demo', () => {

    test('Agent discovers broken deploy and repairs it', async ({ page }) => {
        test.slow();

        // --- VISUAL HELPER ---
        async function highlight(locator: any, color = '#00E5FF', ms = 1500) {
            try {
                await locator.evaluate((el: HTMLElement, c: string) => {
                    el.style.transition = 'all 0.3s ease';
                    el.style.outline = `4px solid ${c}`;
                    el.style.outlineOffset = '2px';
                    el.style.boxShadow = `0 0 25px ${c}`;
                }, color);
                await page.waitForTimeout(ms);
                await locator.evaluate((el: HTMLElement) => {
                    el.style.outline = '';
                    el.style.outlineOffset = '';
                    el.style.boxShadow = '';
                });
            } catch { /* skip */ }
        }

        // ==========================================================
        // SETUP: Simulate a broken deployment
        // The app loads ALREADY broken:
        //   1. API returns crisis-level prices (bad data pipeline)
        //   2. JÄMFÖR button is missing (broken component from bad merge)
        // ==========================================================

        const CRISIS_PRICE = 325;

        // Mock: API already returns crisis prices
        await page.route('**/entsoe-api?*documentType=A44*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/xml',
                body: generatePriceXml(CRISIS_PRICE),
            });
        });

        // Load app
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Immediately remove the JÄMFÖR button (simulating it was never deployed)
        await page.evaluate(() => {
            // Watch for button and remove it as soon as it appears
            const observer = new MutationObserver(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.innerText.includes('JÄMFÖR'));
                if (btn) { btn.remove(); observer.disconnect(); }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            // Also remove if already present
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('JÄMFÖR'));
            if (btn) btn.remove();
        });

        // ==========================================================
        // AGENT TEST: Begins normal QA flow
        // ==========================================================

        console.log("\n🤖 Agent QA Test: Starting routine checks...\n");

        // Step 1: Select zones for testing
        console.log("[Agent] Selecting zone SE-SE3...");
        await page.evaluate(() => {
            // @ts-ignore
            const s = window.gridStore?.getState();
            if (s && !s.trackedZones.includes('SE-SE3')) s.toggleTrackedZone('SE-SE3');
        });
        await page.waitForTimeout(1500);

        const se3 = page.locator('button', { hasText: 'SE-SE3' });
        await expect(se3).toBeVisible({ timeout: 5000 });

        // Agent checks the price — discovers it's abnormally high
        try {
            const priceEl = se3.locator('div.font-mono').first();
            const priceText = await priceEl.innerText({ timeout: 3000 });
            const price = parseFloat(priceText);
            console.log(`[Agent] SE-SE3 price: ${price} EUR/MWh`);

            if (price > 200) {
                console.log("[Agent] ⚠️  ANOMALY: Price exceeds 200 EUR/MWh threshold!");
                await highlight(se3, '#dc2626', 2000); // Red
            } else {
                await highlight(se3, '#059669', 1500); // Green
            }
        } catch {
            console.log("[Agent] ⚠️  Could not read SE-SE3 price data");
            await highlight(se3, '#f59e0b', 1500); // Orange
        }

        console.log("[Agent] Selecting zone SE-SE4...");
        await page.evaluate(() => {
            // @ts-ignore
            const s = window.gridStore?.getState();
            if (s && !s.trackedZones.includes('SE-SE4')) s.toggleTrackedZone('SE-SE4');
        });
        await page.waitForTimeout(1500);

        const se4 = page.locator('button', { hasText: 'SE-SE4' });
        await expect(se4).toBeVisible({ timeout: 5000 });

        try {
            const priceEl = se4.locator('div.font-mono').first();
            const priceText = await priceEl.innerText({ timeout: 3000 });
            const price = parseFloat(priceText);
            console.log(`[Agent] SE-SE4 price: ${price} EUR/MWh`);

            if (price > 200) {
                console.log("[Agent] ⚠️  ANOMALY: Price exceeds 200 EUR/MWh threshold!");
                await highlight(se4, '#dc2626', 2000);
            } else {
                await highlight(se4, '#059669', 1500);
            }
        } catch {
            console.log("[Agent] ⚠️  Could not read SE-SE4 price data");
            await highlight(se4, '#f59e0b', 1500);
        }

        // Re-remove JÄMFÖR in case React re-rendered it
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find(b => b.innerText.includes('JÄMFÖR'));
            if (btn) btn.remove();
        });

        // Step 2: Agent tries to use the Compare feature
        console.log("[Agent] Looking for 'JÄMFÖR' button...");
        await page.waitForTimeout(1000);

        const compareBtn = page.locator('button', { hasText: 'JÄMFÖR' });
        let buttonMissing = false;

        try {
            await expect(compareBtn).toBeVisible({ timeout: 3000 });
            console.log("[Agent] ✅ 'JÄMFÖR' button found.");
        } catch {
            buttonMissing = true;
            console.log("[Agent] ❌ 'JÄMFÖR' button NOT FOUND — UI regression detected!");
            await page.waitForTimeout(1500);
        }

        // ==========================================================
        // AGENT: Report findings
        // ==========================================================
        console.log("\n[Agent] 📋 === TEST RESULTS ===");
        console.log(`[Agent] Price check: ${CRISIS_PRICE} EUR/MWh — FAIL (exceeds threshold)`);
        console.log(`[Agent] UI check: JÄMFÖR button — ${buttonMissing ? 'FAIL (missing)' : 'PASS'}`);
        console.log("[Agent] Result: 2 issues found. Initiating self-repair...\n");
        await page.waitForTimeout(2000);

        // ==========================================================
        // SELF-HEALING: Agent repairs what it can
        // ==========================================================

        if (buttonMissing) {
            console.log("[Agent] 🛠️  Injecting replacement JÄMFÖR button...");
            await page.evaluate(() => {
                const btn = document.createElement('button');
                btn.id = 'ai-fixed-button';
                btn.style.cssText = `
                    position:fixed; bottom:32px; right:32px; z-index:9999;
                    background:linear-gradient(135deg, #059669, #10b981);
                    color:white; font-weight:900; font-size:14px;
                    padding:16px 28px; border-radius:9999px;
                    border:3px solid rgba(255,255,255,0.3);
                    box-shadow:0 0 40px rgba(16,185,129,0.6), 0 8px 32px rgba(0,0,0,0.3);
                    cursor:pointer; display:flex; align-items:center; gap:12px;
                    font-family:system-ui, sans-serif;
                `;
                btn.innerHTML = `
                    <span style="background:rgba(255,255,255,0.2);padding:8px;border-radius:50%;display:flex;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </span>
                    <span>
                        <div style="font-size:9px;text-transform:uppercase;opacity:0.7;">AI Hotfix</div>
                        <div>JÄMFÖR (RESTORED)</div>
                    </span>
                `;
                document.body.appendChild(btn);
            });
            await page.waitForTimeout(2000);

            const fixed = page.locator('#ai-fixed-button');
            await expect(fixed).toBeVisible();
            await highlight(fixed, '#10b981', 2000);
            console.log("[Agent] ✅ JÄMFÖR button restored.");

            // Click to verify it works
            await fixed.click({ force: true });
            await page.waitForTimeout(1000);
            console.log("[Agent] ✅ Button click verified.");
        }

        console.log("[Agent] 📢 Crisis pricing alert sent to operators.");
        await page.waitForTimeout(2000);

        // ==========================================================
        // FINAL REPORT
        // ==========================================================
        console.log("\n[Agent] ✅ === SELF-HEALING COMPLETE ===");
        console.log("[Agent] 2 issues detected, 2 issues resolved.\n");

        // Write report file
        const report = `# 🛠️ Agentic AI Repair Report
**Date:** ${new Date().toISOString()}
**Agent:** Self-Healing QA Agent v1.0
**Environment:** El Karta Europa (Dev)

## Issues Found

### #1: Crisis Pricing (Data Pipeline Issue)
- **Zone:** SE-SE3, SE-SE4
- **Price:** ${CRISIS_PRICE} EUR/MWh (threshold: 200)
- **Action:** Operators notified, monitoring activated
- **Status:** ✅ Flagged

### #2: Missing UI Component (Deployment Regression)
- **Element:** 'JÄMFÖR' (Compare) button
- **Cause:** Broken merge in latest deploy
- **Action:** Runtime DOM patch applied
- **Status:** ✅ Restored

## Recommendations
1. Rollback latest deployment to restore JÄMFÖR button
2. Investigate data pipeline for price anomalies
3. Add pre-deploy UI regression checks to CI/CD
`;
        const rp = path.resolve(__dirname, '../agent_repair_report.md');
        fs.writeFileSync(rp, report);
        console.log(`[Agent] 📄 Report saved: ${rp}`);
    });

});
