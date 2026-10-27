import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    env: { LAMBDA_API_URL: '', LAMBDA_API_KEY: '', DEMO_AUTH_ENABLED: 'true' },
    timeout: 120000,
  },
});
