import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Wait for backend to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Wait for backend health check
  let retries = 30;
  while (retries > 0) {
    try {
      const response = await page.goto('http://localhost:3000/api/v1/health');
      if (response?.ok()) {
        console.log('Backend is ready');
        break;
      }
    } catch (error) {
      console.log(`Waiting for backend... (${retries} retries left)`);
      await page.waitForTimeout(1000);
      retries--;
    }
  }
  
  if (retries === 0) {
    throw new Error('Backend failed to start within timeout');
  }
  
  await browser.close();
}

export default globalSetup;