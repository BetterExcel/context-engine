import { test, expect } from '@playwright/test';
import { testFiles } from './fixtures/test-data';

test.describe('Performance Tests', () => {
  test('should handle large file upload within acceptable time', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.largeFile);
    
    // Wait for upload and parsing to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
    
    const endTime = Date.now();
    const uploadTime = endTime - startTime;
    
    // Should complete within 30 seconds
    expect(uploadTime).toBeLessThan(30000);
    
    // Verify spreadsheet is rendered
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();
  });

  test('should render large spreadsheet efficiently', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.largeFile);
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
    
    const startTime = Date.now();
    
    // Scroll through the spreadsheet
    const spreadsheetContainer = page.locator('[data-testid="spreadsheet-container"]');
    
    // Scroll down multiple times
    for (let i = 0; i < 10; i++) {
      await spreadsheetContainer.evaluate(el => el.scrollTop += 500);
      await page.waitForTimeout(100);
    }
    
    const endTime = Date.now();
    const scrollTime = endTime - startTime;
    
    // Scrolling should be smooth (less than 2 seconds for 10 scrolls)
    expect(scrollTime).toBeLessThan(2000);
  });

  test('should analyze context for large dataset efficiently', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.largeFile);
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
    
    // Select a large range
    await page.locator('[data-testid="cell-A1"]').click();
    await page.locator('[data-testid="cell-E100"]').click({ modifiers: ['Shift'] });
    
    const startTime = Date.now();
    
    const requestInput = page.locator('[data-testid="request-input"]');
    await requestInput.fill('Analyze the patterns in this large dataset');
    
    await page.locator('[data-testid="analyze-button"]').click();
    
    // Wait for analysis to complete
    await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 60000 });
    
    const endTime = Date.now();
    const analysisTime = endTime - startTime;
    
    // Analysis should complete within 60 seconds
    expect(analysisTime).toBeLessThan(60000);
    
    // Verify context was generated
    await expect(page.locator('[data-testid="context-immediate"]')).toBeVisible();
  });

  test('should handle concurrent requests', async ({ page, context }) => {
    // Create multiple pages for concurrent testing
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    // Upload files concurrently
    const uploadPromises = pages.map(async (p, index) => {
      await p.goto('/');
      const fileInput = p.locator('input[type="file"]');
      await fileInput.setInputFiles(testFiles.simpleExcel);
      return p.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });
    });
    
    const startTime = Date.now();
    await Promise.all(uploadPromises);
    const endTime = Date.now();
    
    const concurrentTime = endTime - startTime;
    
    // Concurrent uploads should not take significantly longer than single upload
    expect(concurrentTime).toBeLessThan(20000);
    
    // Cleanup
    await Promise.all(pages.map(p => p.close()));
  });

  test('should maintain performance with multiple analyses', async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.complexExcel);
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    
    const requests = [
      'Help me create a SUM formula',
      'What patterns do you see in this data?',
      'How can I format these cells?',
      'Explain this spreadsheet structure',
      'Find any errors in the formulas'
    ];
    
    const startTime = Date.now();
    
    // Perform multiple analyses sequentially
    for (const request of requests) {
      const requestInput = page.locator('[data-testid="request-input"]');
      await requestInput.fill(request);
      
      await page.locator('[data-testid="analyze-button"]').click();
      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 20000 });
      
      // Wait a bit before next request
      await page.waitForTimeout(1000);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Multiple analyses should complete within reasonable time (2 minutes)
    expect(totalTime).toBeLessThan(120000);
  });
});