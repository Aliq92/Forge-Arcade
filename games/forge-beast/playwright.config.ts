import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', testMatch: 'integration.browser.spec.ts', timeout: 30000,
    use: { baseURL: process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8420', headless: true },
});
