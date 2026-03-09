import * as React from 'react';
import { Section, Text, Link } from '@react-email/components';
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
  // Generate URLs
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

  // Build comprehensive booking URL with all details
  const bookingUrl = data.sessionId
    ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}${data.sessionType ? `&session_type=${encodeURIComponent(data.sessionType)}` : ''}${data.practitionerName ? `&practitioner_name=${encodeURIComponent(data.practitionerName)}` : ''}${data.sessionDate ? `&session_date=${encodeURIComponent(data.sessionDate)}` : ''}${data.sessionTime ? `&session_time=${encodeURIComponent(data.sessionTime)}` : ''}${data.sessionDuration ? `&duration=${data.sessionDuration}` : ''}${data.sessionPrice ? `&price=${data.sessionPrice}` : ''}${bookingReference ? `&reference=${encodeURIComponent(bookingReference)}` : ''}`
    : data.bookingUrl || `${baseUrl}/client/sessions`;

  const messageUrl = data.messageUrl || `${baseUrl}/messages`;

  const mapsUrl = data.directionsUrl && data.directionsUrl !== '#'
    ? data.directionsUrl
    : data.sessionLocation
    ? generateMapsUrl(data.sessionLocation)
    : '#';

  const bookingReference = formatBookingReference(data.sessionId);
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  // Determine if this is a mobile service
  const isMobileService = 
    data.therapistType === 'mobile' || 
    (data.therapistType === 'hybrid' && data.serviceType === 'mobile');

  // Determine location display logic
  const shouldShowLocation = !isMobileService && data.sessionLocation;
  const locationDisplayText = isMobileService 
    ? 'Mobile Service - Location to be confirmed with practitioner'
    : data.sessionLocation || 'Location to be confirmed';

  // Hero content
  const heroTitle = `You're all set, ${recipientName || 'there'}!`;
  const heroSubtitle = `Your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'} has been scheduled. We've sent a calendar invite to your inbox.`;

  return (
    <ModernEmailBase
      preview={`Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`}
      title="Booking Confirmed - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Booking Confirmed"
      primaryColor="#059669"
      baseUrl={baseUrl}
    >
      {/* Hero Buttons */}
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary">
                View Booking
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={calendarUrl} variant="secondary">
                Add to Calendar
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      {/* Main Card */}
      <ModernCard
        title="Session Details"
        badge={data.sessionPrice ? `£${data.sessionPrice}` : undefined}
        accentColor="#059669"
      >
        {/* Practitioner Info */}
        <Section style={{ marginBottom: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#059669',
                          display: 'inline-block',
                          marginRight: '12px',
                          textAlign: 'center',
                          lineHeight: '48px',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '18px',
                        }}
                      >
                        {(data.practitionerName || 'P').charAt(0).toUpperCase()}
                        {(data.practitionerName || 'P').split(' ')[1]?.charAt(0).toUpperCase() || ''}
                      </div>
                <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    Provider
                  </Text>
                  <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {data.practitionerName || 'N/A'}
                  </Text>
                </div>
              </td>
            </tr>
          </table>
        </Section>

        {/* Session Details Grid */}
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(5, 150, 105, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>📅</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                      Date
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                      {formattedDate}
                    </Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(5, 150, 105, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🕐</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                      Time
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                      {formattedTime}
                    </Text>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(5, 150, 105, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>⏱️</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                      Duration
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                      {data.sessionDuration || 60} minutes
                    </Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(5, 150, 105, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🔖</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                      Reference
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                      {bookingReference}
                    </Text>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {/* Location Card - Show for clinic-based services or if location is available */}
      {(shouldShowLocation || isMobileService) && (
        <ModernCard
          title={isMobileService ? "Service Type" : "Location Details"}
          accentColor="#059669"
        >
          <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
            {locationDisplayText}
          </Text>
          {isMobileService ? (
            <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
              Your practitioner will travel to your location. Please ensure your address is up to date and accessible. The practitioner will confirm the exact location details with you before the session.
            </Text>
          ) : (
            mapsUrl && mapsUrl !== '#' && (
              <Link
                href={mapsUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <span style={{ marginRight: '8px' }}>🗺️</span>
                View on Maps
              </Link>
            )
          )}
        </ModernCard>
      )}

      {/* Summary Card */}
      <Section
        style={{
          backgroundColor: 'rgba(5, 150, 105, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(5, 150, 105, 0.1)',
          marginTop: '24px',
        }}
      >
        <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          Summary
        </Text>
        <table cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <Text style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                Treatment Cost
              </Text>
            </td>
            <td style={{ textAlign: 'right', paddingBottom: '12px' }}>
              <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                {data.sessionPrice ? `£${data.sessionPrice}` : 'N/A'}
              </Text>
            </td>
          </tr>
          <tr>
            <td style={{ paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Total Paid
              </Text>
            </td>
            <td style={{ textAlign: 'right', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <Text style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#059669' }}>
                {data.sessionPrice ? `£${data.sessionPrice}` : 'N/A'}
              </Text>
            </td>
          </tr>
        </table>
      </Section>

      {/* Action Buttons */}
      <Section style={{ textAlign: 'center', marginTop: '32px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', width: '100%', maxWidth: '500px' }}>
          <tr>
            <td style={{ paddingBottom: '12px', width: '100%' }}>
              <ModernButton href={messageUrl} variant="primary" fullWidth>
                Message Practitioner
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      {/* Important Note */}
      <Section
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          borderLeft: '4px solid #059669',
        }}
      >
        <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          <strong>Important:</strong> Please arrive 5 minutes early for your session. If you need to reschedule or cancel, please do so at least 24 hours in advance.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernBookingConfirmationClient;
