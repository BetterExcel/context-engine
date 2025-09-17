import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CSV Upload and Selection E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should upload and parse comma-delimited CSV correctly', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/comma-delimited-utf8.csv');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Verify the data is displayed correctly
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    
    // Check that the entire data range is selected by default
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:D6');
  });

  test('should upload and parse semicolon-delimited CSV correctly', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/semicolon-delimited-utf8.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Verify semicolon-delimited data is parsed correctly
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    
    // Check default selection
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:D6');
  });

  test('should upload and parse tab-delimited CSV correctly', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/tab-delimited-utf8.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Verify tab-delimited data is parsed correctly
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    
    // Check default selection
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:D6');
  });

  test('should handle sparse data with intelligent selection', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/sparse-data.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Verify sparse data is displayed
    await expect(page.locator('text=Product')).toBeVisible();
    await expect(page.locator('text=Laptop')).toBeVisible();
    
    // Check that selection includes the full data range despite gaps
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText(/A1:[A-Z]+\d+/);
  });

  test('should handle headers-only CSV file', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/headers-only.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Verify headers are displayed
    await expect(page.locator('text=ID')).toBeVisible();
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    
    // Check selection for headers-only file
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:E1');
  });

  test('should handle no-headers CSV file', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/no-headers.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Verify data is displayed (first row should be treated as data)
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    
    // Check selection includes all data
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:E4');
  });

  test('should maintain selection state when switching sheets', async ({ page }) => {
    // This test would need a multi-sheet Excel file
    // For now, we'll test selection persistence with manual selection changes
    
    const filePath = path.join(__dirname, 'fixtures/files/comma-delimited-utf8.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Make a manual selection
    await page.locator('[data-testid="cell-A1"]').click();
    await page.locator('[data-testid="cell-B2"]').click({ modifiers: ['Shift'] });
    
    // Verify manual selection is applied
    const selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:B2');
    
    // Perform context analysis to ensure selection is maintained
    await page.locator('[data-testid="analyze-button"]').click();
    
    // Selection should still be the manual one
    await expect(selectionInfo).toContainText('A1:B2');
  });

  test('should reset to default selection when uploading new file', async ({ page }) => {
    // Upload first file
    const firstFilePath = path.join(__dirname, 'fixtures/files/comma-delimited-utf8.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(firstFilePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Make a manual selection
    await page.locator('[data-testid="cell-A1"]').click();
    await page.locator('[data-testid="cell-B2"]').click({ modifiers: ['Shift'] });
    
    let selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:B2');
    
    // Upload second file
    const secondFilePath = path.join(__dirname, 'fixtures/files/semicolon-delimited-utf8.csv');
    await fileInput.setInputFiles(secondFilePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Selection should reset to default for new file
    selectionInfo = page.locator('[data-testid="selection-info"]');
    await expect(selectionInfo).toContainText('A1:D6');
  });

  test('should provide context analysis with full data range by default', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/files/comma-delimited-utf8.csv');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    await expect(page.locator('[data-testid="spreadsheet-viewer"]')).toBeVisible({ timeout: 10000 });
    
    // Perform context analysis
    await page.locator('[data-testid="analyze-button"]').click();
    
    // Wait for analysis to complete
    await expect(page.locator('[data-testid="context-display"]')).toBeVisible({ timeout: 15000 });
    
    // Verify that analysis includes information about all the data
    const contextDisplay = page.locator('[data-testid="context-display"]');
    await expect(contextDisplay).toContainText(/Name|Age|City|Salary/);
    
    // Should mention multiple employees (indicating full dataset analysis)
    await expect(contextDisplay).toContainText(/John|Jane|Bob|Alice|Charlie/);
  });

  test('should handle CSV upload errors gracefully', async ({ page }) => {
    // Create a malformed CSV file for testing
    const malformedCSV = 'Name,Age\nJohn,30\nJane,25,Extra\nBob';
    
    // We would need to create this file dynamically or have it as a fixture
    // For now, let's test with an empty file
    const emptyFilePath = path.join(__dirname, 'fixtures/files/empty.csv');
    
    // Create empty file if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(emptyFilePath)) {
      fs.writeFileSync(emptyFilePath, '');
    }
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(emptyFilePath);
    
    // Should show error message
    await expect(page.locator('[data-testid="error-display"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=error')).toBeVisible();
  });
});