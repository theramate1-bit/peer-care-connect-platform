import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { generateMapsUrl } from '../utils/maps';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPeerBookingConfirmedClientProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerBookingConfirmedClient = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerBookingConfirmedClientProps) => {
  const bookingUrl = data.bookingUrl || `${baseUrl}/credits#peer-treatment`;
  const calendarUrl = data.calendarUrl || '#';

  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const mapsUrl = data.directionsUrl && data.directionsUrl !== '#'
    ? data.directionsUrl
    : data.sessionLocation
    ? generateMapsUrl(data.sessionLocation)
    : '#';

  const heroTitle = `Peer Treatment Booking Confirmed!`;
  const heroSubtitle = `Your peer treatment booking has been confirmed! Here are the details:`;

  return (
    <ModernEmailBase
      preview={`Peer Treatment Booking Confirmed - ${data.sessionType}`}
      title="Peer Treatment Confirmed - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Peer Treatment"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
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

      <ModernCard
        title="Session Details"
        badge={data.paymentAmount ? `${data.paymentAmount} Credits` : undefined}
        accentColor="#8e9b53"
      >
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(142, 155, 83, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>📅</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Date</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>{formattedDate}</Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(142, 155, 83, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>🕐</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Time</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>{formattedTime}</Text>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(142, 155, 83, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>⏱️</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Duration</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>{data.sessionDuration || 60} minutes</Text>
                  </div>
                </div>
              </td>
              <td style={{ paddingBottom: '24px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(142, 155, 83, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px' }}>👤</span>
                  </div>
                  <div>
                    <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Practitioner</Text>
                    <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#3c4804' }}>{data.practitionerName || 'N/A'}</Text>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {data.sessionLocation && (
        <ModernCard title="Location Details" accentColor="#8e9b53">
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
            <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#3c4804' }}>{data.sessionLocation}</Text>
          )}
          {mapsUrl && mapsUrl !== '#' && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px 24px', borderRadius: '8px', border: '1px solid #d9e2d2', color: '#5a5a5a', fontSize: '14px', fontWeight: 700, textDecoration: 'none', backgroundColor: '#ffffff' }}>
              <span style={{ marginRight: '8px' }}>🗺️</span>View on Maps
            </a>
          )}
        </ModernCard>
      )}

      <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(142, 155, 83, 0.08)', borderRadius: '16px', border: '1px solid rgba(142, 155, 83, 0.12)' }}>
        <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#5a5a5a' }}>Credits Used</Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 900, color: '#8e9b53' }}>{data.paymentAmount || 0} credits</Text>
        <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          These credits have been deducted from your account balance.
        </Text>
      </Section>

      <Section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f0f4ef', borderRadius: '8px', borderLeft: '4px solid #8e9b53' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          <strong>Note:</strong> This is a peer treatment exchange. Both parties are practitioners supporting each other in our community.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernPeerBookingConfirmedClient;

