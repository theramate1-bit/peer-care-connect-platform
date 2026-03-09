import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernReschedulingProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernRescheduling = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernReschedulingProps) => {
  const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
  const calendarUrl = data.calendarUrl || '#';

  const originalDate = data.originalDate
    ? new Date(data.originalDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const newDate = data.newDate
    ? new Date(data.newDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const originalTime = formatTimeForEmail(data.originalTime);
  const newTime = formatTimeForEmail(data.newTime);

  const heroTitle = `Session Rescheduled`;
  const heroSubtitle = `Your session has been rescheduled. Here are the updated details:`;

  return (
    <ModernEmailBase
      preview="Session Rescheduled - New Date/Time"
      title="Session Rescheduled - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Rescheduled"
      primaryColor="#d97706"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary" color="#d97706">
                Confirm New Time
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={calendarUrl} variant="secondary" color="#d97706">
                Add to Calendar
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Updated Session Details" accentColor="#d97706">
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px' }}>
                <Text style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Session</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.sessionType || 'N/A'}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <Text style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Original Date & Time</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#64748b' }}>{originalDate} at {originalTime}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '24px', borderTop: '2px solid #d97706' }}>
                <Text style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>New Date & Time</Text>
                <Text style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#d97706' }}>{newDate} at {newTime}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      <Section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #d97706' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          Please make sure to update your calendar with the new time.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernRescheduling;
