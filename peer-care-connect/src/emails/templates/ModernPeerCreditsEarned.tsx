import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPeerCreditsEarnedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerCreditsEarned = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerCreditsEarnedProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Credits Earned!`;
  const heroSubtitle = `You've earned ${data.paymentAmount || 0} credits for providing a peer treatment session.`;

  return (
    <ModernEmailBase
      preview={`+${data.paymentAmount || 0} Credits Earned - Peer Treatment`}
      title="Credits Earned - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Credits Earned"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/credits`} variant="primary">
                View Credit Balance
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/credits#peer-treatment`} variant="secondary">
                Book Peer Treatment
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard
        title="Transaction Details"
        badge={`+${data.paymentAmount || 0} Credits`}
        accentColor="#8e9b53"
      >
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Credits Earned</Text>
                <Text style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#8e9b53' }}>+{data.paymentAmount || 0} credits</Text>
              </td>
            </tr>
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
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Client</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.clientName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>
    </ModernEmailBase>
  );
};

export default ModernPeerCreditsEarned;

