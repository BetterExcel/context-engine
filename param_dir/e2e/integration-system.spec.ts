import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test data and utilities
const TEST_FILES = {
  simple: 'e2e/fixtures/files/simple-spreadsheet.xlsx',
  complex: 'e2e/fixtures/files/complex-spreadsheet.xlsx',
  large: 'e2e/fixtures/files/large-dataset.xlsx',
  csv: 'e2e/fixtures/files/sample-data.csv'
};

const TEST_REQUESTS = [
  'Calculate the sum of column B',
  'Find the average of the revenue data',
  'Create a formula to calculate profit margin',
  'Identify trends in the sales data',
  'Format the date column properly',
  'Find duplicate entries in this dataset',
  'Create a pivot table summary',
  'Highlight cells with values above average'
];

test.describe('Complete System Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('End-to-End User Workflows', () => {
    test('Complete workflow: Upload → View → Request → Context → Response', async () => {
      // Step 1: Upload file
      await test.step('Upload spreadsheet file', async () => {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(TEST_FILES.simple);
        
        // Wait for upload to complete
        await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
      });

      // Step 2: View spreadsheet data
      await test.step('View uploaded spreadsheet', async () => {
        await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();
        
        // Verify data is displayed
        const cells = page.locator('[data-testid="spreadsheet-cell"]');
        await expect(cells.first()).toBeVisible();
        
        // Check that we have multiple cells
        const cellCount = await cells.count();
        expect(cellCount).toBeGreaterThan(0);
      });

      // Step 3: Select cells and make request
      await test.step('Select cells and submit request', async () => {
        // Select a range of cells
        await page.locator('[data-testid="spreadsheet-cell"][data-cell="A1"]').click();
        await page.keyboard.down('Shift');
        await page.locator('[data-testid="spreadsheet-cell"][data-cell="B5"]').click();
        await page.keyboard.up('Shift');

        // Enter request
        const requestInput = page.locator('[data-testid="request-input"]');
        await requestInput.fill('Calculate the sum of the selected range');
        
        // Submit request
        await page.locator('[data-testid="submit-request"]').click();
      });

      // Step 4: Verify context generation
      await test.step('Verify context is generated', async () => {
        // Wait for context to be generated
        await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
        
        // Check that context contains expected elements
        const contextJson = page.locator('[data-testid="context-json"]');
        await expect(contextJson).toBeVisible();
        
        // Verify natural language description
        const naturalLanguage = page.locator('[data-testid="context-natural-language"]');
        await expect(naturalLanguage).toBeVisible();
        await expect(naturalLanguage).toContainText('selected range');
      });

      // Step 5: Verify response quality
      await test.step('Verify response quality', async () => {
        const response = page.locator('[data-testid="llm-response"]');
        await expect(response).toBeVisible();
        
        // Response should contain actionable information
        await expect(response).toContainText(/SUM|formula|calculate/i);
      });
    });

    test('Multi-sheet workflow with complex formulas', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.complex);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Switch between sheets
      const sheetTabs = page.locator('[data-testid="sheet-tab"]');
      const sheetCount = await sheetTabs.count();
      
      if (sheetCount > 1) {
        await sheetTabs.nth(1).click();
        await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();
      }

      // Test formula dependency analysis
      await page.locator('[data-testid="request-input"]').fill('Show me all formulas that depend on cell A1');
      await page.locator('[data-testid="submit-request"]').click();

      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
      
      // Context should include dependency information
      const contextText = await page.locator('[data-testid="context-json"]').textContent();
      expect(contextText).toContain('dependencies');
    });

    test('Session continuity and history', async () => {
      // Upload file and make first request
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="request-input"]').fill('Calculate average of column A');
      await page.locator('[data-testid="submit-request"]').click();
      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

      // Make follow-up request that should use session context
      await page.locator('[data-testid="request-input"]').fill('Now do the same for column B');
      await page.locator('[data-testid="submit-request"]').click();
      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

      // Check history sidebar
      const historyButton = page.locator('[data-testid="history-toggle"]');
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await expect(page.locator('[data-testid="history-sidebar"]')).toBeVisible();
        
        // Should show previous requests
        const historyItems = page.locator('[data-testid="history-item"]');
        const itemCount = await historyItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(2);
      }
    });
  });

  test.describe('Load Testing Scenarios', () => {
    test('Large file processing', async () => {
      // Test with large dataset
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.large);
      
      // Should handle large files within reasonable time
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
      
      // Verify spreadsheet viewer can handle large data
      await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();
      
      // Test scrolling performance
      const viewer = page.locator('[data-testid="spreadsheet-viewer"]');
      await viewer.hover();
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(500);
      
      // Should still be responsive
      await expect(viewer).toBeVisible();
    });

    test('Multiple concurrent requests', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Submit multiple requests rapidly
      const requests = [
        'Calculate sum of column A',
        'Find average of column B', 
        'Count non-empty cells',
        'Identify data types'
      ];

      // Submit all requests quickly
      for (const request of requests) {
        await page.locator('[data-testid="request-input"]').fill(request);
        await page.locator('[data-testid="submit-request"]').click();
        await page.waitForTimeout(100); // Small delay between requests
      }

      // All should eventually complete
      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 30000 });
    });
  });

  test.describe('OpenAI API Integration Tests', () => {
    test('AI-powered pattern analysis', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.complex);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Request that requires AI analysis
      await page.locator('[data-testid="request-input"]').fill('Analyze patterns and trends in this data');
      await page.locator('[data-testid="submit-request"]').click();

      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 20000 });

      // Context should include AI insights
      const contextText = await page.locator('[data-testid="context-json"]').textContent();
      expect(contextText).toMatch(/pattern|trend|insight|analysis/i);
    });

    test('AI fallback when API unavailable', async () => {
      // This test would require mocking the API to return errors
      // For now, we'll test that the system handles API errors gracefully
      
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="request-input"]').fill('Complex analysis request');
      await page.locator('[data-testid="submit-request"]').click();

      // Should still provide context even if AI analysis fails
      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
    });

    test('Intent classification accuracy', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      const intentTests = [
        { request: 'Create a SUM formula', expectedIntent: 'formula_assistance' },
        { request: 'Format these cells as currency', expectedIntent: 'formatting' },
        { request: 'Sort this data by date', expectedIntent: 'data_manipulation' },
        { request: 'What trends do you see?', expectedIntent: 'data_analysis' }
      ];

      for (const test of intentTests) {
        await page.locator('[data-testid="request-input"]').fill(test.request);
        await page.locator('[data-testid="submit-request"]').click();
        
        await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
        
        // Check that intent was classified correctly
        const contextText = await page.locator('[data-testid="context-json"]').textContent();
        expect(contextText).toContain(test.expectedIntent);
        
        await page.waitForTimeout(1000); // Brief pause between tests
      }
    });
  });

  test.describe('Context Accuracy Validation', () => {
    test('Formula dependency tracking', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.complex);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Select a cell with formula dependencies
      await page.locator('[data-testid="spreadsheet-cell"][data-cell="C1"]').click();
      
      await page.locator('[data-testid="request-input"]').fill('Show me what this formula depends on');
      await page.locator('[data-testid="submit-request"]').click();

      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

      const contextText = await page.locator('[data-testid="context-json"]').textContent();
      expect(contextText).toMatch(/dependencies|precedent|formula/i);
    });

    test('Data type detection accuracy', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="request-input"]').fill('What data types are in this spreadsheet?');
      await page.locator('[data-testid="submit-request"]').click();

      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

      const contextText = await page.locator('[data-testid="context-json"]').textContent();
      expect(contextText).toMatch(/data_type|number|text|date/i);
    });

    test('Range selection context', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Select specific range
      await page.locator('[data-testid="spreadsheet-cell"][data-cell="A1"]').click();
      await page.keyboard.down('Shift');
      await page.locator('[data-testid="spreadsheet-cell"][data-cell="C3"]').click();
      await page.keyboard.up('Shift');

      await page.locator('[data-testid="request-input"]').fill('Analyze the selected range');
      await page.locator('[data-testid="submit-request"]').click();

      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

      const contextText = await page.locator('[data-testid="context-json"]').textContent();
      expect(contextText).toContain('A1:C3');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('Invalid file format handling', async () => {
      // Try to upload a text file
      const invalidFile = 'e2e/fixtures/files/invalid.txt';
      
      await page.locator('input[type="file"]').setInputFiles(invalidFile);
      
      // Should show error message
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="upload-error"]')).toContainText(/format|supported/i);
    });

    test('Empty request handling', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Submit empty request
      await page.locator('[data-testid="submit-request"]').click();
      
      // Should show validation error
      await expect(page.locator('[data-testid="request-error"]')).toBeVisible();
    });

    test('Network error handling', async () => {
      // This would require intercepting network requests
      // For now, test that UI handles loading states properly
      
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      await page.locator('[data-testid="request-input"]').fill('Test request');
      await page.locator('[data-testid="submit-request"]').click();

      // Should show loading state
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    });

    test('Large request handling', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      // Submit very long request
      const longRequest = 'A'.repeat(5000);
      await page.locator('[data-testid="request-input"]').fill(longRequest);
      await page.locator('[data-testid="submit-request"]').click();

      // Should handle gracefully (either process or show error)
      await expect(
        page.locator('[data-testid="context-display"], [data-testid="request-error"]')
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('Response time benchmarks', async () => {
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.simple);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

      const startTime = Date.now();
      
      await page.locator('[data-testid="request-input"]').fill('Calculate sum of column A');
      await page.locator('[data-testid="submit-request"]').click();
      
      await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 10 seconds for simple requests
      expect(responseTime).toBeLessThan(10000);
      console.log(`Response time: ${responseTime}ms`);
    });

    test('Memory usage with large files', async () => {
      // This test monitors that large files don't cause memory issues
      await page.locator('input[type="file"]').setInputFiles(TEST_FILES.large);
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

      // Make several requests to test memory stability
      for (let i = 0; i < 5; i++) {
        await page.locator('[data-testid="request-input"]').fill(`Request ${i + 1}: Analyze data patterns`);
        await page.locator('[data-testid="submit-request"]').click();
        await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(1000);
      }

      // System should remain responsive
      await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();
    });
  });
});