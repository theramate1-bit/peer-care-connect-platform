import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPeerCreditsDeductedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerCreditsDeducted = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerCreditsDeductedProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Credits Deducted`;
  const heroSubtitle = `Credits have been deducted from your account for a peer treatment booking.`;

  return (
    <ModernEmailBase
      preview={`${data.paymentAmount || 0} Credits Deducted - Peer Treatment Booking`}
      title="Credits Deducted - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Credits Deducted"
      primaryColor="#dc2626"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <ModernButton href={`${baseUrl}/credits`} variant="primary" color="#dc2626" fullWidth>
                View Credit Balance
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard
        title="Transaction Details"
        badge={`-${data.paymentAmount || 0} Credits`}
        accentColor="#dc2626"
      >
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Credits Deducted</Text>
                <Text style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#dc2626' }}>{data.paymentAmount || 0} credits</Text>
              </td>
            </tr>
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
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>
    </ModernEmailBase>
  );
};

export default ModernPeerCreditsDeducted;
