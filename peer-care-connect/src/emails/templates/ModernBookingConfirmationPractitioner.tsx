import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { generateMapsUrl } from '../utils/maps';
import { EmailData } from '../utils/types';

interface ModernBookingConfirmationPractitionerProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernBookingConfirmationPractitioner = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernBookingConfirmationPractitionerProps) => {
  const bookingUrl =
    data.bookingUrl ||
    (data.sessionId
      ? `${baseUrl}/practice/sessions/${data.sessionId}`
      : `${baseUrl}/bookings`);
  const messageUrl = data.messageUrl || `${baseUrl}/messages`;

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

  const locationDisplayText = isMobileService
    ? 'Mobile Service - Location to be confirmed with client'
    : data.sessionLocation || 'Location to be confirmed';

  const mapsUrl =
    data.directionsUrl && data.directionsUrl !== '#'
      ? data.directionsUrl
      : data.sessionLocation
        ? generateMapsUrl(data.sessionLocation)
        : '#';

  const heroTitle = `New Booking Received!`;
  const heroSubtitle = `You have a new ${data.sessionType || 'session'} booking with ${data.clientName || 'a client'}.`;

  return (
    <ModernEmailBase
      preview={`New Booking - ${data.sessionType} with ${data.clientName}`}
      title="New Booking - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="New Booking"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      {/* Hero Buttons */}
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={bookingUrl} variant="primary">
                View Session
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={messageUrl} variant="secondary">
                Message Client
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      {/* Main Card */}
      <ModernCard
        title="Session Details"
        badge={data.sessionPrice ? `£${data.sessionPrice}` : undefined}
        accentColor="#8e9b53"
      >
        {/* Client Info */}
        <Section style={{ marginBottom: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#8e9b53',
                    display: 'inline-block',
                    marginRight: '12px',
                    textAlign: 'center',
                    lineHeight: '48px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '18px',
                  }}
                >
                  {(data.clientName || 'C').charAt(0).toUpperCase()}
                  {(data.clientName || 'C').split(' ')[1]?.charAt(0).toUpperCase() || ''}
                </div>
                <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600, fontWeight: 500 }}>
                    Client
                  </Text>
                  <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#3c4804' }}>
                    {data.clientName || 'N/A'}
                  </Text>
                </div>
              </td>
            </tr>
          </table>
        </Section>

        {/* Session Details Grid */}
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(142, 155, 83, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>📅</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>
                      Date
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>
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
                      backgroundColor: 'rgba(142, 155, 83, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🕐</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>
                      Time
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>
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
                      backgroundColor: 'rgba(142, 155, 83, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>⏱️</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>
                      Duration
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>
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
                      backgroundColor: 'rgba(142, 155, 83, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>💬</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>
                      Client Email
                    </Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>
                      {data.clientEmail || 'N/A'}
                    </Text>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {/* Location Card - Show for clinic-based services or if location is available */}
      {(!isMobileService && data.sessionLocation) && (
        <ModernCard
          title="Location Details"
          accentColor="#8e9b53"
        >
          {mapsUrl && mapsUrl !== '#' ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: '#3c4804',
                textDecoration: 'underline',
              }}
            >
              {data.sessionLocation}
            </a>
          ) : (
            <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#3c4804' }}>
              {data.sessionLocation}
            </Text>
          )}
          {mapsUrl && mapsUrl !== '#' && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #d9e2d2',
                color: '#5a5a5a',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <span style={{ marginRight: '8px' }}>🗺️</span>
              View on Maps
            </a>
          )}
        </ModernCard>
      )}

      {/* Payment Status */}
      <Section
        style={{
          backgroundColor: 'rgba(142, 155, 83, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(142, 155, 83, 0.12)',
          marginTop: '24px',
        }}
      >
        <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5a5a5a' }}>
          Payment Status
        </Text>
        <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>
          {data.paymentStatus || 'Pending confirmation'}
        </Text>
      </Section>

      {/* Action Buttons */}
      <Section style={{ textAlign: 'center', marginTop: '32px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', width: '100%', maxWidth: '500px' }}>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <ModernButton href={`${baseUrl}/practice/scheduler`} variant="primary" fullWidth>
                Manage Availability
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernBookingConfirmationPractitioner;
