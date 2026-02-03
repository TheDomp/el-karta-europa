import { defineConfig, devices } from '@playwright/test';


// Check if we are running against a specific URL (Prod) or Localhost
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
// Only start local server if we are NOT using a custom BASE_URL (i.e. we are testing locally)
const hasCustomBaseUrl = !!process.env.BASE_URL;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        trace: 'on-first-retry',
        baseURL: baseURL,
    },

    projects: [
        {
            name: 'Testmiljö (Local)',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://127.0.0.1:5173'
            },
        },
        {
            name: 'Prodmiljö (Live)',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'https://el-karta-europa.web.app'
            },
        },
    ],

    // Run your local dev server before starting the tests (ONLY for Local/Testmiljö)
    webServer: hasCustomBaseUrl ? undefined : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
    },
});
