/**
 * Email Template Renderer for Deno Edge Functions
 * 
 * Since Deno can't directly run React Email, this file provides
 * a way to render emails. Options:
 * 1. Call a Node.js render service (recommended for production)
 * 2. Use pre-rendered HTML templates (for simple cases)
 * 
 * For now, we'll use a hybrid approach: call the render service
 * or fall back to the old template system during migration.
 */

import { EmailData, EmailType } from '../../../src/emails/utils/types';

interface EmailTemplate {
  subject: string;
  html: string;
}

/**
 * Render email using React Email templates
 * This calls a Node.js service to render the React Email components
 */
export async function renderReactEmail(
  emailType: EmailType,
  data: EmailData,
  recipientName?: string,
  recipientEmail?: string,
  baseUrl: string = 'https://theramate.co.uk'
): Promise<EmailTemplate> {
  // Option 1: Call Node.js render service (if available)
  const renderServiceUrl = Deno.env.get('EMAIL_RENDER_SERVICE_URL');
  
  if (renderServiceUrl) {
    try {
      const response = await fetch(`${renderServiceUrl}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType,
          recipientName,
          recipientEmail,
          data,
          baseUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return { subject: result.subject, html: result.html };
      }
    } catch (error) {
      console.error('Failed to call render service, falling back:', error);
    }
  }

  // Option 2: Fall back to old template system during migration
  // This will be removed once React Email is fully integrated
  return generateEmailTemplateLegacy(emailType, data, recipientName, recipientEmail, baseUrl);
}

/**
 * Legacy template generator (temporary fallback)
 * This will be removed once React Email rendering is fully set up
 */
function generateEmailTemplateLegacy(
  emailType: string,
  data: any,
  recipientName?: string,
  recipientEmail?: string,
  baseUrl: string = 'https://theramate.co.uk'
): EmailTemplate {
  // For now, return a simple template
  // In production, this should call the React Email render service
  const subject = `Email: ${emailType}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1>${subject}</h1>
      <p>Hi ${recipientName || 'there'},</p>
      <p>This email is being migrated to React Email templates.</p>
      <p>Please ensure the email render service is configured.</p>
    </body>
    </html>
  `;

  return { subject, html };
}


