import { test, expect } from '@playwright/test';
import { testFiles, testRequests, expectedContextTypes } from './fixtures/test-data';

test.describe('Context Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Upload test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.simpleExcel);
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('should analyze formula assistance request', async ({ page }) => {
    // Select a cell range
    await page.locator('[data-testid="cell-B2"]').click();
    await page.locator('[data-testid="cell-C4"]').click({ modifiers: ['Shift'] });

    // Enter request
    const requestInput = page.locator('[data-testid="request-input"]');
    await requestInput.fill(testRequests.formulaAssistance);

    // Submit request
    await page.locator('[data-testid="analyze-button"]').click();

    // Wait for analysis to complete
    await expect(page.locator('[data-testid="analysis-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

    // Verify context contains expected sections
    for (const contextType of expectedContextTypes) {
      await expect(page.locator(`[data-testid="context-${contextType}"]`)).toBeVisible();
    }

    // Verify intent classification
    await expect(page.locator('text=formula_assistance')).toBeVisible();

    // Verify confidence score is displayed
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
  });

  test('should analyze data analysis request', async ({ page }) => {
    // Select entire data range
    await page.locator('[data-testid="cell-A1"]').click();
    await page.locator('[data-testid="cell-D5"]').click({ modifiers: ['Shift'] });

    const requestInput = page.locator('[data-testid="request-input"]');
    await requestInput.fill(testRequests.dataAnalysis);

    await page.locator('[data-testid="analyze-button"]').click();

    await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

    // Verify data analysis specific context
    await expect(page.locator('text=data_analysis')).toBeVisible();
    await expect(page.locator('[data-testid="data-patterns"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-summary"]')).toBeVisible();
  });

  test('should handle ambiguous requests', async ({ page }) => {
    const requestInput = page.locator('[data-testid="request-input"]');
    await requestInput.fill('help me with this');

    await page.locator('[data-testid="analyze-button"]').click();

    // Should show clarification questions or lower confidence
    await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
    
    const confidenceScore = page.locator('[data-testid="confidence-score"]');
    await expect(confidenceScore).toBeVisible();
    
    // Confidence should be lower for ambiguous requests
    const confidenceText = await confidenceScore.textContent();
    const confidence = parseFloat(confidenceText?.match(/[\d.]+/)?.[0] || '0');
    expect(confidence).toBeLessThan(0.8);
  });

  test('should display natural language context', async ({ page }) => {
    await page.locator('[data-testid="cell-A1"]').click();
    
    const requestInput = page.locator('[data-testid="request-input"]');
    await requestInput.fill(testRequests.general);

    await page.locator('[data-testid="analyze-button"]').click();

    await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });

    // Switch to natural language view
    await page.locator('[data-testid="natural-language-tab"]').click();
    
    // Verify natural language description is present
    await expect(page.locator('[data-testid="natural-language-content"]')).toBeVisible();
    await expect(page.locator('text=spreadsheet')).toBeVisible();
    await expect(page.locator('text=data')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/analyze-context', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    const requestInput = page.locator('[data-testid="request-input"]');
    await requestInput.fill(testRequests.formulaAssistance);

    await page.locator('[data-testid="analyze-button"]').click();

    // Should show error message
    await expect(page.locator('[data-testid="error-display"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=error')).toBeVisible();
  });
});