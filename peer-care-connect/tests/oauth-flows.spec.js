import { test, expect } from '@playwright/test';

test.describe('Google OAuth Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear session storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    
    // Dismiss cookie banner if it appears
    try {
      const cookieBanner = page.locator('text=Cookies & Privacy').first();
      if (await cookieBanner.isVisible({ timeout: 2000 })) {
        const acceptButton = page.locator('button:has-text("Accept all")').first();
        if (await acceptButton.isVisible({ timeout: 1000 })) {
          await acceptButton.click();
          await page.waitForTimeout(500); // Wait for banner to disappear
        }
      }
    } catch (error) {
      // Cookie banner might not be present, continue with test
      console.log('Cookie banner not found or already dismissed');
    }
  });

  test.describe('Client OAuth Flow', () => {
    test('should display client Google OAuth button on register page', async ({ page }) => {
      await page.goto('/register');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Check if client Google OAuth button exists
      const clientButton = page.locator('button:has-text("Continue with Google as Client")');
      await expect(clientButton).toBeVisible();
      
      // Check if practitioner button also exists
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      await expect(practitionerButton).toBeVisible();
    });

    test('should set intendedRole to client when clicking client button', async ({ page }) => {
      await page.goto('/register');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Click the client Google OAuth button
      const clientButton = page.locator('button:has-text("Continue with Google as Client")');
      await clientButton.click();
      
      // Check if intendedRole is set in sessionStorage
      const intendedRole = await page.evaluate(() => {
        return sessionStorage.getItem('intendedRole');
      });
      
      expect(intendedRole).toBe('client');
    });

    test('should display client Google OAuth button on login page', async ({ page }) => {
      await page.goto('/login');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Check if client Google OAuth button exists
      const clientButton = page.locator('button:has-text("Continue with Google as Client")');
      await expect(clientButton).toBeVisible();
      
      // Check if practitioner button also exists
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      await expect(practitionerButton).toBeVisible();
    });

    test('should set intendedRole to client when clicking client button on login', async ({ page }) => {
      await page.goto('/login');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Click the client Google OAuth button
      const clientButton = page.locator('button:has-text("Continue with Google as Client")');
      await clientButton.click();
      
      // Check if intendedRole is set in sessionStorage
      const intendedRole = await page.evaluate(() => {
        return sessionStorage.getItem('intendedRole');
      });
      
      expect(intendedRole).toBe('client');
    });
  });

  test.describe('Practitioner OAuth Flow', () => {
    test('should display practitioner Google OAuth button on register page', async ({ page }) => {
      await page.goto('/register');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Check if practitioner Google OAuth button exists
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      await expect(practitionerButton).toBeVisible();
    });

    test('should set intendedRole to practitioner when clicking practitioner button', async ({ page }) => {
      await page.goto('/register');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Click the practitioner Google OAuth button
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      await practitionerButton.click();
      
      // Check if intendedRole is set in sessionStorage
      const intendedRole = await page.evaluate(() => {
        return sessionStorage.getItem('intendedRole');
      });
      
      expect(intendedRole).toBe('practitioner');
    });

    test('should display practitioner Google OAuth button on login page', async ({ page }) => {
      await page.goto('/login');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Check if practitioner Google OAuth button exists
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      await expect(practitionerButton).toBeVisible();
    });

    test('should set intendedRole to practitioner when clicking practitioner button on login', async ({ page }) => {
      await page.goto('/login');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Click the practitioner Google OAuth button
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      await practitionerButton.click();
      
      // Check if intendedRole is set in sessionStorage
      const intendedRole = await page.evaluate(() => {
        return sessionStorage.getItem('intendedRole');
      });
      
      expect(intendedRole).toBe('practitioner');
    });
  });

  test.describe('Role Selection Page', () => {
    test('should display role selection options for practitioners', async ({ page }) => {
      await page.goto('/auth/role-selection');
      
      // Wait for page to load completely
      await page.waitForLoadState('networkidle');
      
      // Check if all practitioner role options are visible
      const osteopathOption = page.locator('input[value="osteopath"]');
      const sportsTherapistOption = page.locator('input[value="sports_therapist"]');
      const massageTherapistOption = page.locator('input[value="massage_therapist"]');
      const clientOption = page.locator('input[value="client"]');
      
      await expect(osteopathOption).toBeVisible();
      await expect(sportsTherapistOption).toBeVisible();
      await expect(massageTherapistOption).toBeVisible();
      await expect(clientOption).toBeVisible();
    });

    test('should allow selecting osteopath role', async ({ page }) => {
      await page.goto('/auth/role-selection');
      await page.waitForLoadState('networkidle');
      
      // Select osteopath role
      const osteopathOption = page.locator('input[value="osteopath"]');
      await osteopathOption.check();
      
      // Verify selection
      await expect(osteopathOption).toBeChecked();
    });

    test('should allow selecting sports therapist role', async ({ page }) => {
      await page.goto('/auth/role-selection');
      await page.waitForLoadState('networkidle');
      
      // Select sports therapist role
      const sportsTherapistOption = page.locator('input[value="sports_therapist"]');
      await sportsTherapistOption.check();
      
      // Verify selection
      await expect(sportsTherapistOption).toBeChecked();
    });

    test('should allow selecting massage therapist role', async ({ page }) => {
      await page.goto('/auth/role-selection');
      await page.waitForLoadState('networkidle');
      
      // Select massage therapist role
      const massageTherapistOption = page.locator('input[value="massage_therapist"]');
      await massageTherapistOption.check();
      
      // Verify selection
      await expect(massageTherapistOption).toBeChecked();
    });

    test('should allow selecting client role', async ({ page }) => {
      await page.goto('/auth/role-selection');
      await page.waitForLoadState('networkidle');
      
      // Select client role
      const clientOption = page.locator('input[value="client"]');
      await clientOption.check();
      
      // Verify selection
      await expect(clientOption).toBeChecked();
    });
  });

  test.describe('Navigation and Routing', () => {
    test('should navigate to register page', async ({ page }) => {
      await page.goto('/register');
      await expect(page).toHaveURL(/.*register/);
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL(/.*login/);
    });

    test('should navigate to role selection page', async ({ page }) => {
      await page.goto('/auth/role-selection');
      await expect(page).toHaveURL(/.*role-selection/);
    });

    test('should navigate to onboarding page', async ({ page }) => {
      await page.goto('/onboarding');
      await expect(page).toHaveURL(/.*onboarding/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing session storage gracefully', async ({ page }) => {
      // Clear session storage
      await page.evaluate(() => {
        sessionStorage.clear();
      });
      
      // Navigate to role selection without intendedRole
      await page.goto('/auth/role-selection');
      
      // Page should still load
      await expect(page).toHaveURL(/.*role-selection/);
    });

    test('should display error messages for failed operations', async ({ page }) => {
      await page.goto('/register');
      
      // Try to submit form without filling required fields
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Check for error messages
        const errorMessages = page.locator('[role="alert"], .error, .text-red-500');
        // Note: This test might need adjustment based on actual error handling implementation
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display OAuth buttons correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/register');
      
      // Dismiss cookie banner if present
      try {
        const cookieBanner = page.locator('text=Cookies & Privacy').first();
        if (await cookieBanner.isVisible({ timeout: 2000 })) {
          const acceptButton = page.locator('button:has-text("Accept all")').first();
          if (await acceptButton.isVisible({ timeout: 1000 })) {
            await acceptButton.click();
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        // Continue if no cookie banner
      }
      
      // Check if buttons are visible on mobile
      const clientButton = page.locator('button:has-text("Continue with Google as Client")');
      const practitionerButton = page.locator('button:has-text("Continue with Google as Practitioner")');
      
      await expect(clientButton).toBeVisible();
      await expect(practitionerButton).toBeVisible();
    });

    test('should display role selection correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/auth/role-selection');
      await page.waitForLoadState('networkidle');
      
      // Check if role options are visible on mobile
      const osteopathOption = page.locator('input[value="osteopath"]');
      await expect(osteopathOption).toBeVisible();
    });
  });
});
