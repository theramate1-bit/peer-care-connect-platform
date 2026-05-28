import * as React from 'react';
import { Section, Text } from '../primitives';
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
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      {/* 1. Unified cancellation details */}
      <ModernCard
        title={`${data.sessionType || 'Session'} cancelled`}
        badge={data.refundAmount ? `£${data.refundAmount} refund` : undefined}
        accentColor="#8e9b53"
      >
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <Text style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Was scheduled for</Text>
              <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#3c4804' }}>
                {formattedDate} at {formattedTime} with {data.practitionerName || 'N/A'}
              </Text>
            </td>
          </tr>
          {data.cancellationReason && (
            <tr>
              <td style={{ paddingTop: '12px', borderTop: '1px solid #d9e2d2' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</Text>
                <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#3c4804' }}>{data.cancellationReason}</Text>
              </td>
            </tr>
          )}
        </table>
        {data.refundAmount && (
          <Text style={{ margin: '16px 0 0 0', fontSize: '13px', color: '#5a5a5a', lineHeight: '1.5' }}>
            Refund of £{data.refundAmount} will be processed within 5-10 business days.
          </Text>
        )}
      </ModernCard>

      {/* 2. Actions */}
      <Section style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '400px' }}>
          <tr>
            <td style={{ padding: '0 6px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/marketplace`} variant="primary" color="#8e9b53">
                Book Another Session
              </ModernButton>
            </td>
            <td style={{ padding: '0 6px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/help`} variant="secondary" color="#8e9b53">
                Help Center
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernCancellation;
