import { test, expect } from '@playwright/test';
import { TestStateGenerator } from './test-utils';

test.describe('Google OAuth Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first so we have same-origin access to storage
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
    });
  });

  test('should sign up a client via Google OAuth', async ({ page }) => {
    // 1. Create signed state for the callback
    const state = TestStateGenerator.generateRoleState('client', 'test-nonce-client');
    
    // 2. Navigate to register page
    await page.goto('/auth/register');
    
    // 3. Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Click "Continue with Google as Client" button
    await page.click('button:has-text("Continue with Google as Client")');
    
    // 5. Wait for navigation attempt
    await page.waitForTimeout(1000);
    
    // 6. Simulate OAuth callback by navigating directly to callback URL
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(state)}`;
    await page.goto(callbackUrl);
    
    // 7. Wait for the callback to process
    await page.waitForLoadState('domcontentloaded');
    
    // 8. Verify redirect to onboarding or dashboard
    await expect(page).toHaveURL(/\/onboarding|\/dashboard/);
    
    // 9. Check console logs for role assignment
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    // 10. Verify role was assigned (check for success indicators)
    await expect(page.locator('body')).toContainText(/welcome|dashboard|onboarding/i);
  });

  test('should sign up a practitioner via Google OAuth', async ({ page }) => {
    // 1. Create signed state for practitioner role
    const state = TestStateGenerator.generateRoleState('sports_therapist', 'test-nonce-practitioner');
    
    // 2. Navigate to register page
    await page.goto('/auth/register');
    
    // 3. Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Click "Continue with Google as Practitioner" button
    await page.click('button:has-text("Continue with Google as Practitioner")');
    
    // 5. Wait for navigation attempt
    await page.waitForTimeout(1000);
    
    // 6. Simulate OAuth callback
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(state)}`;
    await page.goto(callbackUrl);
    
    // 7. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 8. Verify redirect to practitioner onboarding
    await expect(page).toHaveURL(/\/onboarding|\/dashboard/);
    
    // 9. Check for practitioner-specific content
    await expect(page.locator('body')).toContainText(/practitioner|therapist|onboarding/i);
  });

  test('should handle OAuth callback errors gracefully', async ({ page }) => {
    // 1. Navigate to callback with invalid state
    const invalidState = 'invalid.state.token';
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(invalidState)}`;
    
    // 2. Navigate to callback
    await page.goto(callbackUrl);
    
    // 3. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Should redirect to error page or show error message
    await expect(page.locator('body')).toContainText(/error|invalid|failed/i);
  });

  test('should handle expired state token', async ({ page }) => {
    // 1. Create expired state
    const expiredState = TestStateGenerator.generateExpiredState({
      role: 'client',
      nonce: 'test-nonce-expired',
    });
    
    // 2. Navigate to callback with expired state
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(expiredState)}`;
    await page.goto(callbackUrl);
    
    // 3. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Should handle expired state gracefully
    await expect(page.locator('body')).toContainText(/expired|invalid|error/i);
  });

  test('should handle tampered state token', async ({ page }) => {
    // 1. Create tampered state
    const tamperedState = TestStateGenerator.generateTamperedState({
      role: 'admin',
      nonce: 'test-nonce-tampered',
    });
    
    // 2. Navigate to callback with tampered state
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(tamperedState)}`;
    await page.goto(callbackUrl);
    
    // 3. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Should reject tampered state
    await expect(page.locator('body')).toContainText(/invalid|error|security/i);
  });

  test('should handle missing state parameter', async ({ page }) => {
    // 1. Navigate to callback without state
    const callbackUrl = '/auth/callback?code=fake-code';
    await page.goto(callbackUrl);
    
    // 2. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 3. Should handle missing state gracefully
    await expect(page.locator('body')).toContainText(/error|missing|invalid/i);
  });

  test('should handle missing code parameter', async ({ page }) => {
    // 1. Create valid state
    const state = TestStateGenerator.generateRoleState('client', 'test-nonce-no-code');
    
    // 2. Navigate to callback without code
    const callbackUrl = `/auth/callback?state=${encodeURIComponent(state)}`;
    await page.goto(callbackUrl);
    
    // 3. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Should handle missing code gracefully
    await expect(page.locator('body')).toContainText(/error|missing|invalid/i);
  });
});

test.describe('OAuth Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
    });
  });

  test('should login existing client via Google OAuth', async ({ page }) => {
    // 1. Create signed state for client login
    const state = TestStateGenerator.generateRoleState('client', 'test-nonce-login-client');
    
    // 2. Navigate to login page
    await page.goto('/auth/login');
    
    // 3. Wait for page load
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Click "Continue with Google as Client" button
    await page.click('button:has-text("Continue with Google as Client")');
    
    // 5. Wait for navigation attempt
    await page.waitForTimeout(1000);
    
    // 6. Simulate OAuth callback
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(state)}`;
    await page.goto(callbackUrl);
    
    // 7. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 8. Verify redirect to client dashboard
    await expect(page).toHaveURL(/\/dashboard|\/client/);
  });

  test('should login existing practitioner via Google OAuth', async ({ page }) => {
    // 1. Create signed state for practitioner login
    const state = TestStateGenerator.generateRoleState('sports_therapist', 'test-nonce-login-practitioner');
    
    // 2. Navigate to login page
    await page.goto('/auth/login');
    
    // 3. Wait for page load
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Click "Continue with Google as Practitioner" button
    await page.click('button:has-text("Continue with Google as Practitioner")');
    
    // 5. Wait for navigation attempt
    await page.waitForTimeout(1000);
    
    // 6. Simulate OAuth callback
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(state)}`;
    await page.goto(callbackUrl);
    
    // 7. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 8. Verify redirect to practitioner dashboard
    await expect(page).toHaveURL(/\/dashboard|\/practitioner/);
  });
});

test.describe('Role Selection UI', () => {
  test('should display both client and practitioner options', async ({ page }) => {
    // 1. Navigate to register page
    await page.goto('/auth/register');
    
    // 2. Wait for page load
    await page.waitForLoadState('domcontentloaded');
    
    // 3. Verify both role options are present
    await expect(page.locator('button:has-text("Continue with Google as Client")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google as Practitioner")')).toBeVisible();
  });

  test('should display role options on login page', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/auth/login');
    
    // 2. Wait for page load
    await page.waitForLoadState('domcontentloaded');
    
    // 3. Verify both role options are present
    await expect(page.locator('button:has-text("Continue with Google as Client")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google as Practitioner")')).toBeVisible();
  });

  test('should handle role selection state correctly', async ({ page }) => {
    // 1. Navigate to register page
    await page.goto('/auth/register');
    
    // 2. Wait for page load
    await page.waitForLoadState('domcontentloaded');
    
    // 3. Click client button
    await page.click('button:has-text("Continue with Google as Client")');
    
    // 4. Check that role state was set
    const roleState = await page.evaluate(() => {
      return sessionStorage.getItem('pending_user_role');
    });
    
    expect(roleState).toBeTruthy();
    
    const parsedState = JSON.parse(roleState!);
    expect(parsedState.role).toBe('client');
  });
});

test.describe('Mobile OAuth Flow', () => {
  test('should work on mobile devices', async ({ page }) => {
    // 1. Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 2. Navigate to register page
    await page.goto('/auth/register');
    
    // 3. Wait for page load
    await page.waitForLoadState('domcontentloaded');
    
    // 4. Verify mobile layout
    await expect(page.locator('button:has-text("Continue with Google as Client")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google as Practitioner")')).toBeVisible();
    
    // 5. Test mobile OAuth flow
    const state = TestStateGenerator.generateRoleState('client', 'test-nonce-mobile');
    await page.click('button:has-text("Continue with Google as Client")');
    
    // 6. Simulate callback
    const callbackUrl = `/auth/callback?code=fake-code&state=${encodeURIComponent(state)}`;
    await page.goto(callbackUrl);
    
    // 7. Wait for processing
    await page.waitForLoadState('domcontentloaded');
    
    // 8. Verify mobile-friendly redirect
    await expect(page).toHaveURL(/\/onboarding|\/dashboard/);
  });
});
