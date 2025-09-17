import { test, expect } from '@playwright/test';
import { testFiles } from './fixtures/test-data';

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should upload Excel file successfully', async ({ page }) => {
    // Wait for the file upload component to be visible
    await expect(page.locator('[data-testid="file-upload-zone"]')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.simpleExcel);

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

    // Verify spreadsheet viewer is displayed
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();

    // Verify data is displayed correctly
    await expect(page.locator('text=Product')).toBeVisible();
    await expect(page.locator('text=Apple')).toBeVisible();
    await expect(page.locator('text=Banana')).toBeVisible();
  });

  test('should upload CSV file successfully', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.csvFile);

    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();

    // Verify CSV data
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=John')).toBeVisible();
  });

  test('should handle invalid file format', async ({ page }) => {
    // Create a text file
    const invalidFile = Buffer.from('This is not a spreadsheet');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([{
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: invalidFile
    }]);

    // Should show error message
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=supported format')).toBeVisible();
  });

  test('should handle large file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.largeFile);

    // Should show loading state
    await expect(page.locator('[data-testid="upload-loading"]')).toBeVisible();

    // Wait for completion (longer timeout for large file)
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible();
  });
});