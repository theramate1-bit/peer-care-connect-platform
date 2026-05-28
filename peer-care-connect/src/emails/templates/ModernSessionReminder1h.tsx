import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { generateMapsUrl } from '../utils/maps';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernSessionReminder1hProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernSessionReminder1h = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernSessionReminder1hProps) => {
  const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
  const messageUrl = data.messageUrl || `${baseUrl}/messages`;

  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const isMobileService =
    data.therapistType === 'mobile' ||
    (data.therapistType === 'hybrid' && data.serviceType === 'mobile');

  const shouldShowLocation = !isMobileService && data.sessionLocation;
  const locationDisplayText = isMobileService
    ? 'Mobile Service - Location to be confirmed with practitioner'
    : data.sessionLocation || 'Location to be confirmed';

  const mapsUrl = data.directionsUrl && data.directionsUrl !== '#'
    ? data.directionsUrl
    : data.sessionLocation
    ? generateMapsUrl(data.sessionLocation)
    : '#';

  const heroTitle = `Your session starts in 1 hour!`;
  const heroSubtitle = `Please make sure you're ready! Your ${data.sessionType || 'session'} starts in 1 hour.`;

  return (
    <ModernEmailBase
      preview="Reminder: Your session starts in 1 hour"
      title="Session Starting Soon - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="1 Hour Reminder"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      {/* 1. Unified session overview */}
      <ModernCard title={`${data.sessionType || 'Session'} — in 1 hour`} accentColor="#8e9b53">
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <Text style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>When</Text>
              <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#3c4804' }}>
                {formattedDate} at {formattedTime} · {data.sessionDuration || 60} min
              </Text>
            </td>
          </tr>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <Text style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>With</Text>
              <Text style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#3c4804' }}>{data.practitionerName || 'N/A'}</Text>
            </td>
          </tr>
          {(shouldShowLocation || isMobileService) && (
            <tr>
              <td style={{ paddingTop: '12px', borderTop: '1px solid #d9e2d2' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#5a5a5a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Where</Text>
                {mapsUrl && mapsUrl !== '#' && !isMobileService ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', fontWeight: 600, color: '#3c4804', textDecoration: 'underline' }}>
                    {locationDisplayText}
                  </a>
                ) : (
                  <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#3c4804' }}>{locationDisplayText}</Text>
                )}
              </td>
            </tr>
          )}
        </table>
      </ModernCard>

      {/* 2. Actions */}
      <Section style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}>
          <tr>
            <td style={{ padding: '0 4px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary" color="#8e9b53">View Details</ModernButton>
            </td>
            <td style={{ padding: '0 4px', width: '50%' }}>
              <ModernButton href={messageUrl} variant="secondary" color="#8e9b53">Message</ModernButton>
            </td>
          </tr>
          {mapsUrl && mapsUrl !== '#' && shouldShowLocation && (
            <tr>
              <td colSpan={2} style={{ padding: '8px 4px 0 4px' }}>
                <ModernButton href={mapsUrl} variant="secondary" color="#8e9b53" fullWidth>Get Directions</ModernButton>
              </td>
            </tr>
          )}
        </table>
      </Section>

      {/* 3. Quick tips */}
      <Section style={{ padding: '12px 16px', backgroundColor: 'rgba(142, 155, 83, 0.08)', borderRadius: '8px', border: '1px solid rgba(142, 155, 83, 0.12)' }}>
        <Text style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: '#3c4804' }}>Almost time</Text>
        <Text style={{ margin: 0, fontSize: '13px', color: '#5a5a5a', lineHeight: '1.5' }}>
          Leave soon to arrive on time · Check traffic · Bring ID if required
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernSessionReminder1h;

