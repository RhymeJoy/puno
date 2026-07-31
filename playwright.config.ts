import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',
  outputDir: './test-results',
  snapshotDir: './tests/visual/snapshots',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'zh-TW',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.005,
    },
  },
  webServer: {
    command: 'node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
