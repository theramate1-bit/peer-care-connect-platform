/**
 * E2E tests for practitioner journey
 */

import { test, expect } from '@playwright/test';

test.describe('Practitioner Journey', () => {
  test('should complete practitioner onboarding', async ({ page }) => {
    // Start registration
    await page.goto('/register');
    await page.click('button:has-text("Practitioner")');

    // OAuth signup (mocked or real)
    await page.click('button:has-text("Sign up with Google")');
    // Handle OAuth flow...

    // Complete onboarding steps
    await expect(page.locator('text=Complete Your Profile')).toBeVisible();

    // Step 1: Personal Information
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="phone"]', '+44 123 456 7890');
    await page.click('button:has-text("Next")');

    // Step 2: Professional Details
    await page.selectOption('select[name="profession"]', 'sports_therapist');
    await page.fill('input[name="yearsExperience"]', '5');
    await page.fill('textarea[name="bio"]', 'Experienced sports therapist');
    await page.click('button:has-text("Next")');

    // Step 3: Services & Pricing
    await page.fill('input[name="hourlyRate"]', '70');
    await page.click('button:has-text("Add Service")');
    await page.fill('input[name="serviceName"]', 'Sports Therapy');
    await page.selectOption('select[name="duration"]', '60');
    await page.fill('input[name="price"]', '70');
    await page.click('button:has-text("Save Service")');
    await page.click('button:has-text("Next")');

    // Step 4: Location
    await page.fill('input[name="location"]', 'London, UK');
    await page.click('button:has-text("Complete")');

    // Verify onboarding complete
    await expect(page.locator('text=Welcome to TheraMate')).toBeVisible();
  });

  test('should manage practitioner bookings', async ({ page }) => {
    // Login as practitioner
    await page.goto('/login');
    // ... login flow

    // Navigate to practice dashboard
    await page.goto('/practice/dashboard');

    // View bookings
    await page.click('text=Bookings');
    await expect(page.locator('.booking-list')).toBeVisible();

    // View booking details
    await page.click('.booking-item:first-child');
    await expect(page.locator('text=Client Information')).toBeVisible();
  });

  test('should update practitioner profile', async ({ page }) => {
    await page.goto('/profile');

    // Edit profile
    await page.click('button:has-text("Edit Profile")');
    await page.fill('textarea[name="bio"]', 'Updated bio');
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await expect(page.locator('text=Profile Updated')).toBeVisible();
  });
});

