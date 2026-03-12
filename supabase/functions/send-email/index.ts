import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function for delays (retry backoff)
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface EmailRequest {
  emailType: 'booking_confirmation_client' | 'booking_confirmation_practitioner' | 
            'payment_confirmation_client' | 'payment_received_practitioner' |
            'session_reminder_24h' | 'session_reminder_2h' | 'session_reminder_1h' | 'cancellation' | 'practitioner_cancellation' | 'rescheduling' |
            'peer_booking_confirmed_client' | 'peer_booking_confirmed_practitioner' |
            'peer_credits_deducted' | 'peer_credits_earned' | 'peer_booking_cancelled_refunded' |
            'peer_request_received' | 'peer_request_accepted' | 'peer_request_declined' |
            'review_request_client' | 'message_received_guest' | 'message_received_practitioner' |
            'booking_request_practitioner' | 'treatment_exchange_request_practitioner' |
            'mobile_request_accepted_client' | 'mobile_request_declined_client' | 'mobile_request_expired_client' |
            'welcome_practitioner' | 'welcome_client' |
            'same_day_booking_pending_practitioner' | 'same_day_booking_approved_client' | 'same_day_booking_declined_client' | 'same_day_booking_expired_client'
  recipientEmail: string
  recipientName?: string
  data: {
    // Session data
    sessionId?: string
    sessionType?: string
    sessionDate?: string
    sessionTime?: string
    sessionPrice?: number
    sessionDuration?: number
    sessionLocation?: string
    
    // User data
    clientName?: string
    clientEmail?: string
    practitionerName?: string
    practitionerEmail?: string
    
    // Payment data
    paymentAmount?: number
    platformFee?: number
    practitionerAmount?: number
    paymentId?: string
    
    // Additional data
    cancellationReason?: string
    refundAmount?: number
    refundPercent?: number
    originalDate?: string
    originalTime?: string
    newDate?: string
    newTime?: string
    bookingUrl?: string
    calendarUrl?: string
    messageUrl?: string
    directionsUrl?: string
    cancellationPolicySummary?: string
    clientFirstName?: string
    practitionerFirstName?: string
    // Account creation flow
    clientHasAccount?: boolean
    clientEmail?: string
    // Exchange request data
    requestId?: string
    requesterName?: string
    recipientName?: string
    expiresAt?: string
    acceptUrl?: string
    declineUrl?: string
    // Guest messaging data
    messagePreview?: string
    conversationId?: string
    // Message notification data
    senderName?: string
    messageUrl?: string
    // Booking request data
    serviceType?: string
    requestedDate?: string
    requestedTime?: string
    clientAddress?: string
    distanceKm?: number
    price?: number
    requestUrl?: string
    // Treatment exchange data
    requesterName?: string
    creditCost?: number
  }
}

interface EmailTemplate {
  subject: string
  html: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { emailType, recipientEmail, recipientName, data }: EmailRequest = await req.json()

    // Validate required fields
    if (!emailType || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: emailType, recipientEmail' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Initialize Resend SDK
    const resend = new Resend(resendApiKey)
    
    // Rate limiting: Resend free tier allows 2 requests/second
    // Use database to track last send time across function invocations
    const MIN_EMAIL_INTERVAL_MS = 500 // 500ms = 2 emails/second max
    
    try {
      // Get last email send time from database
      const { data: lastSend } = await supabaseClient
        .from('email_rate_limit')
        .select('last_send_time')
        .eq('id', 'global')
        .single()
      
      if (lastSend?.last_send_time) {
        const now = Date.now()
        const lastSendTime = new Date(lastSend.last_send_time).getTime()
        const timeSinceLastSend = now - lastSendTime
        
        if (timeSinceLastSend < MIN_EMAIL_INTERVAL_MS) {
          const waitTime = MIN_EMAIL_INTERVAL_MS - timeSinceLastSend
          console.log(`⏳ Rate limiting: waiting ${waitTime}ms before sending email`)
          await delay(waitTime)
        }
      }
      
      // Update last send time (upsert)
      await supabaseClient
        .from('email_rate_limit')
        .upsert({
          id: 'global',
          last_send_time: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .catch(err => {
          // If table doesn't exist, continue without rate limiting
          console.warn('Rate limit table not found, skipping rate limiting:', err.message)
        })
    } catch (err) {
      // If rate limiting fails, continue anyway (don't block email sends)
      console.warn('Rate limiting check failed, continuing:', err.message)
    }
    
    // Generate email template
    // Try React Email render service first (for modern templates), fallback to modern inline templates
    let template: EmailTemplate
    
    const renderServiceUrl = Deno.env.get('EMAIL_RENDER_SERVICE_URL')
    if (renderServiceUrl) {
      try {
        const renderResponse = await fetch(`${renderServiceUrl}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailType,
            recipientName,
            recipientEmail,
            data,
            baseUrl: Deno.env.get('SITE_URL') || 'https://theramate.co.uk',
          }),
        })
        
        if (renderResponse.ok) {
          const rendered = await renderResponse.json()
          template = { subject: rendered.subject, html: rendered.html }
          console.log('✅ Email rendered via React Email service (Modern Templates)')
        } else {
          throw new Error(`Render service returned ${renderResponse.status}`)
        }
      } catch (error) {
        console.warn('⚠️ React Email render service failed, using EmailDesign templates:', error)
        template = generateEmailTemplate(emailType, data, recipientName, recipientEmail)
      }
    } else {
      // Use EmailDesign.buildEmail templates (the nice, readable design)
      console.log('✅ Using EmailDesign.buildEmail templates')
      template = generateEmailTemplate(emailType, data, recipientName, recipientEmail)
    }
    
    // Determine sender email
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Theramate <noreply@theramate.co.uk>'
    
    // Log the sender email being used (for debugging)
    console.log('📧 Sender email configured:', fromEmail)
    console.log('📧 RESEND_FROM_EMAIL env var:', Deno.env.get('RESEND_FROM_EMAIL') ? 'SET' : 'NOT SET')
    
    // Send email via Resend SDK with retry logic
    let resendData: any = null
    let lastError: any = null
    const maxRetries = 3
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        resendData = await resend.emails.send({
          from: fromEmail,
          to: recipientEmail,
          subject: template.subject,
          html: template.html,
        })
        
        // Success - break out of retry loop
        break
      } catch (error: any) {
        lastError = error
        
        // Resend SDK errors can have statusCode in different places
        // Check error.statusCode, error.status, or error.response?.status
        const statusCode = error.statusCode || error.status || error.response?.status || 0
        
        // Don't retry on validation errors (4xx except 429)
        if (statusCode >= 400 && statusCode < 429) {
          throw new Error(`Resend API error: ${error.message || error.error?.message || 'Invalid request'}`)
        }
        
        // Handle rate limiting (429) with exponential backoff
        if (statusCode === 429) {
          const headers = error.headers || error.response?.headers || {}
          const retryAfter = headers['retry-after'] || headers['Retry-After']
            ? parseInt(headers['retry-after'] || headers['Retry-After']) 
            : Math.pow(2, attempt) // Exponential backoff: 2s, 4s, 8s
          
          console.log(`Rate limited (429). Retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`)
          await delay(retryAfter * 1000)
          continue
        }
        
        // Retry on server errors (5xx) or network errors
        if (statusCode >= 500 || (statusCode === 0 && attempt < maxRetries - 1)) {
          const backoffMs = Math.pow(2, attempt) * 1000
          console.log(`Server error ${statusCode || 'network'}. Retrying after ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`)
          await delay(backoffMs)
          continue
        }
        
        // If we get here, it's not a retryable error or we've exhausted retries
        throw error
      }
    }
    
    // If we exhausted retries without success
    if (!resendData && lastError) {
      throw new Error(`Resend API error after ${maxRetries} attempts: ${lastError.message || 'Unknown error'}`)
    }
    
    // Extract email ID from SDK response
    // Resend SDK v3+ returns: { data: { id: string } }
    // Older versions may return: { id: string }
    const emailId = resendData?.data?.id || resendData?.id
    if (!emailId) {
      console.error('Resend response structure:', JSON.stringify(resendData, null, 2))
      throw new Error('Failed to send email: No email ID returned from Resend')
    }

    // Log email send to database
    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert({
        email_type: emailType,
        recipient_email: recipientEmail,
        subject: template.subject,
        resend_email_id: emailId,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          resend_response: resendData,
          template_data: data,
          from_email: fromEmail, // Store the actual sender email used
          resend_from_email_env_set: Deno.env.get('RESEND_FROM_EMAIL') ? true : false
        }
      })

    if (logError) {
      console.error('Failed to log email:', logError)
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailId,
        message: 'Email sent successfully',
        // Include sender config for debugging
        config: {
          from_email_used: fromEmail,
          resend_from_email_set: Deno.env.get('RESEND_FROM_EMAIL') ? true : false,
          resend_from_email_value: Deno.env.get('RESEND_FROM_EMAIL') || 'NOT SET (using default)'
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Email send error:', error)
    
    // Log failed email to database
    try {
      await supabaseClient
        .from('email_logs')
        .insert({
          email_type: emailType,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          status: 'failed',
          error_message: error.message || 'Unknown error',
          email_data: data,
          metadata: {
            error_stack: error.stack,
            error_name: error.name,
            timestamp: new Date().toISOString()
          }
        })
    } catch (logError) {
      console.error('Failed to log failed email:', logError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message,
        emailType: emailType,
        recipientEmail: recipientEmail
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Generate Google Calendar URL for Add to Calendar button
 */
function generateCalendarUrl(
  title: string,
  description: string,
  startDate: string,
  startTime: string,
  durationMinutes: number,
  location?: string
): string {
  try {
    // Parse date and time
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000)
    
    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatGC = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    // Build Google Calendar URL
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGC(startDateTime)}/${formatGC(endDateTime)}`,
      details: description,
    })
    
    if (location && location.trim() !== '') {
      params.append('location', location)
    }
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  } catch (error) {
    console.error('Error generating calendar URL:', error)
    return '#'
  }
}

/**
 * Email Design System - Shared Styles and Components
 */
const EmailDesign = {
  // Color Palette
  colors: {
    primary: '#059669',
    primaryLight: '#10b981',
    primaryDark: '#047857',
    primaryBg: '#f0fdf4',
    warning: '#d97706',
    warningBg: '#fef3c7',
    urgent: '#ea580c',
    urgentBg: '#fff7ed',
    error: '#dc2626',
    errorBg: '#fee2e2',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    border: '#e5e7eb',
  },
  
  // Get base styles for email container
  getBaseStyles: () => `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: ${EmailDesign.colors.textPrimary}; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
      background-color: ${EmailDesign.colors.bgSecondary};
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px !important; }
      .content { padding: 24px 20px !important; }
      .header { padding: 24px 20px !important; }
      .cta-button { display: block !important; width: 100% !important; margin: 8px 0 !important; text-align: center !important; }
    }
  `,
  
  // Get header styles based on color theme
  getHeaderStyles: (color: string = EmailDesign.colors.primary) => `
    .header { 
      background: ${color}; 
      color: white; 
      padding: 32px 24px; 
      text-align: center; 
      border-radius: 12px 12px 0 0; 
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
    }
  `,
  
  // Get content area styles
  getContentStyles: () => `
    .content { 
      background: ${EmailDesign.colors.bgPrimary}; 
      padding: 32px 24px; 
      border-radius: 0 0 12px 12px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  `,
  
  // Get card/detail box styles
  getCardStyles: (accentColor: string = EmailDesign.colors.primary) => `
    .detail-card { 
      background: ${EmailDesign.colors.bgPrimary}; 
      padding: 24px; 
      border-radius: 8px; 
      margin: 24px 0; 
      border-left: 4px solid ${accentColor}; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .detail-card h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: ${EmailDesign.colors.textPrimary};
    }
    .detail-card p {
      margin: 8px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .detail-card strong {
      font-weight: 600;
      color: ${EmailDesign.colors.textPrimary};
    }
  `,
  
  // Get button styles
  getButtonStyles: (color: string = EmailDesign.colors.primary) => `
    .cta-button { 
      display: inline-block; 
      background: ${color}; 
      color: #ffffff !important; 
      padding: 16px 32px; 
      text-decoration: none; 
      border-radius: 8px; 
      margin: 8px 4px; 
      font-weight: 700; 
      font-size: 18px;
      line-height: 1.4;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      transition: background-color 0.2s;
      text-align: center;
      min-width: 180px;
    }
    .cta-button:hover {
      background: ${color === EmailDesign.colors.primary ? EmailDesign.colors.primaryDark : 
                   color === EmailDesign.colors.warning ? '#b45309' :
                   color === EmailDesign.colors.urgent ? '#c2410c' :
                   color === EmailDesign.colors.error ? '#b91c1c' : color} !important;
      color: #ffffff !important;
    }
    .cta-button-secondary {
      background: ${EmailDesign.colors.bgPrimary};
      color: ${color} !important;
      border: 2px solid ${color};
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      font-weight: 700;
      font-size: 18px;
    }
  `,
  
  // Get info box styles
  getInfoBoxStyles: (type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const configs = {
      success: { bg: EmailDesign.colors.primaryBg, border: EmailDesign.colors.primary, text: '#166534' },
      warning: { bg: EmailDesign.colors.warningBg, border: EmailDesign.colors.warning, text: '#92400e' },
      error: { bg: EmailDesign.colors.errorBg, border: EmailDesign.colors.error, text: '#991b1b' },
      info: { bg: EmailDesign.colors.urgentBg, border: EmailDesign.colors.urgent, text: '#9a3412' },
    }
    const config = configs[type]
    return `
      .info-box {
        background: ${config.bg};
        border-left: 4px solid ${config.border};
        padding: 20px;
        margin: 24px 0;
        border-radius: 8px;
      }
      .info-box h4 {
        margin: 0 0 12px 0;
        color: ${config.text};
        font-size: 16px;
        font-weight: 600;
      }
      .info-box p {
        margin: 0;
        color: ${config.text};
        font-size: 14px;
        line-height: 1.6;
      }
    `
  },
  
  // Get footer styles
  getFooterStyles: () => `
    .footer { 
      text-align: center; 
      margin-top: 32px; 
      padding: 32px 24px;
      background: ${EmailDesign.colors.bgSecondary};
      border-top: 1px solid ${EmailDesign.colors.border};
      border-radius: 0 0 12px 12px;
      color: ${EmailDesign.colors.textSecondary}; 
      font-size: 14px; 
      line-height: 1.6; 
    }
    .footer p {
      margin: 8px 0;
    }
  `,
  
  // Build complete email HTML
  buildEmail: (options: {
    title: string,
    headerColor?: string,
    content: string,
    baseUrl?: string
  }) => {
    const headerColor = options.headerColor || EmailDesign.colors.primary
    const baseUrl = options.baseUrl || 'https://theramate.co.uk'
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${options.title}</title>
        <style>
          ${EmailDesign.getBaseStyles()}
          ${EmailDesign.getHeaderStyles(headerColor)}
          ${EmailDesign.getContentStyles()}
          ${EmailDesign.getCardStyles(headerColor)}
          ${EmailDesign.getButtonStyles(headerColor)}
          ${EmailDesign.getInfoBoxStyles('success')}
          ${EmailDesign.getInfoBoxStyles('warning')}
          ${EmailDesign.getInfoBoxStyles('error')}
          ${EmailDesign.getInfoBoxStyles('info')}
          ${EmailDesign.getFooterStyles()}
        </style>
      </head>
      <body>
        <div style="background: ${EmailDesign.colors.bgSecondary}; padding: 20px 0;">
          <div style="max-width: 600px; margin: 0 auto; background: ${EmailDesign.colors.bgPrimary}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            ${options.content}
            <div class="footer">
              <p><strong>TheraMate</strong></p>
              <p>This email was sent by TheraMate</p>
              <p>If you have any questions, please contact us at <a href="mailto:support@theramate.co.uk" style="color: ${EmailDesign.colors.primary}; text-decoration: none;">support@theramate.co.uk</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

/**
 * Format time string to HH:MM (removes seconds if present)
 */
function formatTimeForEmail(timeString: string | null | undefined): string {
  if (!timeString) return '';
  
  // If time string includes seconds (HH:MM:SS), remove them
  if (timeString.includes(':') && timeString.split(':').length === 3) {
    return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
  }
  
  // If already in HH:MM format, return as is
  return timeString;
}

/**
 * Format booking reference from session ID
 */
function formatBookingReference(sessionId: string | undefined): string {
  if (!sessionId) return 'N/A';
  const cleaned = sessionId.replace(/-/g, '').substring(0, 6).toUpperCase();
  return `THM-${cleaned}`;
}

/**
 * Generate Google Calendar URL
 */
function generateCalendarUrl(
  title: string,
  description: string,
  startDate: string,
  startTime: string,
  durationMinutes: number,
  location?: string
): string {
  try {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
    const formatGC = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGC(startDateTime)}/${formatGC(endDateTime)}`,
      details: description,
    });
    if (location && location.trim() !== '') params.append('location', location);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return '#';
  }
}

/**
 * Generate Maps URL - Universal link that opens device's default maps app
 * Works on iOS (Apple Maps), Android (Google Maps), and desktop (Google Maps web)
 */
function generateMapsUrl(location: string): string {
  if (!location || location.trim() === '') return '#';
  // Use Google Maps URL - it's universal and opens native apps on mobile devices
  return `https://maps.google.com/maps?q=${encodeURIComponent(location)}`;
}

/**
 * Format date for email display
 */
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

/**
 * Generate modern email template with TheraMate. design system
 * This replaces the legacy templates with modern styling
 */
function generateModernEmailTemplate(emailType: string, data: any, recipientName?: string, recipientEmail?: string): EmailTemplate {
  const baseUrl = Deno.env.get('SITE_URL') || 'https://theramate.co.uk'
  const formattedDate = formatDateForEmail(data.sessionDate);
  const formattedTime = formatTimeForEmail(data.sessionTime);
  
  // Modern email HTML builder
  const buildModernEmail = (options: {
    heroTitle: string;
    heroSubtitle: string;
    heroBadge?: string;
    primaryColor?: string;
    content: string;
  }): string => {
    const primaryColor = options.primaryColor || '#059669';
    
    // Generate gradient based on primary color
    let heroGradient = 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)';
    let headerGradient = 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)';
    
    if (primaryColor === '#d97706') {
      // Orange gradient for 24h reminders
      heroGradient = 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)';
      headerGradient = 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)';
    } else if (primaryColor === '#ea580c') {
      // Red-orange gradient for 2h reminders
      heroGradient = 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)';
      headerGradient = 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)';
    } else if (primaryColor === '#dc2626') {
      // Red gradient for 1h reminders and cancellations
      heroGradient = 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)';
      headerGradient = 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)';
    }
    
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
      background: ${headerGradient};
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
      background: ${heroGradient};
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
      color: #ffffff !important;
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
      color: #ffffff !important;
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
  };
  
  // Generate template based on email type
  let subject: string;
  let heroTitle: string;
  let heroSubtitle: string;
  let heroBadge: string | undefined;
  let primaryColor = '#059669';
  let content = '';

  switch (emailType) {
    case 'booking_confirmation_client': {
      subject = `Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`;
      heroTitle = `You're all set, ${recipientName || 'there'}!`;
      heroSubtitle = `Your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'} has been scheduled. We've sent a calendar invite to your inbox.`;
      heroBadge = 'Booking Confirmed';
      
      // Generate calendar URL if not provided
      const calendarUrl = data.calendarUrl || (data.sessionDate && data.sessionTime && data.sessionDuration
        ? generateCalendarUrl(
            `${data.sessionType} with ${data.practitionerName}`,
            `Session: ${data.sessionType}\\nPractitioner: ${data.practitionerName}\\nDuration: ${data.sessionDuration} minutes`,
            data.sessionDate,
            data.sessionTime,
            data.sessionDuration || 60,
            data.sessionLocation
          )
        : '#');
      
      // Build comprehensive booking URL with all details
      const bookingReference = formatBookingReference(data.sessionId);
      const bookingUrl = data.sessionId
        ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}${data.sessionType ? `&session_type=${encodeURIComponent(data.sessionType)}` : ''}${data.practitionerName ? `&practitioner_name=${encodeURIComponent(data.practitionerName)}` : ''}${data.sessionDate ? `&session_date=${encodeURIComponent(data.sessionDate)}` : ''}${data.sessionTime ? `&session_time=${encodeURIComponent(data.sessionTime)}` : ''}${data.sessionDuration ? `&duration=${data.sessionDuration}` : ''}${data.sessionPrice ? `&price=${data.sessionPrice}` : ''}${bookingReference ? `&reference=${encodeURIComponent(bookingReference)}` : ''}`
        : data.bookingUrl || `${baseUrl}/client/sessions`;
      
      const messageUrl = data.messageUrl || `${baseUrl}/messages`;
      const mapsUrl = data.directionsUrl && data.directionsUrl !== '#' ? data.directionsUrl : data.sessionLocation ? generateMapsUrl(data.sessionLocation) : '#';
      
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
          <div class="card-title">Session Details ${data.sessionPrice ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">£${data.sessionPrice}</span>` : ''}</div>
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
            <tr>
              <td style="padding-bottom: 16px; width: 50%; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 8px; background-color: ${primaryColor === '#059669' ? 'rgba(5, 150, 105, 0.1)' : primaryColor === '#d97706' ? 'rgba(217, 119, 6, 0.1)' : primaryColor === '#ea580c' ? 'rgba(234, 88, 12, 0.1)' : primaryColor === '#dc2626' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">👤</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Practitioner</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${data.practitionerName || 'N/A'}</p>
                  </div>
                </div>
              </td>
              <td style="padding-bottom: 16px; width: 50%; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 8px; background-color: ${primaryColor === '#059669' ? 'rgba(5, 150, 105, 0.1)' : primaryColor === '#d97706' ? 'rgba(217, 119, 6, 0.1)' : primaryColor === '#ea580c' ? 'rgba(234, 88, 12, 0.1)' : primaryColor === '#dc2626' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">📅</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Date</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${formattedDate}</p>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 16px; width: 50%; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 8px; background-color: ${primaryColor === '#059669' ? 'rgba(5, 150, 105, 0.1)' : primaryColor === '#d97706' ? 'rgba(217, 119, 6, 0.1)' : primaryColor === '#ea580c' ? 'rgba(234, 88, 12, 0.1)' : primaryColor === '#dc2626' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">🕐</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Time</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${formattedTime}</p>
                  </div>
                </div>
              </td>
              <td style="padding-bottom: 16px; width: 50%; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 8px; background-color: ${primaryColor === '#059669' ? 'rgba(5, 150, 105, 0.1)' : primaryColor === '#d97706' ? 'rgba(217, 119, 6, 0.1)' : primaryColor === '#ea580c' ? 'rgba(234, 88, 12, 0.1)' : primaryColor === '#dc2626' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">⏱️</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Duration</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${data.sessionDuration || 60} minutes</p>
                  </div>
                </div>
              </td>
            </tr>
            ${bookingReference && bookingReference !== 'N/A' ? `
            <tr>
              <td colSpan="2" style="padding-bottom: 16px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 8px; background-color: ${primaryColor === '#059669' ? 'rgba(5, 150, 105, 0.1)' : primaryColor === '#d97706' ? 'rgba(217, 119, 6, 0.1)' : primaryColor === '#ea580c' ? 'rgba(234, 88, 12, 0.1)' : primaryColor === '#dc2626' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;">🔖</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Reference</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${bookingReference}</p>
                  </div>
                </div>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        ${isMobileService ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Mobile Service</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">Your practitioner will provide this service at your location. The exact details will be confirmed directly with your practitioner.</p>
          </div>
        ` : data.sessionLocation ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">${data.sessionLocation}</p>
            ${mapsUrl && mapsUrl !== '#' ? `<a href="${mapsUrl}" style="display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #e2e8f0; color: #475569; font-size: 14px; font-weight: 700; text-decoration: none; background-color: #ffffff;">🗺️ View on Maps</a>` : ''}
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 32px;">
          <a href="${messageUrl}" class="button" style="display: inline-block;">Message Practitioner</a>
        </div>
        
        ${data.cancellationPolicySummary ? `
          <div class="info-box" style="background: #f8fafc; border-left-color: ${primaryColor}; margin-top: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Important Note</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">${data.cancellationPolicySummary}</p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'booking_confirmation_practitioner': {
      subject = `New Booking - ${data.sessionType} with ${data.clientName}`;
      heroTitle = 'New Booking Received!';
      heroSubtitle = `You have a new ${data.sessionType || 'session'} booking with ${data.clientName || 'a client'}.`;
      heroBadge = 'New Booking';
      
      const bookingUrl = data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/bookings`);
      const messageUrl = data.messageUrl || `${baseUrl}/messages`;
      const isMobileService = data.therapistType === 'mobile' || (data.therapistType === 'hybrid' && data.serviceType === 'mobile');
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${bookingUrl}" class="button" style="width: 100%; display: block; text-align: center;">View Session</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${messageUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Message Client</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title">Session Details ${data.sessionPrice ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">£${data.sessionPrice}</span>` : ''}</div>
          <p><strong>Client:</strong> ${data.clientName || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
          <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
          ${data.paymentStatus ? `<p><strong>Payment Status:</strong> ${data.paymentStatus}</p>` : ''}
        </div>
        
        ${isMobileService ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p><strong>Mobile Service</strong></p>
            <p>Location to be confirmed with client.</p>
          </div>
        ` : data.sessionLocation ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p><strong><a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></strong></p>
            ${data.directionsUrl && data.directionsUrl !== '#' ? `<a href="${data.directionsUrl}" class="button" style="margin-top: 12px; display: inline-block;">View on Maps</a>` : ''}
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'payment_confirmation_client': {
      subject = `Payment Confirmed - £${data.paymentAmount} for ${data.sessionType}`;
      heroTitle = 'Payment Confirmed!';
      heroSubtitle = `Your payment of £${data.paymentAmount || 0} has been successfully processed. Thank you for your booking!`;
      heroBadge = 'Payment Confirmed';
      
      const paymentBookingUrl = data.sessionId ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}` : data.bookingUrl || `${baseUrl}/client/sessions`;
      
      content = `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${paymentBookingUrl}" class="button" style="display: inline-block;">View Booking</a>
        </div>
        
        <div class="card">
          <div class="card-title">Payment Details ${data.paymentAmount ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">£${data.paymentAmount}</span>` : ''}</div>
          <p><strong>Payment ID:</strong> ${data.paymentId || 'N/A'}</p>
          <p><strong>Amount:</strong> £${data.paymentAmount || 0}</p>
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
        </div>
      `;
      break;
    }
    
    case 'payment_received_practitioner': {
      subject = `Payment Received - £${data.practitionerAmount} from ${data.clientName}`;
      heroTitle = 'Payment Received!';
      heroSubtitle = `You've received £${data.practitionerAmount || 0} from ${data.clientName || 'a client'} for your session.`;
      heroBadge = 'Payment Received';
      
      const bookingUrl = data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/bookings`);
      
      content = `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${bookingUrl}" class="button" style="display: inline-block;">View Session</a>
        </div>
        
        <div class="card">
          <div class="card-title">Payment Details ${data.practitionerAmount ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">£${data.practitionerAmount}</span>` : ''}</div>
          <p><strong>Client:</strong> ${data.clientName || 'N/A'}</p>
          <p><strong>Amount Received:</strong> £${data.practitionerAmount || 0}</p>
          ${data.platformFee ? `<p><strong>Platform Fee:</strong> £${data.platformFee}</p>` : ''}
          ${data.paymentAmount ? `<p><strong>Total Payment:</strong> £${data.paymentAmount}</p>` : ''}
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
        </div>
      `;
      break;
    }
    
    case 'session_reminder_24h': {
      subject = `Reminder: Your session is tomorrow`;
      heroTitle = 'Your session is tomorrow!';
      heroSubtitle = `This is a friendly reminder that you have a ${data.sessionType || 'session'} scheduled for tomorrow.`;
      heroBadge = '24 Hour Reminder';
      primaryColor = '#d97706';
      
      const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
      const messageUrl = data.messageUrl || `${baseUrl}/messages`;
      const isMobileService = data.therapistType === 'mobile' || (data.therapistType === 'hybrid' && data.serviceType === 'mobile');
      const mapsUrl = data.directionsUrl && data.directionsUrl !== '#' ? data.directionsUrl : data.sessionLocation ? generateMapsUrl(data.sessionLocation) : '#';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${bookingUrl}" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">View Details</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${messageUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Message Practitioner</a>
            </td>
          </tr>
          ${mapsUrl && mapsUrl !== '#' && !isMobileService ? `
          <tr>
            <td colSpan="2" style="padding: 8px 8px 0 8px;">
              <a href="${mapsUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Get Directions</a>
            </td>
          </tr>
          ` : ''}
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Session Details</div>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
          <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
        </div>
        
        ${isMobileService ? `
          <div class="card">
            <div class="card-title" style="border-bottom-color: ${primaryColor};">Location Details</div>
            <p><strong>Mobile Service</strong></p>
            <p>Your practitioner will provide this service at your location.</p>
          </div>
        ` : data.sessionLocation ? `
          <div class="card">
            <div class="card-title" style="border-bottom-color: ${primaryColor};">Location Details</div>
            <p><strong><a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></strong></p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'session_reminder_2h': {
      subject = `Reminder: Your session starts in 2 hours`;
      heroTitle = 'Your session starts in 2 hours!';
      heroSubtitle = `Don't forget - your ${data.sessionType || 'session'} is coming up soon.`;
      heroBadge = '2 Hour Reminder';
      primaryColor = '#ea580c';
      
      const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
      const messageUrl = data.messageUrl || `${baseUrl}/messages`;
      const isMobileService = data.therapistType === 'mobile' || (data.therapistType === 'hybrid' && data.serviceType === 'mobile');
      const mapsUrl = data.directionsUrl && data.directionsUrl !== '#' ? data.directionsUrl : data.sessionLocation ? generateMapsUrl(data.sessionLocation) : '#';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${bookingUrl}" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">View Details</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${messageUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Message Practitioner</a>
            </td>
          </tr>
          ${mapsUrl && mapsUrl !== '#' && !isMobileService ? `
          <tr>
            <td colSpan="2" style="padding: 8px 8px 0 8px;">
              <a href="${mapsUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Get Directions</a>
            </td>
          </tr>
          ` : ''}
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Session Details</div>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
        </div>
        
        ${isMobileService ? `
          <div class="card">
            <div class="card-title" style="border-bottom-color: ${primaryColor};">Location Details</div>
            <p><strong>Mobile Service</strong></p>
            <p>Your practitioner will provide this service at your location.</p>
          </div>
        ` : data.sessionLocation ? `
          <div class="card">
            <div class="card-title" style="border-bottom-color: ${primaryColor};">Location Details</div>
            <p><strong><a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></strong></p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'session_reminder_1h': {
      subject = `Reminder: Your session starts in 1 hour`;
      heroTitle = 'Your session starts in 1 hour!';
      heroSubtitle = `Final reminder - your ${data.sessionType || 'session'} is starting soon.`;
      heroBadge = '1 Hour Reminder';
      primaryColor = '#dc2626';
      
      const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
      const messageUrl = data.messageUrl || `${baseUrl}/messages`;
      const isMobileService = data.therapistType === 'mobile' || (data.therapistType === 'hybrid' && data.serviceType === 'mobile');
      const mapsUrl = data.directionsUrl && data.directionsUrl !== '#' ? data.directionsUrl : data.sessionLocation ? generateMapsUrl(data.sessionLocation) : '#';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${bookingUrl}" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">View Details</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${messageUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Message Practitioner</a>
            </td>
          </tr>
          ${mapsUrl && mapsUrl !== '#' && !isMobileService ? `
          <tr>
            <td colSpan="2" style="padding: 8px 8px 0 8px;">
              <a href="${mapsUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Get Directions</a>
            </td>
          </tr>
          ` : ''}
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Session Details</div>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
        </div>
        
        ${isMobileService ? `
          <div class="card">
            <div class="card-title" style="border-bottom-color: ${primaryColor};">Location Details</div>
            <p><strong>Mobile Service</strong></p>
            <p>Your practitioner will provide this service at your location.</p>
          </div>
        ` : data.sessionLocation ? `
          <div class="card">
            <div class="card-title" style="border-bottom-color: ${primaryColor};">Location Details</div>
            <p><strong><a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></strong></p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'cancellation': {
      subject = `Session Cancelled - ${data.sessionType}`;
      heroTitle = 'Session Cancelled';
      heroSubtitle = `We're sorry to inform you that your session has been cancelled.`;
      heroBadge = 'Cancelled';
      primaryColor = '#dc2626';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/marketplace" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">Book Another Session</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/help" class="button button-secondary" style="width: 100%; display: block; text-align: center;">View Help Center</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Cancellation Details</div>
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
          ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
        </div>
        
        ${data.refundAmount ? `
          <div class="info-box" style="background: rgba(5, 150, 105, 0.05); border-left-color: #059669;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Refund Amount</p>
            <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: 900; color: #059669;">£${data.refundAmount}</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">Your refund will be processed within 5-10 business days.</p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'practitioner_cancellation': {
      subject = `Session Cancelled by Practitioner - ${data.sessionType}`;
      heroTitle = 'Session Cancelled by Practitioner';
      heroSubtitle = `Your practitioner has cancelled the scheduled session.`;
      heroBadge = 'Cancelled';
      primaryColor = '#dc2626';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/marketplace" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">Book Another Session</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/help" class="button button-secondary" style="width: 100%; display: block; text-align: center;">View Help Center</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Cancellation Details</div>
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
          ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
        </div>
        
        ${data.refundAmount ? `
          <div class="info-box" style="background: rgba(5, 150, 105, 0.05); border-left-color: #059669;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Refund Amount</p>
            <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: 900; color: #059669;">£${data.refundAmount}</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">Your refund will be processed within 5-10 business days.</p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'rescheduling': {
      subject = `Session Rescheduled - New Date/Time`;
      heroTitle = 'Session Rescheduled';
      heroSubtitle = `Your session has been rescheduled. Please see the new details below.`;
      heroBadge = 'Rescheduled';
      
      const originalDate = formatDateForEmail(data.originalDate);
      const originalTime = formatTimeForEmail(data.originalTime);
      const newDate = formatDateForEmail(data.newDate);
      const newTime = formatTimeForEmail(data.newTime);
      const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
      
      content = `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${bookingUrl}" class="button" style="display: inline-block;">View Updated Booking</a>
        </div>
        
        <div class="card">
          <div class="card-title">New Session Details</div>
          <p><strong>Date:</strong> ${newDate}</p>
          <p><strong>Time:</strong> ${newTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
        </div>
        
        <div class="card">
          <div class="card-title">Previous Session Details</div>
          <p><strong>Date:</strong> ${originalDate}</p>
          <p><strong>Time:</strong> ${originalTime}</p>
        </div>
      `;
      break;
    }
    
    case 'peer_booking_confirmed_client': {
      subject = `Peer Treatment Booking Confirmed - ${data.sessionType}`;
      heroTitle = 'Peer Treatment Booking Confirmed!';
      heroSubtitle = `Your peer treatment booking has been confirmed! Here are the details:`;
      heroBadge = 'Peer Treatment';
      
      const bookingUrl = data.bookingUrl || `${baseUrl}/credits#peer-treatment`;
      const calendarUrl = data.calendarUrl || '#';
      const mapsUrl = data.directionsUrl && data.directionsUrl !== '#' ? data.directionsUrl : data.sessionLocation ? generateMapsUrl(data.sessionLocation) : '#';
      
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
          <div class="card-title">Session Details ${data.paymentAmount ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">${data.paymentAmount} Credits</span>` : ''}</div>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
        </div>
        
        ${data.sessionLocation ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p><strong><a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></strong></p>
            ${mapsUrl && mapsUrl !== '#' ? `<a href="${mapsUrl}" class="button" style="margin-top: 12px; display: inline-block;">View on Maps</a>` : ''}
          </div>
        ` : ''}
        
        <div class="info-box">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Credits Used</p>
          <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: 900; color: ${primaryColor};">${data.paymentAmount || 0} credits</p>
          <p style="margin: 0; font-size: 14px; color: #475569;">These credits have been deducted from your account balance.</p>
        </div>
        
        <div class="info-box" style="background: #f8fafc; border-left-color: ${primaryColor};">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Note:</strong> This is a peer treatment exchange. Both parties are practitioners supporting each other in our community.</p>
        </div>
      `;
      break;
    }
    
    case 'peer_booking_confirmed_practitioner': {
      subject = `New Peer Treatment Booking - ${data.sessionType} with ${data.clientName}`;
      heroTitle = 'New Peer Treatment Booking!';
      heroSubtitle = `You have received a new peer treatment booking from another practitioner in our community.`;
      heroBadge = 'Peer Treatment';
      
      const bookingUrl = data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/bookings`);
      const mapsUrl = data.directionsUrl && data.directionsUrl !== '#' ? data.directionsUrl : data.sessionLocation ? generateMapsUrl(data.sessionLocation) : '#';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${bookingUrl}" class="button" style="width: 100%; display: block; text-align: center;">View Session</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits#peer-treatment" class="button button-secondary" style="width: 100%; display: block; text-align: center;">View Credits</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title">Session Details</div>
          <p><strong>Client:</strong> ${data.clientName || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
          <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
        </div>
        
        ${data.sessionLocation ? `
          <div class="card">
            <div class="card-title">Location Details</div>
            <p><strong><a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></strong></p>
            ${mapsUrl && mapsUrl !== '#' ? `<a href="${mapsUrl}" class="button" style="margin-top: 12px; display: inline-block;">View on Maps</a>` : ''}
          </div>
        ` : ''}
        
        <div class="info-box" style="background: #f8fafc; border-left-color: ${primaryColor};">
          <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Note:</strong> This is a peer treatment exchange. Both parties are practitioners supporting each other in our community.</p>
        </div>
      `;
      break;
    }
    
    case 'peer_credits_deducted': {
      subject = `${data.paymentAmount || 0} Credits Deducted - Peer Treatment Booking`;
      heroTitle = 'Credits Deducted';
      heroSubtitle = `Credits have been deducted from your account for a peer treatment booking.`;
      heroBadge = 'Credits Deducted';
      primaryColor = '#dc2626';
      
      content = `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${baseUrl}/credits" class="button" style="display: inline-block; background-color: ${primaryColor}; border-color: ${primaryColor};">View Credit Balance</a>
        </div>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Transaction Details ${data.paymentAmount ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">-${data.paymentAmount} Credits</span>` : ''}</div>
          <p><strong>Credits Deducted:</strong> <span style="color: ${primaryColor}; font-weight: 900; font-size: 24px;">${data.paymentAmount || 0} credits</span></p>
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
        </div>
      `;
      break;
    }
    
    case 'peer_credits_earned': {
      subject = `+${data.paymentAmount || 0} Credits Earned - Peer Treatment`;
      heroTitle = 'Credits Earned!';
      heroSubtitle = `You've earned ${data.paymentAmount || 0} credits for providing a peer treatment session.`;
      heroBadge = 'Credits Earned';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits" class="button" style="width: 100%; display: block; text-align: center;">View Credit Balance</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits#peer-treatment" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Book Peer Treatment</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title">Transaction Details ${data.paymentAmount ? `<span style="float: right; font-size: 14px; color: ${primaryColor};">+${data.paymentAmount} Credits</span>` : ''}</div>
          <p><strong>Credits Earned:</strong> <span style="color: ${primaryColor}; font-weight: 900; font-size: 24px;">+${data.paymentAmount || 0} credits</span></p>
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Client:</strong> ${data.clientName || 'N/A'}</p>
        </div>
      `;
      break;
    }
    
    case 'peer_booking_cancelled_refunded': {
      subject = `Peer Treatment Cancelled - ${data.refundAmount || 0} Credits Refunded`;
      heroTitle = 'Peer Treatment Cancelled';
      heroSubtitle = `Your peer treatment booking has been cancelled. ${data.refundAmount ? `${data.refundAmount} credits have been refunded to your account.` : ''}`;
      heroBadge = 'Cancelled';
      primaryColor = '#dc2626';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">View Credit Balance</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits#peer-treatment" class="button button-secondary" style="width: 100%; display: block; text-align: center;">Book Another Session</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Cancellation Details</div>
          <p><strong>Session:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
        </div>
        
        ${data.refundAmount ? `
          <div class="info-box">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Credits Refunded</p>
            <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: 900; color: ${primaryColor};">+${data.refundAmount} credits</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">These credits have been refunded to your account and are available for use immediately.</p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'peer_request_received': {
      subject = `New Peer Treatment Request from ${data.requesterName || 'A Practitioner'}`;
      heroTitle = 'New Peer Treatment Request';
      heroSubtitle = `You have received a new peer treatment request from ${data.requesterName || 'another practitioner'}.`;
      heroBadge = 'New Request';
      
      const acceptUrl = data.acceptUrl || '#';
      const declineUrl = data.declineUrl || '#';
      const bookingUrl = data.bookingUrl || '#';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${acceptUrl}" class="button" style="width: 100%; display: block; text-align: center;">Accept Request</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${declineUrl}" class="button" style="width: 100%; display: block; text-align: center; background-color: #dc2626; border-color: #dc2626;">Decline Request</a>
            </td>
          </tr>
          ${bookingUrl && bookingUrl !== '#' ? `
          <tr>
            <td colSpan="2" style="padding: 8px 8px 0 8px;">
              <a href="${bookingUrl}" class="button button-secondary" style="width: 100%; display: block; text-align: center;">View Request</a>
            </td>
          </tr>
          ` : ''}
        </table>
        
        <div class="card">
          <div class="card-title">Request Details</div>
          <p><strong>From:</strong> ${data.requesterName || 'A Practitioner'}</p>
          ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
        </div>
        
        ${data.expiresAt ? `
          <div class="info-box" style="background: #fff7ed; border-left-color: #d97706;">
            <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Expires:</strong> ${new Date(data.expiresAt).toLocaleString('en-GB')}</p>
          </div>
        ` : ''}
      `;
      break;
    }
    
    case 'peer_request_accepted': {
      subject = `Peer Treatment Request Accepted - ${data.sessionType || 'Session'}`;
      heroTitle = 'Peer Treatment Request Accepted!';
      heroSubtitle = `Your peer treatment request has been accepted. Your session is confirmed!`;
      heroBadge = 'Request Accepted';
      
      const bookingUrl = data.bookingUrl || `${baseUrl}/credits#peer-treatment`;
      const calendarUrl = data.calendarUrl || '#';
      
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
          <tr>
            <td colSpan="2" style="padding: 8px 8px 0 8px;">
              <a href="${baseUrl}/credits#peer-treatment" class="button button-secondary" style="width: 100%; display: block; text-align: center;">View Credits</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title">Session Details</div>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
          <p><strong>Practitioner:</strong> ${data.recipientName || 'N/A'}</p>
        </div>
      `;
      break;
    }
    
    case 'peer_request_declined': {
      subject = `Peer Treatment Request Declined`;
      heroTitle = 'Peer Treatment Request Declined';
      heroSubtitle = `Unfortunately, your peer treatment request has been declined. You can find another practitioner or view your credits.`;
      heroBadge = 'Request Declined';
      primaryColor = '#dc2626';
      
      content = `
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 500px; width: 100%;">
          <tr>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits#peer-treatment" class="button" style="width: 100%; display: block; text-align: center; background-color: ${primaryColor}; border-color: ${primaryColor};">Find Another Practitioner</a>
            </td>
            <td style="padding: 0 8px 8px 8px; width: 50%;">
              <a href="${baseUrl}/credits" class="button button-secondary" style="width: 100%; display: block; text-align: center;">View Credits</a>
            </td>
          </tr>
        </table>
        
        <div class="card">
          <div class="card-title" style="border-bottom-color: ${primaryColor};">Request Details</div>
          ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
          <p><strong>Practitioner:</strong> ${data.recipientName || 'N/A'}</p>
        </div>
        
        <div class="info-box" style="background: #f8fafc; border-left-color: ${primaryColor};">
          <p style="margin: 0; font-size: 14px; color: #475569;">Don't worry! You can find another practitioner who can help you. Your credits remain in your account and are available for use.</p>
        </div>
      `;
      break;
    }
    
    case 'review_request_client': {
      subject = `How was your session with ${data.practitionerName || 'your practitioner'}?`;
      heroTitle = 'Thank You for Your Session!';
      heroSubtitle = `We hope you enjoyed your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'}.`;
      heroBadge = 'Review Request';
      
      const reviewUrl = `${baseUrl}/review?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`;
      
      content = `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${reviewUrl}" class="button" style="display: inline-block;">Leave a Review</a>
        </div>
        
        <div class="card">
          <div class="card-title">Session Details</div>
          ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${data.sessionTime ? `<p><strong>Time:</strong> ${formattedTime}</p>` : ''}
          ${data.sessionDuration ? `<p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>` : ''}
          <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
        </div>
        
        <div class="info-box">
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">💬 Share Your Experience</p>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Your feedback helps other clients make informed decisions and helps practitioners improve their services.</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Why leave a review?</strong><br />• Help other clients find the right practitioner<br />• Support your practitioner's practice<br />• Share your experience with the community</p>
        </div>
      `;
      break;
    }
    
    case 'message_received_guest': {
      subject = `New Message from ${data.practitionerName || 'your practitioner'}`;
      heroTitle = 'You Have a New Message';
      heroSubtitle = `${data.practitionerName || 'Your practitioner'} has sent you a message.`;
      heroBadge = 'New Message';
      
      const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(recipientEmail || '')}&redirect=${encodeURIComponent(`/messages?conversation=${data.conversationId || ''}`)}`;
      
      content = `
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${registerUrl}" class="button" style="display: inline-block;">Create Account & View Message</a>
        </div>
        
        <div class="card">
          <div class="card-title">Message Preview</div>
          <p style="font-style: italic; color: #64748b;">"${data.messagePreview || 'You have a new message. Create an account to view and reply.'}"</p>
        </div>
        
        <div class="info-box">
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">🔐 Create Your Account</p>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">To view the full message and reply, you'll need to create a free account. It only takes a minute!</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Why create an account?</strong><br />• View and reply to messages from your practitioner<br />• Access your session history and booking details<br />• Manage your appointments in one place<br />• Receive important updates about your sessions</p>
        </div>
      `;
      break;
    }
    
    // Same-day booking emails are handled in generateEmailTemplate function
    // Fallback for any unknown email types
    default: {
      subject = `Notification from TheraMate.`;
      heroTitle = 'Notification';
      heroSubtitle = 'You have a new notification from TheraMate.';
      content = `<div class="card"><div class="card-title">Details</div><p>This is a notification email. Template for ${emailType} is being generated with modern styling.</p></div>`;
    }
  }

  const html = buildModernEmail({
    heroTitle,
    heroSubtitle,
    heroBadge,
    primaryColor,
    content,
  });

  return { subject, html };
}

function generateEmailTemplate(emailType: string, data: any, recipientName?: string, recipientEmail?: string): EmailTemplate {
  // Format all time fields to remove seconds
  if (data.sessionTime) {
    data.sessionTime = formatTimeForEmail(data.sessionTime);
  }
  if (data.originalTime) {
    data.originalTime = formatTimeForEmail(data.originalTime);
  }
  if (data.newTime) {
    data.newTime = formatTimeForEmail(data.newTime);
  }
  const baseUrl = Deno.env.get('SITE_URL') || 'https://theramate.co.uk'
  
  switch (emailType) {
    case 'booking_confirmation_client':
      // Generate calendar URL if not provided
      const calendarUrl = data.calendarUrl || (data.sessionDate && data.sessionTime && data.sessionDuration
        ? generateCalendarUrl(
            `${data.sessionType} with ${data.practitionerName}`,
            `Session: ${data.sessionType}\\nPractitioner: ${data.practitionerName}\\nDuration: ${data.sessionDuration} minutes`,
            data.sessionDate,
            data.sessionTime,
            data.sessionDuration || 60,
            data.sessionLocation
          )
        : '#')
      
      // Use sessionId-based URL for guests, fallback to provided bookingUrl or default
      // Include email in URL for guest access via RPC function
      const bookingUrl = data.sessionId 
        ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`
        : (data.bookingUrl || `${baseUrl}/client/sessions`)
      
      // Payment amount - use paymentAmount if available, otherwise sessionPrice
      const paymentAmount = data.paymentAmount || data.sessionPrice || 0
      const paymentId = data.paymentId || ''
      
      const content = `
            <div class="header">
              <h1>🎉 Booking & Payment Confirmed!</h1>
            </div>
            <div class="content">
          <p style="font-size: 18px; margin-bottom: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 32px; line-height: 1.7;">Your booking has been confirmed and payment processed successfully! We're excited to connect you with your practitioner.</p>
              
          <div class="detail-card" style="background: linear-gradient(135deg, ${EmailDesign.colors.primaryBg} 0%, #ffffff 100%); border-left: 4px solid ${EmailDesign.colors.primary}; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: ${EmailDesign.colors.primary}; display: flex; align-items: center; gap: 8px;">
                  <span>📋</span> Session Details
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Session Type</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.sessionType}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Practitioner</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.practitionerName}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${new Date(data.sessionDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.sessionTime}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Duration</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.sessionDuration} minutes</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Total Paid</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${EmailDesign.colors.primary};">£${paymentAmount.toFixed(2)}</p>
                  </div>
                </div>
                ${data.sessionLocation ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${EmailDesign.colors.border};">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">📍 Location</p>
                  <a href="${generateMapsUrl(data.sessionLocation)}" style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.primary}; text-decoration: none; display: inline-block; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a>
                </div>
                ` : ''}
              </div>

          ${paymentId ? `
          <div class="detail-card" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary}; margin-top: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${EmailDesign.colors.primary}; display: flex; align-items: center; gap: 8px;">
                  <span>💳</span> Payment Receipt
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Amount Paid</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${EmailDesign.colors.primary};">£${paymentAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Payment ID</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: ${EmailDesign.colors.textPrimary}; font-family: monospace;">${paymentId.substring(0, 20)}...</p>
                  </div>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${EmailDesign.colors.border};">
                  <p style="margin: 0; font-size: 14px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6;">
                    <strong style="color: ${EmailDesign.colors.primary};">✅ Payment Status:</strong> Confirmed and processed
                  </p>
                </div>
              </div>
          ` : ''}

          <div style="text-align: center; margin: 40px 0;">
                <a href="${bookingUrl}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; margin: 8px 4px; min-width: 180px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3); transition: all 0.3s ease;">View Booking Details</a>
                <a href="${calendarUrl}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; margin: 8px 4px; min-width: 180px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3); transition: all 0.3s ease;">📅 Add to Calendar</a>
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; margin: 8px 4px; min-width: 180px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3); transition: all 0.3s ease;">💬 Message Practitioner</a>
              </div>

              ${!data.clientHasAccount && recipientEmail ? `
          <div class="info-box" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #2563eb; padding: 24px; margin: 32px 0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span>✨</span> Create Your Account
            </h4>
            <p style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 15px; line-height: 1.7;">
              Create a free account to manage your bookings, track your sessions, and access exclusive offers.
            </p>
            <a href="${baseUrl}/register?email=${encodeURIComponent(recipientEmail)}&redirect=${encodeURIComponent(bookingUrl)}" class="cta-button" style="background: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">Create Account</a>
              </div>
              ` : ''}

              ${data.sessionId ? `
          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary}; padding: 20px; margin: 24px 0; border-radius: 10px;">
            <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.7;">
                  <strong style="color: ${EmailDesign.colors.primary};">💬 After your session:</strong> Share your experience and help other clients by leaving a review. 
              <a href="${baseUrl}/review?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}" style="color: ${EmailDesign.colors.primary}; text-decoration: underline; font-weight: 700;">Leave a review →</a>
                </p>
              </div>
              ` : ''}

          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 32px 0;">
            <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">📌 Important Reminders</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: ${EmailDesign.colors.textSecondary};">
              <li>Please arrive 5 minutes early for your session</li>
              <li>If you need to reschedule or cancel, please do so at least 24 hours in advance</li>
              <li>Bring any relevant medical information or notes</li>
            </ul>
          </div>
              
              ${data.cancellationPolicySummary ? `
          <div class="info-box" style="background: ${EmailDesign.colors.urgentBg}; border-left: 4px solid ${EmailDesign.colors.urgent}; padding: 20px; margin: 24px 0; border-radius: 10px;">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
              <span>⚠️</span> Cancellation Policy
            </h4>
            <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.7;">${data.cancellationPolicySummary}</p>
              </div>
              ` : ''}
            </div>
      `
      
      return {
        subject: `Booking & Payment Confirmed - ${data.sessionType} with ${data.practitionerName}`,
        html: EmailDesign.buildEmail({
          title: 'Booking & Payment Confirmed',
          headerColor: EmailDesign.colors.primary,
          content: content,
          baseUrl: baseUrl
        })
      }

    case 'booking_confirmation_practitioner':
      // Payment details - use from data if available
      const totalPayment = data.paymentAmount || data.sessionPrice || 0
      const platformFee = data.platformFee || (totalPayment * 0.005)
      const practitionerEarnings = data.practitionerAmount || (totalPayment - platformFee)
      const paymentIdPractitioner = data.paymentId || ''
      
      const practitionerContent = `
            <div class="header">
              <h1>🎉 New Booking & Payment Received!</h1>
            </div>
            <div class="content">
          <p style="font-size: 18px; margin-bottom: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 32px; line-height: 1.7;">You have received a new booking and payment! Here are all the details:</p>
              
          <div class="detail-card" style="background: linear-gradient(135deg, ${EmailDesign.colors.primaryBg} 0%, #ffffff 100%); border-left: 4px solid ${EmailDesign.colors.primary}; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: ${EmailDesign.colors.primary}; display: flex; align-items: center; gap: 8px;">
                  <span>📋</span> Session Details
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Client Name</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.clientName}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Session Type</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.sessionType}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${new Date(data.sessionDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.sessionTime}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Duration</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">${data.sessionDuration} minutes</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Client Email</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: ${EmailDesign.colors.textPrimary}; word-break: break-all;">${data.clientEmail}</p>
                  </div>
                </div>
              </div>

          <div class="detail-card" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid ${EmailDesign.colors.primary}; margin-top: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: ${EmailDesign.colors.primary}; display: flex; align-items: center; gap: 8px;">
                  <span>💳</span> Payment Breakdown
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Total Payment</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">£${totalPayment.toFixed(2)}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Platform Fee</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: ${EmailDesign.colors.textSecondary};">£${platformFee.toFixed(2)}</p>
                  </div>
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid ${EmailDesign.colors.primary};">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${EmailDesign.colors.textPrimary}; text-transform: uppercase; letter-spacing: 0.5px;">Your Earnings</p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${EmailDesign.colors.primary};">£${practitionerEarnings.toFixed(2)}</p>
                  </div>
                </div>
                ${paymentIdPractitioner ? `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${EmailDesign.colors.border};">
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: ${EmailDesign.colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Payment ID</p>
                  <p style="margin: 0; font-size: 12px; font-weight: 500; color: ${EmailDesign.colors.textPrimary}; font-family: monospace;">${paymentIdPractitioner.substring(0, 24)}...</p>
                </div>
                ` : ''}
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${EmailDesign.colors.border};">
                  <p style="margin: 0; font-size: 13px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6;">
                    <strong style="color: ${EmailDesign.colors.primary};">✅ Payment Status:</strong> Confirmed and processed. Funds will be transferred to your account within 2-7 business days.
                  </p>
                </div>
              </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/bookings`)}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; margin: 8px 4px; min-width: 180px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">View Session</a>
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; margin: 8px 4px; min-width: 180px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">💬 Message Client</a>
                <a href="${baseUrl}/practice/scheduler" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; margin: 8px 4px; min-width: 180px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.3);">📅 Manage Availability</a>
              </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 32px 0;">
            <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: ${EmailDesign.colors.textPrimary};">💡 Quick Actions</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: ${EmailDesign.colors.textSecondary};">
              <li>Review client details and session requirements</li>
              <li>Confirm location or mobile service details</li>
              <li>Prepare any necessary equipment or materials</li>
            </ul>
          </div>
            </div>
      `
      
      return {
        subject: `New Booking & Payment - ${data.sessionType} with ${data.clientName} - £${practitionerEarnings.toFixed(2)} earned`,
        html: EmailDesign.buildEmail({
          title: 'New Booking & Payment',
          headerColor: EmailDesign.colors.primary,
          content: practitionerContent,
          baseUrl: baseUrl
        })
      }

    case 'payment_confirmation_client':
      // Use sessionId-based URL for guests, fallback to provided bookingUrl or default
      // Include email in URL for guest access via RPC function
      const paymentBookingUrl = data.sessionId 
        ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`
        : (data.bookingUrl || `${baseUrl}/client/sessions`)
      
      const paymentClientContent = `
            <div class="header">
              <h1>Payment Confirmed!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Your payment has been successfully processed. Thank you for your booking!</p>
              
          <div class="detail-card">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> £${data.paymentAmount}</p>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Payment ID:</strong> ${data.paymentId}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
                ${data.sessionLocation ? `<p><strong>Address:</strong> <a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></p>` : ''}
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${paymentBookingUrl}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 8px 4px; min-width: 180px;">View Booking</a>
              </div>

          <p style="font-size: 16px; margin: 24px 0;">Your session is confirmed and you should receive a separate booking confirmation email shortly.</p>
              
              ${data.cancellationPolicySummary ? `
          <div class="info-box" style="background: ${EmailDesign.colors.urgentBg}; border-left: 4px solid ${EmailDesign.colors.urgent};">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 600;">Cancellation Policy</h4>
            <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.6;">${data.cancellationPolicySummary}</p>
              </div>
              ` : ''}
            </div>
      `
      
      return {
        subject: `Payment Confirmed - £${data.paymentAmount} for ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Payment Confirmed',
          headerColor: EmailDesign.colors.primary,
          content: paymentClientContent,
          baseUrl: baseUrl
        })
      }

    case 'payment_received_practitioner':
      const paymentPractitionerContent = `
            <div class="header">
              <h1>Payment Received!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have received a payment for your session. Here are the details:</p>
              
          <div class="detail-card">
                <h3>Payment Breakdown</h3>
                <p><strong>Total Session Price:</strong> £${data.paymentAmount}</p>
                <p><strong>Platform Fee (0.5%):</strong> £${data.platformFee}</p>
                <p><strong>Your Earnings:</strong> £${data.practitionerAmount}</p>
                <p><strong>Client:</strong> ${data.clientName}</p>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Payment ID:</strong> ${data.paymentId}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${baseUrl}/payments" class="cta-button">View Transaction</a>
            <a href="${baseUrl}/settings/payouts" class="cta-button">Manage Payouts</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;"><strong>Payout Schedule:</strong> Funds will be transferred to your bank account within 2-7 business days.</p>
            </div>
      `
      
      return {
        subject: `Payment Received - £${data.practitionerAmount} from ${data.clientName}`,
        html: EmailDesign.buildEmail({
          title: 'Payment Received',
          headerColor: EmailDesign.colors.primary,
          content: paymentPractitionerContent,
          baseUrl: baseUrl
        })
      }

    case 'session_reminder_24h':
      const reminder24hContent = `
            <div class="header">
              <h1>Session Reminder</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.clientFirstName || recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">This is a friendly reminder that you have a session tomorrow!</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Type:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
                ${data.sessionLocation ? `<p><strong>Location:</strong> <a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></p>` : ''}
              </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" class="cta-button">View Details</a>
                ${data.directionsUrl && data.directionsUrl !== '#' ? `<a href="${data.directionsUrl}" class="cta-button">Get Directions</a>` : ''}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button">Message ${data.practitionerFirstName || 'Practitioner'}</a>
              </div>

          <p style="font-size: 16px; margin: 24px 0 12px 0;"><strong>Preparation Tips:</strong></p>
          <ul style="font-size: 16px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 24px;">
                <li>Arrive 5 minutes early</li>
                <li>Wear comfortable clothing</li>
                <li>Bring any relevant medical information</li>
                <li>Stay hydrated</li>
              </ul>
              
              ${data.cancellationPolicySummary ? `
          <div class="info-box" style="background: ${EmailDesign.colors.urgentBg}; border-left: 4px solid ${EmailDesign.colors.urgent};">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 600;">Cancellation Policy</h4>
            <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.6;">${data.cancellationPolicySummary}</p>
              </div>
              ` : ''}
            </div>
      `
      
      return {
        subject: `Reminder: Your session is tomorrow`,
        html: EmailDesign.buildEmail({
          title: 'Session Reminder',
          headerColor: EmailDesign.colors.warning,
          content: reminder24hContent,
          baseUrl: baseUrl
        })
      }

    case 'session_reminder_2h':
      const reminder2hContent = `
            <div class="header">
              <h1>Session Reminder</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.clientFirstName || recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">This is a friendly reminder that your session starts in 2 hours!</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Type:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
                ${data.sessionLocation ? `<p><strong>Location:</strong> <a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></p>` : ''}
              </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" class="cta-button">View Details</a>
                ${data.directionsUrl && data.directionsUrl !== '#' ? `<a href="${data.directionsUrl}" class="cta-button">Get Directions</a>` : ''}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button">Message ${data.practitionerFirstName || 'Practitioner'}</a>
              </div>

          <p style="font-size: 16px; margin: 24px 0 12px 0;"><strong>Preparation Tips:</strong></p>
          <ul style="font-size: 16px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 24px;">
                <li>Plan to arrive 5 minutes early</li>
                <li>Check your route and travel time</li>
                <li>Wear comfortable clothing</li>
                <li>Bring any relevant medical information</li>
                <li>Stay hydrated before your session</li>
              </ul>
              
              ${data.cancellationPolicySummary ? `
          <div class="info-box" style="background: ${EmailDesign.colors.urgentBg}; border-left: 4px solid ${EmailDesign.colors.urgent};">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 600;">Cancellation Policy</h4>
            <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.6;">${data.cancellationPolicySummary}</p>
              </div>
              ` : ''}
            </div>
      `
      
      return {
        subject: `Reminder: Your session starts in 2 hours`,
        html: EmailDesign.buildEmail({
          title: 'Session Reminder',
          headerColor: EmailDesign.colors.urgent,
          content: reminder2hContent,
          baseUrl: baseUrl
        })
      }

    case 'session_reminder_1h':
      const reminder1hContent = `
            <div class="header">
              <h1>Session Starting Soon!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${data.clientFirstName || recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Your session starts in 1 hour. Please make sure you're ready!</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Type:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
                ${data.sessionLocation ? `<p><strong>Location:</strong> <a href="${generateMapsUrl(data.sessionLocation)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.sessionLocation}</a></p>` : ''}
              </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" class="cta-button">View Details</a>
                ${data.directionsUrl && data.directionsUrl !== '#' ? `<a href="${data.directionsUrl}" class="cta-button">Get Directions</a>` : ''}
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button">Message ${data.practitionerFirstName || 'Practitioner'}</a>
              </div>

          <p style="font-size: 16px; margin: 24px 0 12px 0;"><strong>Last-minute reminders:</strong></p>
          <ul style="font-size: 16px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 24px;">
                <li>Leave now to arrive on time</li>
                <li>Bring your ID if required</li>
                <li>Have your phone charged</li>
                <li>Check traffic conditions</li>
              </ul>
              
              ${data.cancellationPolicySummary ? `
          <div class="info-box" style="background: ${EmailDesign.colors.urgentBg}; border-left: 4px solid ${EmailDesign.colors.urgent};">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 600;">Cancellation Policy</h4>
            <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.6;">${data.cancellationPolicySummary}</p>
              </div>
              ` : ''}
            </div>
      `
      
      return {
        subject: `Reminder: Your session starts in 1 hour`,
        html: EmailDesign.buildEmail({
          title: 'Session Starting Soon',
          headerColor: EmailDesign.colors.error,
          content: reminder1hContent,
          baseUrl: baseUrl
        })
      }

    case 'cancellation':
      const cancellationContent = `
            <div class="header">
              <h1>Session Cancelled</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">We're sorry to inform you that your session has been cancelled.</p>
              
          <div class="detail-card">
                <h3>Cancellation Details</h3>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
                ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
                ${data.refundAmount ? `<p><strong>Refund Amount:</strong> £${data.refundAmount}</p>` : ''}
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/marketplace" class="cta-button">Book Another Session</a>
            <a href="${baseUrl}/help" class="cta-button">View Help Center</a>
              </div>

          ${data.refundAmount ? `<p style="font-size: 16px; margin-top: 24px;"><strong>Refund:</strong> Your refund will be processed within 5-10 business days.</p>` : ''}
            </div>
      `
      
      return {
        subject: `Session Cancelled - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Session Cancelled',
          headerColor: EmailDesign.colors.error,
          content: cancellationContent,
          baseUrl: baseUrl
        })
      }

    case 'practitioner_cancellation':
      const practitionerCancellationContent = `
            <div class="header">
              <h1>Session Cancelled</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">We're sorry to inform you that your practitioner has cancelled your session.</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${data.sessionDate ? new Date(data.sessionDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Time:</strong> ${data.sessionTime || 'N/A'}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
                ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
              </div>

              ${data.refundAmount && data.refundAmount > 0 ? `
          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">Refund Information</h4>
            <p style="margin: 8px 0; color: #166534; font-size: 14px; line-height: 1.6;"><strong>Refund Amount:</strong> £${data.refundAmount.toFixed(2)}</p>
            <p style="margin: 8px 0; color: #166534; font-size: 14px; line-height: 1.6;"><strong>Refund Percentage:</strong> ${data.refundPercent || 100}%</p>
            <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px; line-height: 1.6;">Your refund will be processed within 5-10 business days. You will receive a confirmation email once the refund has been processed.</p>
              </div>
              ` : ''}

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/marketplace" class="cta-button">Book Another Session</a>
            ${data.sessionId ? `<a href="${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}" class="cta-button">View Booking</a>` : ''}
              </div>

          <p style="font-size: 16px; margin-top: 24px;">We apologize for any inconvenience this may cause. If you have any questions or concerns, please don't hesitate to contact us.</p>
            </div>
      `
      
      return {
        subject: `Session Cancelled by Practitioner - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Session Cancelled by Practitioner',
          headerColor: EmailDesign.colors.primary,
          content: practitionerCancellationContent,
          baseUrl: baseUrl
        })
      }

    case 'rescheduling':
      const reschedulingContent = `
            <div class="header">
              <h1>Session Rescheduled</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Your session has been rescheduled. Here are the updated details:</p>
              
          <div class="detail-card">
                <h3>Updated Session Details</h3>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Original Date:</strong> ${new Date(data.originalDate).toLocaleDateString()}</p>
                <p><strong>Original Time:</strong> ${data.originalTime}</p>
                <p><strong>New Date:</strong> ${new Date(data.newDate).toLocaleDateString()}</p>
                <p><strong>New Time:</strong> ${data.newTime}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.bookingUrl || `${baseUrl}/client/sessions`}" class="cta-button">Confirm New Time</a>
                <a href="${data.calendarUrl || '#'}" class="cta-button">Add to Calendar</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;">Please make sure to update your calendar with the new time.</p>
            </div>
      `
      
      return {
        subject: `Session Rescheduled - New Date/Time`,
        html: EmailDesign.buildEmail({
          title: 'Session Rescheduled',
          headerColor: EmailDesign.colors.warning,
          content: reschedulingContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_booking_confirmed_client':
      const peerBookingClientContent = `
            <div class="header">
              <h1>Peer Treatment Booking Confirmed!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Your peer treatment booking has been confirmed! Here are the details:</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Type:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">Credit Information</h4>
            <p style="margin: 8px 0; color: #166534; font-size: 14px; line-height: 1.6;"><strong>Credits Used:</strong> ${data.paymentAmount || 0} credits</p>
            <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px; line-height: 1.6;">These credits have been deducted from your account balance.</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/credits#peer-treatment`}" class="cta-button">View Booking</a>
                <a href="${data.calendarUrl || '#'}" class="cta-button">Add to Calendar</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;"><strong>Note:</strong> This is a peer treatment exchange. Both parties are practitioners supporting each other in our community.</p>
            </div>
      `
      
      return {
        subject: `Peer Treatment Booking Confirmed - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Peer Treatment Booking Confirmed',
          headerColor: EmailDesign.colors.primary,
          content: peerBookingClientContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_credits_deducted':
      const peerCreditsDeductedContent = `
            <div class="header">
              <h1>Credits Deducted</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Credits have been deducted from your account for a peer treatment booking.</p>
              
          <div class="detail-card">
                <h3>Transaction Details</h3>
                <p><strong>Credits Deducted:</strong> ${data.paymentAmount || 0} credits</p>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/credits" class="cta-button">View Credit Balance</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;">You can check your credit balance and transaction history anytime on your Credits page.</p>
            </div>
      `
      
      return {
        subject: `${data.paymentAmount || 0} Credits Deducted - Peer Treatment Booking`,
        html: EmailDesign.buildEmail({
          title: 'Credits Deducted',
          headerColor: EmailDesign.colors.error,
          content: peerCreditsDeductedContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_booking_confirmed_practitioner':
      const peerBookingPractitionerContent = `
            <div class="header">
              <h1>New Peer Treatment Booking!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have received a new peer treatment booking from another practitioner in our community.</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Type:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Client (Practitioner):</strong> ${data.clientName}</p>
                <p><strong>Client Email:</strong> ${data.clientEmail}</p>
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">Credit Information</h4>
            <p style="margin: 8px 0; color: #166534; font-size: 14px; line-height: 1.6;"><strong>Credits Earned:</strong> ${data.paymentAmount || 0} credits</p>
            <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px; line-height: 1.6;">These credits have been added to your account balance. You can use them to book your own peer treatments!</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/bookings`)}" class="cta-button">View Session</a>
                <a href="${baseUrl}/credits#peer-treatment" class="cta-button">View Credits</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;"><strong>Note:</strong> This is a peer treatment exchange. Both parties are practitioners supporting each other in our community.</p>
            </div>
      `
      
      return {
        subject: `New Peer Treatment Booking - ${data.sessionType} with ${data.clientName}`,
        html: EmailDesign.buildEmail({
          title: 'New Peer Treatment Booking',
          headerColor: EmailDesign.colors.primary,
          content: peerBookingPractitionerContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_credits_earned':
      const peerCreditsEarnedContent = `
            <div class="header">
              <h1>Credits Earned!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Great news! You've earned credits from a peer treatment session.</p>
              
          <div class="detail-card">
                <h3>Transaction Details</h3>
                <p><strong>Credits Earned:</strong> +${data.paymentAmount || 0} credits</p>
                <p><strong>Session:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Client:</strong> ${data.clientName}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/credits" class="cta-button">View Credit Balance</a>
                <a href="${baseUrl}/credits#peer-treatment" class="cta-button">Book Peer Treatment</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;">You can use these credits to book your own peer treatment sessions with other practitioners!</p>
            </div>
      `
      
      return {
        subject: `+${data.paymentAmount || 0} Credits Earned - Peer Treatment`,
        html: EmailDesign.buildEmail({
          title: 'Credits Earned',
          headerColor: EmailDesign.colors.primary,
          content: peerCreditsEarnedContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_booking_cancelled_refunded':
      const peerCancelledContent = `
            <div class="header">
              <h1>Peer Treatment Cancelled</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">A peer treatment booking has been cancelled. ${data.cancellationReason ? `Reason: ${data.cancellationReason}` : ''}</p>
              
          <div class="detail-card">
                <h3>Cancelled Session</h3>
                <p><strong>Type:</strong> ${data.sessionType}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                ${data.practitionerName ? `<p><strong>Practitioner:</strong> ${data.practitionerName}</p>` : ''}
                ${data.clientName ? `<p><strong>Client:</strong> ${data.clientName}</p>` : ''}
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.warningBg}; border-left: 4px solid ${EmailDesign.colors.warning};">
            <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">Credit Refund</h4>
            <p style="margin: 8px 0; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>Credits Refunded:</strong> ${data.refundAmount || 0} credits</p>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px; line-height: 1.6;">These credits have been refunded to your account balance and are available for future peer treatment bookings.</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/credits" class="cta-button">View Credit Balance</a>
                <a href="${baseUrl}/credits#peer-treatment" class="cta-button">Book Another Session</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;">If you'd like to reschedule, you can book a new session with the same practitioner or choose a different one.</p>
            </div>
      `
      
      return {
        subject: `Peer Treatment Cancelled - ${data.refundAmount || 0} Credits Refunded`,
        html: EmailDesign.buildEmail({
          title: 'Peer Treatment Cancelled',
          headerColor: EmailDesign.colors.error,
          content: peerCancelledContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_request_received':
      const peerRequestReceivedContent = `
            <div class="header">
              <h1>New Peer Treatment Request</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have received a new peer treatment request from ${data.requesterName || 'another practitioner'}.</p>
              
          <div class="detail-card">
                <h3>Request Details</h3>
                <p><strong>From:</strong> ${data.requesterName || 'A Practitioner'}</p>
                ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                ${data.paymentAmount ? `<p><strong>Credits:</strong> ${data.paymentAmount} credits</p>` : ''}
              </div>

              ${data.expiresAt ? `
          <div class="info-box" style="background: ${EmailDesign.colors.warningBg}; border-left: 4px solid ${EmailDesign.colors.warning};">
            <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">⏰ Action Required</h4>
            <p style="margin: 8px 0; color: #92400e; font-size: 14px; line-height: 1.6;">This request expires on ${new Date(data.expiresAt).toLocaleString()}</p>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px; line-height: 1.6;">Please respond soon to secure this booking.</p>
              </div>
              ` : ''}

          <div style="text-align: center; margin: 32px 0;">
                ${data.acceptUrl ? `<a href="${data.acceptUrl}" class="cta-button">Accept Request</a>` : ''}
            ${data.declineUrl ? `<a href="${data.declineUrl}" class="cta-button" style="background: ${EmailDesign.colors.error}; color: white;">Decline Request</a>` : ''}
                ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="cta-button">View Request</a>` : ''}
              </div>

          <p style="font-size: 16px; margin-top: 24px;">This is a peer treatment exchange request. Accepting will create a booking and transfer credits. You can review the full details in your dashboard.</p>
            </div>
      `
      
      return {
        subject: `New Peer Treatment Request from ${data.requesterName || 'A Practitioner'}`,
        html: EmailDesign.buildEmail({
          title: 'New Peer Treatment Request',
          headerColor: EmailDesign.colors.primary,
          content: peerRequestReceivedContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_request_accepted':
      const peerRequestAcceptedContent = `
            <div class="header">
              <h1>Request Accepted! 🎉</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Great news! ${data.practitionerName || 'The practitioner'} has accepted your peer treatment request.</p>
              
          <div class="detail-card">
                <h3>Confirmed Session Details</h3>
                ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
              </div>

              ${data.paymentAmount ? `
          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">Credit Information</h4>
            <p style="margin: 8px 0; color: #166534; font-size: 14px; line-height: 1.6;"><strong>Credits Deducted:</strong> ${data.paymentAmount} credits</p>
            <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px; line-height: 1.6;">Credits have been transferred from your account. Your booking is now confirmed!</p>
              </div>
              ` : ''}

          <div style="text-align: center; margin: 32px 0;">
                ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="cta-button">View Booking</a>` : ''}
                ${data.calendarUrl ? `<a href="${data.calendarUrl}" class="cta-button">Add to Calendar</a>` : ''}
                <a href="${baseUrl}/credits#peer-treatment" class="cta-button">View Credits</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;">Your peer treatment session is confirmed. You'll receive a reminder email closer to the session date.</p>
            </div>
      `
      
      return {
        subject: `Peer Treatment Request Accepted - ${data.sessionType || 'Session'}`,
        html: EmailDesign.buildEmail({
          title: 'Peer Treatment Request Accepted',
          headerColor: EmailDesign.colors.primary,
          content: peerRequestAcceptedContent,
          baseUrl: baseUrl
        })
      }

    case 'peer_request_declined':
      const peerRequestDeclinedContent = `
            <div class="header">
              <h1>Request Declined</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">We're sorry to inform you that ${data.practitionerName || 'the practitioner'} has declined your peer treatment request.</p>
              
          <div class="detail-card">
                <h3>Requested Session</h3>
                ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
              </div>

          <p style="font-size: 16px; margin: 24px 0;">Your credits have not been deducted. You can book another session with a different practitioner or try again later.</p>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/credits#peer-treatment" class="cta-button">Find Another Practitioner</a>
                <a href="${baseUrl}/credits" class="cta-button">View Credits</a>
              </div>

          <p style="font-size: 16px; margin-top: 24px;">Don't worry - there are many other practitioners available for peer treatment exchanges. Keep exploring!</p>
            </div>
      `
      
      return {
        subject: `Peer Treatment Request Declined`,
        html: EmailDesign.buildEmail({
          title: 'Peer Treatment Request Declined',
          headerColor: EmailDesign.colors.error,
          content: peerRequestDeclinedContent,
          baseUrl: baseUrl
        })
      }

    case 'review_request_client':
      const reviewRequestContent = `
            <div class="header">
              <h1>Thank You for Your Session!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">We hope you enjoyed your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'}.</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                ${data.sessionType ? `<p><strong>Session Type:</strong> ${data.sessionType}</p>` : ''}
                <p><strong>Date:</strong> ${data.sessionDate ? new Date(data.sessionDate).toLocaleDateString() : 'N/A'}</p>
                ${data.sessionTime ? `<p><strong>Time:</strong> ${data.sessionTime}</p>` : ''}
                ${data.sessionDuration ? `<p><strong>Duration:</strong> ${data.sessionDuration} minutes</p>` : ''}
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <p style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">
              💬 Share Your Experience
                </p>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                  Your feedback helps other clients make informed decisions and helps practitioners improve their services.
                </p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/review?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}" class="cta-button">Leave a Review</a>
              </div>

          <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6; margin: 24px 0;">
                <strong>Why leave a review?</strong><br>
                • Help other clients find the right practitioner<br>
                • Support your practitioner's practice<br>
                • Share your experience with the community
              </p>

          <p style="margin-top: 24px; font-size: 14px; color: ${EmailDesign.colors.textSecondary};">
                If you have any questions or concerns about your session, please don't hesitate to contact us at support@theramate.co.uk
              </p>
            </div>
      `
      
      return {
        subject: `How was your session with ${data.practitionerName || 'your practitioner'}?`,
        html: EmailDesign.buildEmail({
          title: 'Leave a Review',
          headerColor: EmailDesign.colors.primary,
          content: reviewRequestContent,
          baseUrl: baseUrl
        })
      }

    case 'message_received_guest':
      const messageGuestContent = `
            <div class="header">
              <h1>You Have a New Message</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">${data.practitionerName || 'Your practitioner'} has sent you a message.</p>
              
          <div class="detail-card">
                <h3>Message Preview</h3>
            <p style="margin: 0; color: ${EmailDesign.colors.textSecondary}; font-style: italic; font-size: 16px; line-height: 1.6;">
                  "${data.messagePreview || 'You have a new message. Create an account to view and reply.'}"
                </p>
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <p style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">
              🔐 Create Your Account
                </p>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                  To view the full message and reply, you'll need to create a free account. It only takes a minute!
                </p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/register?email=${encodeURIComponent(recipientEmail)}&redirect=${encodeURIComponent(`/messages?conversation=${data.conversationId}`)}" class="cta-button">Create Account & View Message</a>
              </div>

          <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6; margin: 24px 0;">
                <strong>Why create an account?</strong><br>
                • View and reply to messages from your practitioner<br>
                • Access your session history and booking details<br>
                • Manage your appointments in one place<br>
                • Receive important updates about your sessions
              </p>

          <p style="margin-top: 24px; font-size: 14px; color: ${EmailDesign.colors.textSecondary};">
                If you have any questions or concerns, please don't hesitate to contact us at support@theramate.co.uk
              </p>
            </div>
      `
      
      return {
        subject: `New Message from ${data.practitionerName || 'your practitioner'}`,
        html: EmailDesign.buildEmail({
          title: 'You Have a New Message',
          headerColor: EmailDesign.colors.primary,
          content: messageGuestContent,
          baseUrl: baseUrl
        })
      }

    case 'message_received_practitioner':
      const messagePractitionerContent = `
            <div class="header">
              <h1>You Have a New Message</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have received a new message from ${data.senderName || 'a client'}.</p>
              
          <div class="detail-card">
                <h3>Message Preview</h3>
            <p style="margin: 0; color: ${EmailDesign.colors.textSecondary}; font-style: italic; font-size: 16px; line-height: 1.6;">
                  "${data.messagePreview || 'You have a new message.'}"
                </p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button">View Message</a>
              </div>

          <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6; margin: 24px 0;">
                <strong>Quick Actions:</strong><br>
                • Reply directly from your messages inbox<br>
                • View conversation history<br>
                • Manage all your client communications
              </p>

          <p style="margin-top: 24px; font-size: 14px; color: ${EmailDesign.colors.textSecondary};">
                If you have any questions or concerns, please don't hesitate to contact us at support@theramate.co.uk
              </p>
            </div>
      `
      
      return {
        subject: `New Message from ${data.senderName || 'a client'}`,
        html: EmailDesign.buildEmail({
          title: 'You Have a New Message',
          headerColor: EmailDesign.colors.primary,
          content: messagePractitionerContent,
          baseUrl: baseUrl
        })
      }

    case 'booking_request_practitioner':
      const bookingRequestContent = `
            <div class="header">
              <h1>New Mobile Booking Request</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have received a new mobile booking request from ${data.clientName || 'a client'}.</p>
              
          <div class="detail-card">
                <h3>Request Details</h3>
                ${data.serviceType ? `<p><strong>Service:</strong> ${data.serviceType}</p>` : ''}
                ${data.requestedDate ? `<p><strong>Requested Date:</strong> ${new Date(data.requestedDate).toLocaleDateString()}</p>` : ''}
                ${data.requestedTime ? `<p><strong>Requested Time:</strong> ${data.requestedTime}</p>` : ''}
                ${data.clientAddress ? `<p><strong>Client Address:</strong> <a href="${generateMapsUrl(data.clientAddress)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.clientAddress}</a></p>` : ''}
                ${data.distanceKm ? `<p><strong>Distance:</strong> ${data.distanceKm} km</p>` : ''}
                ${data.price ? `<p><strong>Price:</strong> £${(data.price / 100).toFixed(2)}</p>` : ''}
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.warningBg}; border-left: 4px solid ${EmailDesign.colors.warning};">
            <p style="margin: 0 0 12px 0; color: ${EmailDesign.colors.warning}; font-size: 16px; font-weight: 600;">
              ⏰ Action Required
                </p>
            <p style="margin: 0; color: ${EmailDesign.colors.warning}; font-size: 14px; line-height: 1.6;">
                  This request is pending your approval. Please review and respond within 24 hours.
                </p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.requestUrl || `${baseUrl}/practice/mobile-requests`}" class="cta-button">Review Request</a>
              </div>

          <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6; margin: 24px 0;">
                <strong>What happens next?</strong><br>
                • Review the request details and client location<br>
                • Accept or decline the request<br>
                • If accepted, payment will be captured and session created<br>
                • If declined, payment will be released to the client
              </p>

          <p style="margin-top: 24px; font-size: 14px; color: ${EmailDesign.colors.textSecondary};">
                If you have any questions or concerns, please don't hesitate to contact us at support@theramate.co.uk
              </p>
            </div>
      `
      
      return {
        subject: `New Mobile Booking Request from ${data.clientName || 'a client'}`,
        html: EmailDesign.buildEmail({
          title: 'New Mobile Booking Request',
          headerColor: EmailDesign.colors.warning,
          content: bookingRequestContent,
          baseUrl: baseUrl
        })
      }

    case 'mobile_request_accepted_client':
      return {
        subject: `Your mobile request was accepted by ${data.practitionerName || 'your practitioner'}`,
        html: EmailDesign.buildEmail({
          title: 'Mobile Request Accepted',
          headerColor: EmailDesign.colors.primary,
          content: `
            <div class="content">
              <p style="font-size: 16px;">Hi ${recipientName || 'there'},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news. ${data.practitionerName || 'Your practitioner'} accepted your mobile booking request.
              </p>
              <div class="detail-card">
                <h3>Session Details</h3>
                ${data.serviceType ? `<p><strong>Service:</strong> ${data.serviceType}</p>` : ''}
                ${data.requestedDate ? `<p><strong>Date:</strong> ${new Date(data.requestedDate).toLocaleDateString()}</p>` : ''}
                ${data.requestedTime ? `<p><strong>Time:</strong> ${data.requestedTime}</p>` : ''}
                ${data.clientAddress ? `<p><strong>Location:</strong> <a href="${generateMapsUrl(data.clientAddress)}" style="color: ${EmailDesign.colors.primary}; text-decoration: none; border-bottom: 1px solid ${EmailDesign.colors.primary};">${data.clientAddress}</a></p>` : ''}
                ${data.price ? `<p><strong>Amount:</strong> £${(Number(data.price) / 100).toFixed(2)}</p>` : ''}
              </div>
              <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; margin-top: 20px;">
                Your payment authorization has now been captured and your session is confirmed.
              </p>
              <div style="text-align:center; margin-top:24px;">
                <a href="${data.requestUrl || `${baseUrl}/guest/mobile-requests`}" class="cta-button">View Mobile Requests</a>
              </div>
            </div>
          `,
          baseUrl
        })
      }

    case 'mobile_request_declined_client': {
      const hasAlternate = !!(data.newDate && data.newTime);
      const altDateFormatted = hasAlternate ? new Date(data.newDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
      const altTimeFormatted = hasAlternate ? String(data.newTime).slice(0, 5) : '';
      return {
        subject: hasAlternate
          ? `${data.practitionerName || 'Your practitioner'} suggested an alternative time for your mobile request`
          : `Your mobile request was declined by ${data.practitionerName || 'your practitioner'}`,
        html: EmailDesign.buildEmail({
          title: hasAlternate ? 'Alternative Time Suggested' : 'Mobile Request Declined',
          headerColor: hasAlternate ? EmailDesign.colors.primary : EmailDesign.colors.warning,
          content: `
            <div class="content">
              <p style="font-size: 16px;">Hi ${recipientName || 'there'},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${data.practitionerName || 'Your practitioner'} was unable to accept your original mobile booking request${hasAlternate ? ' but has suggested an alternative time below' : ''}.
              </p>
              <div class="detail-card">
                <h3>Original Request</h3>
                ${data.serviceType ? `<p><strong>Service:</strong> ${data.serviceType}</p>` : ''}
                ${data.requestedDate ? `<p><strong>Date:</strong> ${new Date(data.requestedDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                ${data.requestedTime ? `<p><strong>Time:</strong> ${String(data.requestedTime).slice(0, 5)}</p>` : ''}
                ${data.cancellationReason ? `<p><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
              </div>
              ${hasAlternate ? `
              <div style="margin-top: 16px; padding: 16px 20px; background: ${EmailDesign.colors.primaryBg}; border: 1px solid ${EmailDesign.colors.primary}; border-left: 4px solid ${EmailDesign.colors.primary}; border-radius: 8px;">
                <h3 style="margin: 0 0 12px; color: ${EmailDesign.colors.primaryDark}; font-size: 16px;">Alternative Time Suggested</h3>
                <p style="margin: 4px 0;"><strong>Date:</strong> ${altDateFormatted}</p>
                <p style="margin: 4px 0;"><strong>Time:</strong> ${altTimeFormatted}</p>
                <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; margin-top: 10px;">
                  Click the button below to request a new booking for this suggested date and time on the platform.
                </p>
              </div>
              ` : ''}
              <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; margin-top: 20px;">
                Any payment hold has been released.
              </p>
              <div style="text-align:center; margin-top:24px;">
                <a href="${data.requestUrl || `${baseUrl}/guest/mobile-requests`}" class="cta-button">${hasAlternate ? 'Book Suggested Time' : 'Request a Different Time'}</a>
              </div>
            </div>
          `,
          baseUrl
        })
      }
    }

    case 'mobile_request_expired_client':
      return {
        subject: `Your mobile request has expired`,
        html: EmailDesign.buildEmail({
          title: 'Mobile Request Expired',
          headerColor: EmailDesign.colors.warning,
          content: `
            <div class="content">
              <p style="font-size: 16px;">Hi ${recipientName || 'there'},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Your mobile booking request has expired because it was not accepted in time.
              </p>
              <div class="detail-card">
                <h3>Expired Request</h3>
                ${data.practitionerName ? `<p><strong>Practitioner:</strong> ${data.practitionerName}</p>` : ''}
                ${data.serviceType ? `<p><strong>Service:</strong> ${data.serviceType}</p>` : ''}
                ${data.requestedDate ? `<p><strong>Date:</strong> ${new Date(data.requestedDate).toLocaleDateString()}</p>` : ''}
                ${data.requestedTime ? `<p><strong>Time:</strong> ${data.requestedTime}</p>` : ''}
              </div>
              <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; margin-top: 20px;">
                Any payment hold has been released. You can submit a new request at any time.
              </p>
              <div style="text-align:center; margin-top:24px;">
                <a href="${data.requestUrl || `${baseUrl}/guest/mobile-requests`}" class="cta-button">View Mobile Requests</a>
              </div>
            </div>
          `,
          baseUrl
        })
      }

    case 'treatment_exchange_request_practitioner':
      const treatmentExchangeContent = `
            <div class="header">
              <h1>New Treatment Exchange Request</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have received a new treatment exchange request from ${data.requesterName || 'a practitioner'}.</p>
              
          <div class="detail-card">
                <h3>Request Details</h3>
                ${data.serviceType ? `<p><strong>Service:</strong> ${data.serviceType}</p>` : ''}
                ${data.requestedDate ? `<p><strong>Requested Date:</strong> ${new Date(data.requestedDate).toLocaleDateString()}</p>` : ''}
                ${data.requestedTime ? `<p><strong>Requested Time:</strong> ${data.requestedTime}</p>` : ''}
                ${data.creditCost ? `<p><strong>Credit Cost:</strong> ${data.creditCost} credits</p>` : ''}
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <p style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">
              💡 Treatment Exchange
                </p>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                  This is a peer-to-peer treatment exchange. If accepted, you'll exchange treatments with another practitioner.
                </p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.requestUrl || `${baseUrl}/practice/treatment-exchange`}" class="cta-button">Review Request</a>
              </div>

          <p style="font-size: 14px; color: ${EmailDesign.colors.textSecondary}; line-height: 1.6; margin: 24px 0;">
                <strong>What happens next?</strong><br>
                • Review the request details<br>
                • Accept or decline the request<br>
                • If accepted, credits will be deducted and session created<br>
                • You'll receive a reciprocal booking request
              </p>

          <p style="margin-top: 24px; font-size: 14px; color: ${EmailDesign.colors.textSecondary};">
                If you have any questions or concerns, please don't hesitate to contact us at support@theramate.co.uk
              </p>
            </div>
      `
      
      return {
        subject: `New Treatment Exchange Request from ${data.requesterName || 'a practitioner'}`,
        html: EmailDesign.buildEmail({
          title: 'New Treatment Exchange Request',
          headerColor: EmailDesign.colors.primary,
          content: treatmentExchangeContent,
          baseUrl: baseUrl
        })

    case 'welcome_practitioner':
      const welcomePractitionerContent = `
            <div class="header">
              <h1>Welcome to TheraMate.!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Thank you for joining TheraMate.! We're excited to have you on board and help you grow your practice.</p>
              
          <div class="detail-card">
                <h3>Next Steps to Get Started</h3>
                <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px;">To start receiving bookings, complete these steps:</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;"><strong>1. Complete Your Profile</strong></p>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 16px; padding-left: 16px;">Add your professional information, qualifications, and specializations to help clients find you.</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;"><strong>2. Set Your Availability</strong></p>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 16px; padding-left: 16px;">Configure your working hours and availability so clients can book sessions with you.</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;"><strong>3. Explore Your Dashboard</strong></p>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 0; padding-left: 16px;">Get familiar with your dashboard to manage bookings, clients, and your practice.</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/dashboard`}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 8px 4px; min-width: 180px;">Go to Dashboard</a>
                <a href="${baseUrl}/profile" class="cta-button" style="background: #ffffff; color: ${EmailDesign.colors.primary} !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 8px; border: 2px solid ${EmailDesign.colors.primary}; display: inline-block; margin: 8px 4px; min-width: 180px;">Complete Profile</a>
              </div>

          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin: 24px 0;">
                If you have any questions or need assistance, our support team is here to help. Simply reply to this email or visit our help center.
              </p>

          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 24px;">
                Welcome aboard!<br>
                The TheraMate. Team
              </p>
            </div>
      `
      
      return {
        subject: 'Welcome to TheraMate. - Your account is ready!',
        html: EmailDesign.buildEmail({
          title: 'Welcome to TheraMate.',
          headerColor: EmailDesign.colors.primary,
          content: welcomePractitionerContent,
          baseUrl: baseUrl
        })
      }

    case 'welcome_client':
      const welcomeClientContent = `
            <div class="header">
              <h1>Welcome to TheraMate.!</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Thank you for joining TheraMate.! We're here to help you find the right healthcare professional for your needs.</p>
              
          <div class="detail-card">
                <h3>How to Get Started</h3>
                <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 16px;">Booking your first session is easy:</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;"><strong>1. Browse Practitioners</strong></p>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 16px; padding-left: 16px;">Explore our marketplace to find verified practitioners who match your needs and preferences.</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;"><strong>2. Book a Session</strong></p>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 16px; padding-left: 16px;">Choose a date and time that works for you. You can book sessions up to 2 hours in advance.</p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-bottom: 8px;"><strong>3. Manage Your Bookings</strong></p>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 0; padding-left: 16px;">View and manage all your upcoming sessions, session history, and messages from your dashboard.</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/marketplace`}" class="cta-button" style="background: ${EmailDesign.colors.primary}; color: #ffffff !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 8px 4px; min-width: 180px;">Browse Practitioners</a>
                <a href="${baseUrl}/dashboard" class="cta-button" style="background: #ffffff; color: ${EmailDesign.colors.primary} !important; font-weight: 700; font-size: 18px; padding: 16px 32px; text-decoration: none; border-radius: 8px; border: 2px solid ${EmailDesign.colors.primary}; display: inline-block; margin: 8px 4px; min-width: 180px;">View Dashboard</a>
              </div>

          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin: 24px 0;">
                If you have any questions or need assistance finding the right practitioner, our support team is here to help. Simply reply to this email or visit our help center.
              </p>

          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 24px;">
                Welcome aboard!<br>
                The TheraMate. Team
              </p>
            </div>
      `
      
      return {
        subject: 'Welcome to TheraMate. - Your account is ready!',
        html: EmailDesign.buildEmail({
          title: 'Welcome to TheraMate.',
          headerColor: EmailDesign.colors.primary,
          content: welcomeClientContent,
          baseUrl: baseUrl
        })
      }

    case 'same_day_booking_pending_practitioner':
      const sameDayPendingContent = `
            <div class="header" style="background: ${EmailDesign.colors.urgent};">
              <h1>Same-Day Booking Request</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">You have a same-day booking request from ${data.clientName || 'a client'} that requires your approval.</p>
              
          <div class="info-box" style="background: ${EmailDesign.colors.urgentBg}; border-left: 4px solid ${EmailDesign.colors.urgent};">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 600;">⏰ Approval Deadline</h4>
            <p style="margin: 0; color: #7c2d12; font-size: 14px; line-height: 1.6;">Please respond to this request as soon as possible. The client's payment authorization will expire if not approved in time.</p>
          </div>
              
          <div class="detail-card">
                <h3>Booking Details</h3>
                <p><strong>Client:</strong> ${data.clientName || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Duration:</strong> ${data.sessionDuration || 60} minutes</p>
                <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
                <p><strong>Amount:</strong> £${data.sessionPrice || 'N/A'}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || (data.sessionId ? `${baseUrl}/practice/sessions/${data.sessionId}` : `${baseUrl}/practice/bookings`)}" class="cta-button" style="background: ${EmailDesign.colors.urgent}; color: #ffffff !important;">Review & Approve</a>
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button">Message Client</a>
              </div>

          <div class="info-box" style="background: #f8fafc; border-left: 4px solid ${EmailDesign.colors.urgent};">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 600;">💡 What happens next?</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">• If you approve, the payment will be captured and the booking will be confirmed<br />• If you decline, the payment authorization will be released<br />• The client will be notified of your decision</p>
          </div>
            </div>
      `
      
      return {
        subject: `Same-Day Booking Request - ${data.sessionType} with ${data.clientName}`,
        html: EmailDesign.buildEmail({
          title: 'Same-Day Booking Request',
          headerColor: EmailDesign.colors.urgent,
          content: sameDayPendingContent,
          baseUrl: baseUrl
        })
      }

    case 'same_day_booking_approved_client':
      const sameDayApprovedContent = `
            <div class="header">
              <h1>Booking Approved! 🎉</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Great news! Your same-day booking with ${data.practitionerName || 'your practitioner'} has been approved.</p>
              
          <div class="detail-card">
                <h3>Session Details</h3>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
                <p><strong>Amount:</strong> £${data.sessionPrice || 'N/A'}</p>
              </div>

          <div class="info-box" style="background: ${EmailDesign.colors.primaryBg}; border-left: 4px solid ${EmailDesign.colors.primary};">
            <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">✅ Payment Processed</h4>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">Your payment has been successfully captured and your booking is confirmed. We look forward to seeing you at your session!</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || (data.sessionId ? `${baseUrl}/client/sessions/${data.sessionId}` : `${baseUrl}/client/sessions`)}" class="cta-button">View Booking</a>
                <a href="${data.messageUrl || `${baseUrl}/messages`}" class="cta-button">Message Practitioner</a>
              </div>
            </div>
      `
      
      return {
        subject: `Booking Approved - ${data.sessionType} with ${data.practitionerName}`,
        html: EmailDesign.buildEmail({
          title: 'Booking Approved',
          headerColor: EmailDesign.colors.primary,
          content: sameDayApprovedContent,
          baseUrl: baseUrl
        })
      }

    case 'same_day_booking_declined_client':
      const sameDayDeclinedContent = `
            <div class="header" style="background: ${EmailDesign.colors.error};">
              <h1>Booking Request Declined</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Unfortunately, your same-day booking request has been declined by ${data.practitionerName || 'the practitioner'}.</p>
              
          <div class="info-box" style="background: ${EmailDesign.colors.errorBg}; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">💰 Payment Authorization Released</h4>
            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">Your payment authorization has been released. No charges have been made to your account.</p>
          </div>
              
          <div class="detail-card">
                <h3>Booking Details</h3>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
                ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/marketplace`}" class="cta-button" style="background: ${EmailDesign.colors.error}; color: #ffffff !important;">Book Another Session</a>
              </div>

          <div class="info-box" style="background: #f8fafc; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 600;">💡 What's next?</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">You can browse other available practitioners or try booking with a different time slot. We're here to help you find the right session!</p>
          </div>
            </div>
      `
      
      return {
        subject: `Booking Request Declined - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Booking Request Declined',
          headerColor: EmailDesign.colors.error,
          content: sameDayDeclinedContent,
          baseUrl: baseUrl
        })
      }

    case 'same_day_booking_expired_client':
      const sameDayExpiredContent = `
            <div class="header" style="background: ${EmailDesign.colors.error};">
              <h1>Booking Request Expired</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Your same-day booking request has expired because it was not approved in time.</p>
              
          <div class="info-box" style="background: ${EmailDesign.colors.errorBg}; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">💰 Payment Authorization Released</h4>
            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">Your payment authorization has been automatically released. No charges have been made to your account.</p>
          </div>
              
          <div class="detail-card">
                <h3>Booking Details</h3>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/marketplace`}" class="cta-button" style="background: ${EmailDesign.colors.error}; color: #ffffff !important;">Book Another Session</a>
              </div>

          <div class="info-box" style="background: #f8fafc; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 600;">⏰ Why did this expire?</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">Same-day booking requests require practitioner approval within a specific timeframe. Since the practitioner didn't respond in time, the request has expired. You can try booking with another practitioner or a different time slot.</p>
          </div>
            </div>
      `
      
      return {
        subject: `Booking Request Expired - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Booking Request Expired',
          headerColor: EmailDesign.colors.error,
          content: sameDayExpiredContent,
          baseUrl: baseUrl
        })
      }

    case 'booking_expired':
      const bookingExpiredContent = `
            <div class="header" style="background: ${EmailDesign.colors.error};">
              <h1>Booking Expired</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">Your same-day booking request has expired because it was not approved in time.</p>
              
          <div class="info-box" style="background: ${EmailDesign.colors.errorBg}; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">💰 Payment Authorization Released</h4>
            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">Your payment authorization has been automatically released. No charges have been made to your account.</p>
          </div>
              
          <div class="detail-card">
                <h3>Booking Details</h3>
                <p><strong>Practitioner:</strong> ${data.practitionerName || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/marketplace`}" class="cta-button" style="background: ${EmailDesign.colors.error}; color: #ffffff !important;">Book Another Session</a>
              </div>
            </div>
      `
      
      return {
        subject: `Booking Expired - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Booking Expired',
          headerColor: EmailDesign.colors.error,
          content: bookingExpiredContent,
          baseUrl: baseUrl
        })
      }

    case 'booking_expired_practitioner':
      const bookingExpiredPractitionerContent = `
            <div class="header" style="background: ${EmailDesign.colors.error};">
              <h1>Booking Request Expired</h1>
            </div>
            <div class="content">
          <p style="font-size: 16px; margin-bottom: 16px;">Hi ${recipientName || 'there'},</p>
          <p style="font-size: 16px; margin-bottom: 24px;">A same-day booking request has expired because it was not approved in time.</p>
              
          <div class="info-box" style="background: ${EmailDesign.colors.errorBg}; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">💰 Payment Authorization Released</h4>
            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">The client's payment authorization has been automatically released. No action is required from you.</p>
          </div>
              
          <div class="detail-card">
                <h3>Booking Details</h3>
                <p><strong>Client:</strong> ${data.clientName || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.sessionDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.sessionTime}</p>
                <p><strong>Session Type:</strong> ${data.sessionType || 'N/A'}</p>
              </div>

          <div style="text-align: center; margin: 32px 0;">
                <a href="${data.bookingUrl || `${baseUrl}/practice/bookings`}" class="cta-button" style="background: ${EmailDesign.colors.error}; color: #ffffff !important;">View Bookings</a>
              </div>

          <div class="info-box" style="background: #f8fafc; border-left: 4px solid ${EmailDesign.colors.error};">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 600;">💡 Tip</h4>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">To avoid expired bookings, try to review and respond to same-day booking requests as soon as possible. You can enable notifications to be alerted immediately when new requests come in.</p>
          </div>
            </div>
      `
      
      return {
        subject: `Same-Day Booking Expired - ${data.sessionType}`,
        html: EmailDesign.buildEmail({
          title: 'Booking Request Expired',
          headerColor: EmailDesign.colors.error,
          content: bookingExpiredPractitionerContent,
          baseUrl: baseUrl
        })
      }

    default:
      throw new Error(`Unknown email type: ${emailType}`)
  }
}
