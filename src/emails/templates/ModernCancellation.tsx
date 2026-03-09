import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernCancellationProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernCancellation = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernCancellationProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Session Cancelled`;
  const heroSubtitle = `We're sorry to inform you that your session has been cancelled.`;

  return (
    <ModernEmailBase
      preview={`Session Cancelled - ${data.sessionType}`}
      title="Session Cancelled - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Cancelled"
      primaryColor="#dc2626"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/marketplace`} variant="primary" color="#dc2626">
                Book Another Session
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/help`} variant="secondary" color="#dc2626">
                View Help Center
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Cancellation Details" accentColor="#dc2626">
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Session</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.sessionType || 'N/A'}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Date</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{formattedDate}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Time</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{formattedTime}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
            {data.cancellationReason && (
              <tr>
                <td>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Reason</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.cancellationReason}</Text>
                </td>
              </tr>
            )}
          </table>
        </Section>
      </ModernCard>

      {data.refundAmount && (
        <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(5, 150, 105, 0.05)', borderRadius: '16px', border: '1px solid rgba(5, 150, 105, 0.1)' }}>
          <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Refund Amount</Text>
          <Text style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 900, color: '#059669' }}>£{data.refundAmount}</Text>
          <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
            Your refund will be processed within 5-10 business days.
          </Text>
        </Section>
      )}
    </ModernEmailBase>
  );
};

export default ModernCancellation;
