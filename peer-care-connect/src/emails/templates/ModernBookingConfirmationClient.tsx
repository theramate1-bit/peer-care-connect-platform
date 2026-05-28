import * as React from 'react';
import { Section, Text } from '../primitives';
import { EmailSection, KeyValueGrid, SmallText } from '../components';
import { emailTheme } from '../theme';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { generateCalendarUrl } from '../utils/calendar';
import { generateMapsUrl } from '../utils/maps';
import { formatBookingReference, formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernBookingConfirmationClientProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernBookingConfirmationClient = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernBookingConfirmationClientProps) => {
  const calendarUrl =
    data.calendarUrl ||
    (data.sessionDate && data.sessionTime && data.sessionDuration
      ? generateCalendarUrl(
          `${data.sessionType} with ${data.practitionerName}`,
          `Session: ${data.sessionType}\\nPractitioner: ${data.practitionerName}\\nDuration: ${data.sessionDuration} minutes`,
          data.sessionDate,
          data.sessionTime,
          data.sessionDuration || 60,
          data.sessionLocation
        )
      : '#');

  const bookingReference = formatBookingReference(data.sessionId);

  const bookingUrl = data.sessionId
    ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}${data.sessionType ? `&session_type=${encodeURIComponent(data.sessionType)}` : ''}${data.practitionerName ? `&practitioner_name=${encodeURIComponent(data.practitionerName)}` : ''}${data.sessionDate ? `&session_date=${encodeURIComponent(data.sessionDate)}` : ''}${data.sessionTime ? `&session_time=${encodeURIComponent(data.sessionTime)}` : ''}${data.sessionDuration ? `&duration=${data.sessionDuration}` : ''}${data.sessionPrice ? `&price=${data.sessionPrice}` : ''}${bookingReference ? `&reference=${encodeURIComponent(bookingReference)}` : ''}`
    : data.bookingUrl || `${baseUrl}/client/sessions`;

  const messageUrl = data.messageUrl || `${baseUrl}/messages`;

  const mapsUrl =
    data.directionsUrl && data.directionsUrl !== '#'
      ? data.directionsUrl
      : data.sessionLocation
        ? generateMapsUrl(data.sessionLocation)
        : '#';

  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const isMobileService =
    data.therapistType === 'mobile' || (data.therapistType === 'hybrid' && data.serviceType === 'mobile');

  const shouldShowLocation = !isMobileService && data.sessionLocation;
  const locationDisplayText = isMobileService
    ? 'Mobile Service - Location to be confirmed with practitioner'
    : data.sessionLocation || 'Location to be confirmed';

  const heroTitle = `You're all set, ${recipientName || 'there'}!`;
  const heroSubtitle = `Your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'} has been scheduled. We've sent a calendar invite to your inbox.`;

  const initials = (() => {
    const n = data.practitionerName || 'P';
    const parts = n.trim().split(/\s+/);
    const a = parts[0]?.charAt(0).toUpperCase() || 'P';
    const b = parts.length > 1 ? parts[parts.length - 1]?.charAt(0).toUpperCase() || '' : '';
    return a + b;
  })();

  return (
    <ModernEmailBase
      preview={`Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`}
      title="Booking Confirmed - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Booking Confirmed"
      baseUrl={baseUrl}
    >
      <ModernCard
        title={`${data.sessionType || 'Session'} with ${data.practitionerName || 'your practitioner'}`}
        badge={data.sessionPrice ? `£${data.sessionPrice}` : undefined}
      >
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: '16px', verticalAlign: 'middle' }}>
              <table cellPadding="0" cellSpacing="0" role="presentation">
                <tr>
                  <td style={{ width: '40px', verticalAlign: 'top' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '20px',
                        backgroundColor: emailTheme.surfaceMuted,
                        border: `1px solid ${emailTheme.border}`,
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: emailTheme.ink,
                        lineHeight: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {initials}
                    </div>
                  </td>
                  <td style={{ paddingLeft: '12px', verticalAlign: 'top' }}>
                    <SmallText style={{ margin: '0 0 2px 0', fontWeight: 500 }}>With</SmallText>
                    <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: emailTheme.ink }}>
                      {data.practitionerName || 'N/A'}
                    </Text>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <KeyValueGrid
                items={[
                  { label: 'Date & time', value: `${formattedDate} at ${formattedTime}` },
                  { label: 'Duration', value: `${data.sessionDuration || 60} min` },
                  { label: 'Ref', value: bookingReference },
                ]}
              />
            </td>
          </tr>
          {(shouldShowLocation || isMobileService) && (
            <tr>
              <td style={{ paddingTop: '12px', borderTop: `1px solid ${emailTheme.border}` }}>
                <Text
                  style={{
                    margin: '0 0 4px 0',
                    fontSize: '11px',
                    color: emailTheme.muted,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Location
                </Text>
                {mapsUrl && mapsUrl !== '#' && !isMobileService ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '15px', fontWeight: 600, color: emailTheme.brand, textDecoration: 'none' }}
                  >
                    {locationDisplayText}
                  </a>
                ) : (
                  <Text style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: emailTheme.ink }}>
                    {locationDisplayText}
                  </Text>
                )}
                {isMobileService && (
                  <Text style={{ margin: '4px 0 0 0', fontSize: '13px', color: emailTheme.muted, lineHeight: '1.5' }}>
                    Practitioner will travel to you. Confirm address before session.
                  </Text>
                )}
              </td>
            </tr>
          )}
        </table>
      </ModernCard>

      <Section style={{ textAlign: 'center', marginTop: '16px', marginBottom: '16px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 6px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary">
                View Booking
              </ModernButton>
            </td>
            <td style={{ padding: '0 6px', width: '50%' }}>
              <ModernButton href={calendarUrl} variant="secondary">
                Add to Calendar
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <Section style={{ textAlign: 'center', marginBottom: '16px', padding: '0 24px' }}>
        <ModernButton href={messageUrl} variant="secondary" fullWidth>
          Message Practitioner
        </ModernButton>
      </Section>

      <EmailSection tone="default" style={{ marginTop: '20px' }}>
        <Text style={{ margin: 0, fontSize: '13px', color: emailTheme.muted, lineHeight: '1.5' }}>
          <strong style={{ color: emailTheme.ink }}>Note:</strong> Arrive 5 minutes early. To reschedule or cancel, please do so at least 24 hours in advance.
        </Text>
      </EmailSection>
    </ModernEmailBase>
  );
};

export default ModernBookingConfirmationClient;
