// @ts-check
import { test, expect } from '@playwright/test';

test.describe('HarvestWise Smoke Test @smoke', () => {
  test('launches browser and loads the HarvestWise application @smoke', async ({ page }) => {
    // 1. Open the HarvestWise application
    await page.goto('/');

    // 2. Confirm the page title is loaded correctly
    await expect(page).toHaveTitle(/HarvestWise/i);

    // 3. Confirm a stable visible HarvestWise UI element is rendered
    // Unauthenticated visits route to /login, displaying the primary auth heading
    const authHeading = page.getByRole('heading', { level: 1 });
    await expect(authHeading).toBeVisible();
  });
});
