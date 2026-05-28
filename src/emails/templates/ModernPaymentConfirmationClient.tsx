import * as React from 'react';
import { Section, Text } from '../primitives';
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
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      {/* 1. Unified payment overview — amount prominent, context inline */}
      <ModernCard
        title={`${data.sessionType || 'Session'} with ${data.practitionerName || 'your practitioner'}`}
        badge={data.paymentAmount ? `£${data.paymentAmount} paid` : undefined}
        accentColor="#8e9b53"
      >
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <Text style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>When</Text>
              <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#3c4804' }}>
                {formattedDate} at {formattedTime}
              </Text>
            </td>
          </tr>
          {data.paymentId && (
            <tr>
              <td style={{ paddingTop: '12px', borderTop: '1px solid #d9e2d2' }}>
                <Text style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 500 }}>Payment ID</Text>
                <Text style={{ margin: 0, fontSize: '13px', color: '#5a5a5a' }}>{data.paymentId}</Text>
              </td>
            </tr>
          )}
        </table>
      </ModernCard>

      {/* 2. Primary action */}
      <Section style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
        <ModernButton href={paymentBookingUrl} variant="primary" fullWidth>
          View Booking
        </ModernButton>
      </Section>

      {/* 3. Info note */}
      <Section style={{ padding: '12px 16px', backgroundColor: '#f0f4ef', borderRadius: '8px', borderLeft: '4px solid #8e9b53' }}>
        <Text style={{ margin: 0, fontSize: '13px', color: '#5a5a5a', lineHeight: '1.5' }}>
          You should also receive a booking confirmation email with full session details.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernPaymentConfirmationClient;
