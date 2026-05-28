import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPeerRequestReceivedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerRequestReceived = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerRequestReceivedProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `New Peer Treatment Request`;
  const heroSubtitle = `You have received a new peer treatment request from ${data.requesterName || 'another practitioner'}.`;

  return (
    <ModernEmailBase
      preview={`New Peer Treatment Request from ${data.requesterName || 'A Practitioner'}`}
      title="New Peer Request - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="New Request"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={data.acceptUrl || '#'} variant="primary">
                Accept Request
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={data.declineUrl || '#'} variant="secondary" color="#8e9b53">
                Decline Request
              </ModernButton>
            </td>
          </tr>
          {data.bookingUrl && (
            <tr>
              <td colSpan={2} style={{ padding: '8px 8px 0 8px' }}>
                <ModernButton href={data.bookingUrl} variant="secondary" fullWidth>
                  View Request
                </ModernButton>
              </td>
            </tr>
          )}
        </table>
      </Section>

      <ModernCard title="Request Details" accentColor="#8e9b53">
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>From</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.requesterName || 'A Practitioner'}</Text>
              </td>
            </tr>
            {data.sessionType && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Session Type</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.sessionType}</Text>
                </td>
              </tr>
            )}
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Date</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{formattedDate}</Text>
              </td>
            </tr>
            <tr>
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Time</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{formattedTime}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {data.expiresAt && (
        <Section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0f4ef', borderRadius: '8px', borderLeft: '4px solid #8e9b53' }}>
          <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
            <strong>Expires:</strong> {new Date(data.expiresAt).toLocaleString('en-GB')}
          </Text>
        </Section>
      )}
    </ModernEmailBase>
  );
};

export default ModernPeerRequestReceived;

