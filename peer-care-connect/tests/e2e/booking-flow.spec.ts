/**
 * E2E tests for booking flow
 */

import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/marketplace');
  });

  test('should complete booking flow as authenticated client', async ({ page }) => {
    // 1. Search for therapist
    await page.fill('input[placeholder*="search" i]', 'sports therapist');
    await page.click('button:has-text("Search")');

    // 2. Select a therapist
    await page.click('.therapist-card:first-child');

    // 3. Click book session
    await page.click('button:has-text("Book Session")');

    // 4. Select service
    await page.click('button:has-text("60 min")');

    // 5. Select date
    await page.click('input[type="date"]');
    // Select a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.fill('input[type="date"]', futureDate.toISOString().split('T')[0]);

    // 6. Select time slot
    await page.click('.time-slot:first-child');

    // 7. Add notes (optional)
    await page.fill('textarea[placeholder*="notes" i]', 'Test booking notes');

    // 8. Proceed to payment
    await page.click('button:has-text("Continue to Payment")');

    // 9. Fill payment details (using test card)
    await page.frameLocator('iframe[name*="card"]').fill('input[name="cardNumber"]', '4242 4242 4242 4242');
    await page.frameLocator('iframe[name*="card"]').fill('input[name="expiry"]', '12/25');
    await page.frameLocator('iframe[name*="card"]').fill('input[name="cvc"]', '123');

    // 10. Confirm booking
    await page.click('button:has-text("Confirm Booking")');

    // 11. Verify booking success
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    await expect(page.locator('text=Your session has been booked')).toBeVisible();
  });

  test('should handle booking cancellation', async ({ page }) => {
    // Navigate to bookings page
    await page.goto('/my-bookings');

    // Find a booking
    const bookingCard = page.locator('.booking-card:first-child');
    await expect(bookingCard).toBeVisible();

    // Click cancel
    await bookingCard.locator('button:has-text("Cancel")').click();

    // Confirm cancellation
    await page.click('button:has-text("Confirm Cancellation")');

    // Verify cancellation
    await expect(page.locator('text=Booking Cancelled')).toBeVisible();
  });

  test('should show booking details', async ({ page }) => {
    await page.goto('/my-bookings');

    // Click on a booking
    await page.click('.booking-card:first-child');

    // Verify booking details are displayed
    await expect(page.locator('text=Session Details')).toBeVisible();
    await expect(page.locator('text=Date')).toBeVisible();
    await expect(page.locator('text=Time')).toBeVisible();
    await expect(page.locator('text=Duration')).toBeVisible();
  });
});

