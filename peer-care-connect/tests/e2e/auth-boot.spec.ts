import { test, expect } from '@playwright/test';

/** Fresh browser storage so prior manual sessions do not affect smoke tests. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('theramate-auth');
    localStorage.removeItem('theramate-profile-cache');
  });
});

/**
 * Auth boot smoke tests — no credentials required.
 * Run: npm run test:e2e:auth (from peer-care-connect; starts dev server via playwright.config.ts)
 */
test.describe('Auth boot', () => {
  test('marketplace loads without auth timeout wall', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Loading Timeout')).toHaveCount(0);
    await expect(page.getByText('Authentication is taking longer than expected')).toHaveCount(0);
    await expect(page.locator('body')).toBeVisible();

    expect(Date.now() - t0).toBeLessThan(15_000);
  });

  test('login page is reachable', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Loading Timeout')).toHaveCount(0);
  });

  test('unauthenticated visit to client dashboard ends at login or profile gate', async ({ page }) => {
    await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Loading Timeout')).toHaveCount(0);

    await expect
      .poll(async () => {
        const url = page.url();
        if (url.includes('/login')) return 'login';
        const profileShell = await page
          .getByText(/loading your profile|syncing your account/i)
          .count();
        if (profileShell > 0) return 'profile-gate';
        return 'pending';
      })
      .not.toBe('pending');
  });
});
