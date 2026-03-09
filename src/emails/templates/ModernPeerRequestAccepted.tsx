import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPeerRequestAcceptedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerRequestAccepted = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerRequestAcceptedProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Peer Treatment Request Accepted!`;
  const heroSubtitle = `Your peer treatment request has been accepted. Your session is confirmed!`;

  return (
    <ModernEmailBase
      preview={`Peer Treatment Request Accepted - ${data.sessionType || 'Session'}`}
      title="Request Accepted - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Request Accepted"
      primaryColor="#059669"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={data.bookingUrl || `${baseUrl}/credits#peer-treatment`} variant="primary">
                View Booking
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={data.calendarUrl || '#'} variant="secondary">
                Add to Calendar
              </ModernButton>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: '8px 8px 0 8px' }}>
              <ModernButton href={`${baseUrl}/credits#peer-treatment`} variant="secondary" fullWidth>
                View Credits
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Session Details" accentColor="#059669">
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>📅</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Date</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{formattedDate}</Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>🕐</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Time</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{formattedTime}</Text>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>💬</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Session Type</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{data.sessionType || 'N/A'}</Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>👤</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{data.recipientName || 'N/A'}</Text>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>
    </ModernEmailBase>
  );
};

export default ModernPeerRequestAccepted;
