import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { generateMapsUrl } from '../utils/maps';
import { EmailData } from '../utils/types';

interface PeerBookingConfirmedPractitionerProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerBookingConfirmedPractitioner = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerBookingConfirmedPractitionerProps) => {
  const bookingUrl =
    data.bookingUrl ||
    (data.sessionId
      ? `${baseUrl}/practice/sessions/${data.sessionId}`
      : `${baseUrl}/bookings`);
  
  // Generate maps URL - use provided directionsUrl or generate from location
  const mapsUrl = data.directionsUrl && data.directionsUrl !== '#'
    ? data.directionsUrl
    : data.sessionLocation
    ? generateMapsUrl(data.sessionLocation)
    : '#';

  return (
    <EmailLayout
      preview={`New Peer Treatment Booking - ${data.sessionType} with ${data.clientName}`}
    >
      <EmailHeader title="New Peer Treatment Booking!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          You have received a new peer treatment booking from another
          practitioner in our community.
        </Text>

        <DetailCard title="Session Details" accentColor="#059669">
          <Text className="m-0 mb-2 text-base">
            <strong>Type:</strong> {data.sessionType}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Date:</strong>{' '}
            {data.sessionDate
              ? new Date(data.sessionDate).toLocaleDateString()
              : 'N/A'}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Time:</strong> {data.sessionTime}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Duration:</strong> {data.sessionDuration} minutes
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Location:</strong>{' '}
            {data.sessionLocation ? (
              mapsUrl && mapsUrl !== '#' ? (
                <Link
                  href={mapsUrl}
                  className="text-primary underline font-semibold"
                  style={{ color: '#059669' }}
                >
                  {data.sessionLocation}
                </Link>
              ) : (
                data.sessionLocation
              )
            ) : (
              'Location to be confirmed'
            )}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Client (Practitioner):</strong> {data.clientName}
          </Text>
          <Text className="m-0 text-base">
            <strong>Client Email:</strong> {data.clientEmail}
          </Text>
        </DetailCard>

        <InfoBox type="success" title="Credit Information">
          <Text className="m-0 mb-2" style={{ color: '#166534' }}>
            <strong>Credits Earned:</strong> {data.paymentAmount || 0} credits
          </Text>
          <Text className="m-0" style={{ color: '#166534' }}>
            These credits have been added to your account balance. You can use
            them to book your own peer treatments!
          </Text>
        </InfoBox>

        <ButtonGroup>
          <CTAButton href={bookingUrl}>View Session</CTAButton>
          <CTAButton href={`${baseUrl}/credits#peer-treatment`}>
            View Credits
          </CTAButton>
        </ButtonGroup>

        {mapsUrl && mapsUrl !== '#' && data.sessionLocation && (
          <ButtonGroup>
            <CTAButton href={mapsUrl} variant="secondary">
              View on Maps
            </CTAButton>
          </ButtonGroup>
        )}

        <Text className="text-base mt-6">
          <strong>Note:</strong> This is a peer treatment exchange. Both parties
          are practitioners supporting each other in our community.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerBookingConfirmedPractitioner;


