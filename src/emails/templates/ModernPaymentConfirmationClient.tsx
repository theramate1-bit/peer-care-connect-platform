import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPaymentConfirmationClientProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPaymentConfirmationClient = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPaymentConfirmationClientProps) => {
  const paymentBookingUrl = data.sessionId
    ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`
    : data.bookingUrl || `${baseUrl}/client/sessions`;

  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Payment Confirmed!`;
  const heroSubtitle = `Your payment of £${data.paymentAmount || 0} has been successfully processed. Thank you for your booking!`;

  return (
    <ModernEmailBase
      preview={`Payment Confirmed - £${data.paymentAmount} for ${data.sessionType}`}
      title="Payment Confirmed - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Payment Confirmed"
      primaryColor="#059669"
      baseUrl={baseUrl}
    >
      {/* Hero Button */}
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <ModernButton href={paymentBookingUrl} variant="primary" fullWidth>
                View Booking
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      {/* Payment Details Card */}
      <ModernCard
        title="Payment Details"
        badge={data.paymentAmount ? `£${data.paymentAmount}` : undefined}
        accentColor="#059669"
      >
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Payment ID
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {data.paymentId || 'N/A'}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Session
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {data.sessionType || 'N/A'}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Date
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {formattedDate}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Time
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {formattedTime}
                </Text>
              </td>
            </tr>
            <tr>
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Practitioner
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {data.practitionerName || 'N/A'}
                </Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {/* Info Message */}
      <Section
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          borderLeft: '4px solid #059669',
        }}
      >
        <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          Your session is confirmed and you should receive a separate booking confirmation email shortly.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernPaymentConfirmationClient;
