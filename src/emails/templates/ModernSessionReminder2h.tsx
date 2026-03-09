import * as React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { generateMapsUrl } from '../utils/maps';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernSessionReminder2hProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernSessionReminder2h = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernSessionReminder2hProps) => {
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

  const heroTitle = `Your session starts in 2 hours!`;
  const heroSubtitle = `This is a friendly reminder that your ${data.sessionType || 'session'} starts in 2 hours.`;

  return (
    <ModernEmailBase
      preview="Reminder: Your session starts in 2 hours"
      title="Session Reminder - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="2 Hour Reminder"
      primaryColor="#ea580c"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary" color="#ea580c">
                View Details
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={messageUrl} variant="secondary" color="#ea580c">
                Message Practitioner
              </ModernButton>
            </td>
          </tr>
          {mapsUrl && mapsUrl !== '#' && shouldShowLocation && (
            <tr>
              <td colSpan={2} style={{ padding: '8px 8px 0 8px' }}>
                <ModernButton href={mapsUrl} variant="secondary" color="#ea580c" fullWidth>
                  Get Directions
                </ModernButton>
              </td>
            </tr>
          )}
        </table>
      </Section>

      <ModernCard title="Session Details" accentColor="#ea580c">
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(234, 88, 12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(234, 88, 12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(234, 88, 12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>⏱️</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Duration</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{data.sessionDuration || 60} minutes</Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(234, 88, 12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>👤</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{data.practitionerName || 'N/A'}</Text>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {(shouldShowLocation || isMobileService) && (
        <ModernCard title={isMobileService ? "Service Type" : "Location Details"} accentColor="#ea580c">
          <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{locationDisplayText}</Text>
          {isMobileService ? (
            <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Your practitioner will travel to your location. Please ensure your address is up to date and accessible.
            </Text>
          ) : (
            mapsUrl && mapsUrl !== '#' && (
              <Link href={mapsUrl} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', color: '#475569', fontSize: '14px', fontWeight: 700, textDecoration: 'none', backgroundColor: '#ffffff' }}>
                <span style={{ marginRight: '8px' }}>🗺️</span>View on Maps
              </Link>
            )
          )}
        </ModernCard>
      )}

      <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(234, 88, 12, 0.05)', borderRadius: '16px', border: '1px solid rgba(234, 88, 12, 0.1)' }}>
        <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Preparation Tips</Text>
        <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          • Plan to arrive 5 minutes early<br />
          • Check your route and travel time<br />
          • Wear comfortable clothing<br />
          • Bring any relevant medical information<br />
          • Stay hydrated before your session
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernSessionReminder2h;
