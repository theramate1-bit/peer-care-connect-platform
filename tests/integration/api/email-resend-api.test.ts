/**
 * Direct Resend API Integration Tests
 * These tests call Resend API directly (not through Edge Function)
 * 
 * REQUIREMENTS:
 * - RESEND_API_KEY environment variable set
 * - Test email addresses configured
 * 
 * To run these tests:
 * 1. Set RESEND_API_KEY environment variable
 * 2. Set TEST_EMAIL environment variable
 * 3. Use test API key (not production)
 */


const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const RESEND_API_URL = 'https://api.resend.com/emails';

// Skip tests if not configured
const shouldSkip = !RESEND_API_KEY || TEST_EMAIL === 'test@example.com';

(shouldSkip ? describe.skip : describe)('Resend API - Direct Integration Tests', () => {
  describe('Email Sending', () => {
    it('should send email via Resend API', async () => {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: TEST_EMAIL,
          subject: 'Test Email from Integration Test',
          html: '<h1>Test Email</h1><p>This is a test email from integration tests.</p>',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.id).toBeDefined();
      expect(data).not.toHaveProperty('error');
    });

    it('should handle invalid API key', async () => {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid_key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: TEST_EMAIL,
          subject: 'Test',
          html: '<p>Test</p>',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle invalid email address', async () => {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: 'invalid-email',
          subject: 'Test',
          html: '<p>Test</p>',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle rate limiting (429)', async () => {
      // Send multiple requests quickly to trigger rate limit
      const requests = Array(10).fill(null).map(() =>
        fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: TEST_EMAIL,
            subject: 'Rate Limit Test',
            html: '<p>Test</p>',
          }),
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // Note: This may or may not trigger rate limit depending on account limits
      if (rateLimited) {
        expect(rateLimited).toBe(true);
      } else {
        // If not rate limited, all should succeed
        responses.forEach(response => {
          expect(response.ok).toBe(true);
        });
      }
    });
  });

  describe('Email Response', () => {
    it('should return email ID on success', async () => {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: TEST_EMAIL,
          subject: 'Test Email ID',
          html: '<p>Test</p>',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.id).toBeDefined();
      expect(typeof data.id).toBe('string');
    });
  });
});

