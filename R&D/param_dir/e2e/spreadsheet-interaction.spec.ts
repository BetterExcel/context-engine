import { test, expect } from '@playwright/test';
import { testFiles } from './fixtures/test-data';

test.describe('Spreadsheet Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.complexExcel);
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('should allow cell selection', async ({ page }) => {
    // Click on a cell
    await page.locator('[data-testid="cell-B2"]').click();
    
    // Verify cell is selected
    await expect(page.locator('[data-testid="cell-B2"]')).toHaveClass(/selected/);
    
    // Verify formula bar shows cell content
    const formulaBar = page.locator('[data-testid="formula-bar"]');
    await expect(formulaBar).toBeVisible();
  });

  test('should allow range selection', async ({ page }) => {
    // Select range A1:C3
    await page.locator('[data-testid="cell-A1"]').click();
    await page.locator('[data-testid="cell-C3"]').click({ modifiers: ['Shift'] });
    
    // Verify range is selected
    await expect(page.locator('[data-testid="selected-range"]')).toContainText('A1:C3');
    
    // Verify multiple cells are highlighted
    await expect(page.locator('[data-testid="cell-A1"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="cell-B2"]')).toHaveClass(/selected/);
    await expect(page.locator('[data-testid="cell-C3"]')).toHaveClass(/selected/);
  });

  test('should display formulas correctly', async ({ page }) => {
    // Click on a cell with formula
    await page.locator('[data-testid="cell-G2"]').click();
    
    // Formula bar should show the formula
    const formulaBar = page.locator('[data-testid="formula-bar"]');
    await expect(formulaBar).toContainText('=E2*F2');
    
    // Cell should show calculated value
    await expect(page.locator('[data-testid="cell-G2"]')).not.toContainText('=E2*F2');
  });

  test('should switch between sheets', async ({ page }) => {
    // Verify multiple sheet tabs are present
    await expect(page.locator('[data-testid="sheet-tab-Sales"]')).toBeVisible();
    await expect(page.locator('[data-testid="sheet-tab-Summary"]')).toBeVisible();
    
    // Click on Summary sheet
    await page.locator('[data-testid="sheet-tab-Summary"]').click();
    
    // Verify sheet content changed
    await expect(page.locator('text=Region')).toBeVisible();
    await expect(page.locator('text=Total Sales')).toBeVisible();
    
    // Switch back to Sales sheet
    await page.locator('[data-testid="sheet-tab-Sales"]').click();
    await expect(page.locator('text=Product')).toBeVisible();
  });

  test('should show data type indicators', async ({ page }) => {
    // Verify different data types are indicated
    await expect(page.locator('[data-testid="cell-A2"][data-type="text"]')).toBeVisible();
    await expect(page.locator('[data-testid="cell-E2"][data-type="number"]')).toBeVisible();
    await expect(page.locator('[data-testid="cell-A2"][data-type="date"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Click on starting cell
    await page.locator('[data-testid="cell-A1"]').click();
    
    // Use arrow keys to navigate
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="cell-B1"]')).toHaveClass(/selected/);
    
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="cell-B2"]')).toHaveClass(/selected/);
    
    // Use Shift+Arrow for range selection
    await page.keyboard.press('Shift+ArrowRight');
    await expect(page.locator('[data-testid="selected-range"]')).toContainText('B2:C2');
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test is only for mobile devices');
    }

    // Verify mobile-specific elements
    await expect(page.locator('[data-testid="mobile-toolbar"]')).toBeVisible();
    
    // Verify touch interactions work
    await page.locator('[data-testid="cell-A1"]').tap();
    await expect(page.locator('[data-testid="cell-A1"]')).toHaveClass(/selected/);
    
    // Verify horizontal scrolling works
    await page.locator('[data-testid="spreadsheet-container"]').swipe({ direction: 'left' });
  });
});