import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPractitionerCancellationProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPractitionerCancellation = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPractitionerCancellationProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const bookingUrl = data.sessionId
    ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`
    : `${baseUrl}/client/sessions`;

  const heroTitle = `Session Cancelled by Practitioner`;
  const heroSubtitle = `We're sorry to inform you that your practitioner has cancelled your session.`;

  return (
    <ModernEmailBase
      preview={`Session Cancelled by Practitioner - ${data.sessionType}`}
      title="Session Cancelled - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Cancelled"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: data.sessionId ? '50%' : '100%' }}>
              <ModernButton href={`${baseUrl}/marketplace`} variant="primary" fullWidth={!data.sessionId}>
                Book Another Session
              </ModernButton>
            </td>
            {data.sessionId && (
              <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
                <ModernButton href={bookingUrl} variant="secondary">
                  View Booking
                </ModernButton>
              </td>
            )}
          </tr>
        </table>
      </Section>

      <ModernCard title="Session Details" accentColor="#8e9b53">
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Session</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.sessionType || 'N/A'}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Date</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{formattedDate}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Time</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{formattedTime}</Text>
              </td>
            </tr>
            <tr>
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {data.refundAmount && data.refundAmount > 0 && (
        <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(142, 155, 83, 0.08)', borderRadius: '16px', border: '1px solid rgba(142, 155, 83, 0.12)' }}>
          <Text style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>Refund Information</Text>
          <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#5a5a5a' }}>Refund Amount</Text>
          <Text style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 900, color: '#8e9b53' }}>£{data.refundAmount.toFixed(2)}</Text>
          <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#5a5a5a' }}>Refund Percentage: {data.refundPercent || 100}%</Text>
          <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
            Your refund will be processed within 5-10 business days. You will receive a confirmation email once the refund has been processed.
          </Text>
        </Section>
      )}

      <Section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0f4ef', borderRadius: '8px', borderLeft: '4px solid #8e9b53' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          We apologize for any inconvenience this may cause. If you have any questions or concerns, please don't hesitate to contact us.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernPractitionerCancellation;

