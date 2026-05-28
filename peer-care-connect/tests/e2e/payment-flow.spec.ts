/**
 * E2E tests for payment flow
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test('should complete credit purchase', async ({ page }) => {
    // Navigate to credits page
    await page.goto('/credits');

    // Select credit package
    await page.click('button:has-text("£50")');

    // Proceed to checkout
    await page.click('button:has-text("Purchase Credits")');

    // Fill payment details
    await page.frameLocator('iframe[name*="card"]').fill('input[name="cardNumber"]', '4242 4242 4242 4242');
    await page.frameLocator('iframe[name*="card"]').fill('input[name="expiry"]', '12/25');
    await page.frameLocator('iframe[name*="card"]').fill('input[name="cvc"]', '123');

    // Complete payment
    await page.click('button:has-text("Complete Purchase")');

    // Verify success
    await expect(page.locator('text=Payment Successful')).toBeVisible();
    await expect(page.locator('text=Credits added to your account')).toBeVisible();
  });

  test('should handle payment failure', async ({ page }) => {
    await page.goto('/credits');
    await page.click('button:has-text("£50")');
    await page.click('button:has-text("Purchase Credits")');

    // Use declined card
    await page.frameLocator('iframe[name*="card"]').fill('input[name="cardNumber"]', '4000 0000 0000 0002');
    await page.frameLocator('iframe[name*="card"]').fill('input[name="expiry"]', '12/25');
    await page.frameLocator('iframe[name*="card"]').fill('input[name="cvc"]', '123');

    await page.click('button:has-text("Complete Purchase")');

    // Verify error message
    await expect(page.locator('text=Payment Failed')).toBeVisible();
    await expect(page.locator('text=Your card was declined')).toBeVisible();
  });

  test('should display payment history', async ({ page }) => {
    await page.goto('/payments');

    // Verify payment history is displayed
    await expect(page.locator('text=Payment History')).toBeVisible();
    await expect(page.locator('.payment-item')).toHaveCount(0); // Or check for actual payments
  });
});

