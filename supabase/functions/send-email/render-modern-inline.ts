/**
 * Modern Email Template Renderer for Deno Edge Functions
 * Inline HTML generation matching modern template design
 * This works directly in Deno without requiring React/Node.js
 */

interface EmailTemplate {
  subject: string;
  html: string;
}

interface EmailData {
  [key: string]: any;
}

type EmailType = 
  | 'booking_confirmation_client' | 'booking_confirmation_practitioner'
  | 'payment_confirmation_client' | 'payment_received_practitioner'
  | 'session_reminder_24h' | 'session_reminder_2h' | 'session_reminder_1h'
  | 'cancellation' | 'practitioner_cancellation' | 'rescheduling'
  | 'peer_booking_confirmed_client' | 'peer_booking_confirmed_practitioner'
  | 'peer_credits_deducted' | 'peer_credits_earned' | 'peer_booking_cancelled_refunded'
  | 'peer_request_received' | 'peer_request_accepted' | 'peer_request_declined'
  | 'review_request_client' | 'message_received_guest';

function formatTimeForEmail(timeString: string | null | undefined): string {
  if (!timeString) return '';
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    return timeString.substring(0, 5);
  }
  return timeString;
}

function formatDateForEmail(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function buildModernEmailHTML(options: {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge?: string;
  primaryColor?: string;
  content: string;
  baseUrl?: string;
}): string {
  const primaryColor = options.primaryColor || '#059669';
  const baseUrl = options.baseUrl || 'https://theramate.co.uk';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <title>TheraMate.</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f6f6f8;
      color: #1e293b;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      margin: 0;
    }
    .hero {
      background: linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%);
      padding: 48px 24px;
      text-align: center;
      color: #ffffff;
    }
    .hero-title {
      font-size: 32px;
      font-weight: 900;
      margin-bottom: 12px;
      color: #ffffff;
    }
    .hero-subtitle {
      font-size: 16px;
      opacity: 0.95;
      margin-bottom: 24px;
    }
    .hero-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 700;
      margin-top: 16px;
    }
    .content {
      padding: 32px 24px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${primaryColor};
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${primaryColor};
      color: #ffffff;
      text-decoration: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 2px solid ${primaryColor === '#059669' ? '#047857' : primaryColor};
      max-width: 100%;
      box-sizing: border-box;
    }
    .button-secondary {
      background-color: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    .footer {
      text-align: center;
      padding: 32px 24px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 14px;
    }
    .info-box {
      background: rgba(5, 150, 105, 0.05);
      border-left: 4px solid ${primaryColor};
      padding: 16px;
      margin: 24px 0;
      border-radius: 8px;
    }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content { padding: 24px 16px !important; }
      .hero { padding: 32px 16px !important; }
      .hero-title { font-size: 24px !important; }
      .button { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>TheraMate.</h1>
    </div>
    <div class="hero">
      <div class="hero-title">${options.heroTitle}</div>
      <div class="hero-subtitle">${options.heroSubtitle}</div>
      ${options.heroBadge ? `<div class="hero-badge">${options.heroBadge}</div>` : ''}
    </div>
    <div class="content">
      ${options.content}
    </div>
    <div class="footer">
      <p><strong>TheraMate.</strong></p>
      <p>This email was sent by TheraMate.</p>
      <p>If you have any questions, please contact us at <a href="mailto:support@theramate.co.uk" style="color: ${primaryColor};">support@theramate.co.uk</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function renderModernEmailInline(
  emailType: EmailType,
  data: EmailData,
  recipientName?: string,
  recipientEmail?: string,
  baseUrl: string = 'https://theramate.co.uk'
): EmailTemplate {
  const formattedDate = formatDateForEmail(data.sessionDate);
  const formattedTime = formatTimeForEmail(data.sessionTime);
  
  let subject: string;
  let heroTitle: string;
  let heroSubtitle: string;
  let heroBadge: string | undefined;
  let primaryColor = '#059669';
  let content = '';

  switch (emailType) {
    case 'booking_confirmation_client': {
      subject = `Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`;
      heroTitle = 'Booking Confirmed!';
      heroSubtitle = `Your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'} has been confirmed!`;
      heroBadge = 'Booking Confirmed';
      
      const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
      const calendarUrl = data.calendarUrl || '#';
      const messageUrl = data.messageUrl || `${baseUrl}/messages`;
      
      const isMobileService = data.therapistType === 'mobile' || (data.therapistType === 'hybrid' && data.serviceType === 'mobile');
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${bookingUrl}" class="button" style="width: 100%; display: block; text-align: center;">View Booking</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${calendarUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Add to Calendar</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title">Session Details</div>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
          <p><strong>Price:</strong> £${data.sessionPrice || 0}</p>
          ${data.reference ? `<p><strong>Reference:</strong> ${data.reference}</p>` : ''}
        </div>
        
        ${isMobileService ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p><strong>Mobile Service</strong></p>
            <p>Your practitioner will provide this service at your location. The exact details will be confirmed directly with your practitioner.</p>
          </div>
        ` : data.sessionLocation ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p><strong>${data.sessionLocation}</strong></p>
            ${data.directionsUrl && data.directionsUrl !== '#' ? `<a href="${data.directionsUrl}" class="button" style="margin-top: 12px; display: inline-block;">View on Maps</a>` : ''}
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 32px;">
          <a href="${messageUrl}" class="button">Message Practitioner</a>
        </div>
      `;
      break;
    }
    
    // Add other email types here following the same pattern
    // For now, return a basic template for others
    default: {
      subject = `Notification from TheraMate.`;
      heroTitle = 'Notification';
      heroSubtitle = 'You have a new notification from TheraMate.';
      content = `<p>This is a notification email. Template for ${emailType} is being generated.</p>`;
    }
  }

  const html = buildModernEmailHTML({
    heroTitle,
    heroSubtitle,
    heroBadge,
    primaryColor,
    content,
    baseUrl,
  });

  return { subject, html };
}
