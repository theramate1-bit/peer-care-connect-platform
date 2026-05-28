import * as React from 'react';
import { Section, Text } from '../primitives';
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
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary" color="#8e9b53">
                Confirm New Time
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={calendarUrl} variant="secondary" color="#8e9b53">
                Add to Calendar
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Updated Session Details" accentColor="#8e9b53">
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px' }}>
                <Text style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600, fontWeight: 700 }}>Session</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.sessionType || 'N/A'}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '24px', paddingTop: '24px', borderTop: '1px solid #d9e2d2' }}>
                <Text style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600, fontWeight: 700 }}>Original Date & Time</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#5a5a5a' }}>{originalDate} at {originalTime}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '24px', borderTop: '2px solid #8e9b53' }}>
                <Text style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600, fontWeight: 700 }}>New Date & Time</Text>
                <Text style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#8e9b53' }}>{newDate} at {newTime}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '24px', borderTop: '1px solid #d9e2d2' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      <Section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0f4ef', borderRadius: '8px', borderLeft: '4px solid #8e9b53' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          Please make sure to update your calendar with the new time.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernRescheduling;

