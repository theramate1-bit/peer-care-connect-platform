import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPeerBookingCancelledRefundedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerBookingCancelledRefunded = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerBookingCancelledRefundedProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Peer Treatment Cancelled`;
  const heroSubtitle = `Your peer treatment booking has been cancelled. ${data.refundAmount ? `${data.refundAmount} credits have been refunded to your account.` : ''}`;

  return (
    <ModernEmailBase
      preview={`Peer Treatment Cancelled - ${data.refundAmount || 0} Credits Refunded`}
      title="Peer Treatment Cancelled - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Cancelled"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/credits`} variant="primary" color="#8e9b53">
                View Credit Balance
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/credits#peer-treatment`} variant="secondary" color="#8e9b53">
                Book Another Session
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Cancellation Details" accentColor="#8e9b53">
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

      {data.refundAmount && (
        <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(142, 155, 83, 0.08)', borderRadius: '16px', border: '1px solid rgba(142, 155, 83, 0.12)' }}>
          <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5a5a5a', fontWeight: 600 }}>Credits refunded</Text>
          <Text style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 900, color: '#8e9b53' }}>+{data.refundAmount} credits</Text>
          <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
            Use your credits to book another peer treatment session with a practitioner.
          </Text>
        </Section>
      )}
    </ModernEmailBase>
  );
};

export default ModernPeerBookingCancelledRefunded;

