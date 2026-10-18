import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
    },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});


