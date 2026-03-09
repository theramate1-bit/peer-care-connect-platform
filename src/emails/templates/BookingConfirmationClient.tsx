import { Heading, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { generateCalendarUrl } from '../utils/calendar';
import { generateMapsUrl } from '../utils/maps';
import { formatBookingReference } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface BookingConfirmationClientProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const BookingConfirmationClient = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: BookingConfirmationClientProps) => {
  // Generate calendar URL if not provided
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

  // Use sessionId-based URL for guests, fallback to provided bookingUrl or default
  const bookingUrl = data.sessionId
    ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`
    : data.bookingUrl || `${baseUrl}/client/sessions`;

  const messageUrl = data.messageUrl || `${baseUrl}/messages`;
  
  // Generate maps URL - use provided directionsUrl or generate from location
  const mapsUrl = data.directionsUrl && data.directionsUrl !== '#'
    ? data.directionsUrl
    : data.sessionLocation
    ? generateMapsUrl(data.sessionLocation)
    : '#';

  // Generate practitioner profile URL (use public route for guests)
  const practitionerProfileUrl = data.practitionerId
    ? `${baseUrl}/therapist/${data.practitionerId}/public`
    : null;

  // Format booking reference
  const bookingReference = formatBookingReference(data.sessionId);

  return (
    <EmailLayout 
      preview={`Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`}
      baseUrl={baseUrl}
    >
      <EmailHeader title="Booking Confirmed!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">
          Hi {recipientName || 'there'},
        </Text>
        <Text className="text-base mb-6 mt-0">
          Your booking has been confirmed! We're excited to connect you with
          your practitioner.
        </Text>

        <DetailCard title="Session Details" accentColor="#059669">
          <Text className="m-0 mb-2 text-base">
            <strong>Booking Reference:</strong> {bookingReference}
          </Text>
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
            <strong>Price:</strong> £{data.sessionPrice}
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
          <Text className="m-0 text-base">
            <strong>Practitioner:</strong>{' '}
            {practitionerProfileUrl ? (
              <Link
                href={practitionerProfileUrl}
                className="text-primary underline font-semibold"
                style={{ color: '#059669' }}
              >
                {data.practitionerName}
              </Link>
            ) : (
              data.practitionerName
            )}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={bookingUrl}>View Booking Details</CTAButton>
          <CTAButton href={calendarUrl}>Add to Calendar</CTAButton>
          <CTAButton href={messageUrl}>Message Practitioner</CTAButton>
        </ButtonGroup>

        {mapsUrl && mapsUrl !== '#' && data.sessionLocation && (
          <ButtonGroup>
            <CTAButton href={mapsUrl} variant="secondary">
              View on Maps
            </CTAButton>
          </ButtonGroup>
        )}

        {data.sessionId && (
          <InfoBox type="success">
            <strong>💬 After your session:</strong> Share your experience and
            help other clients by leaving a review.{' '}
            <Link
              href={`${baseUrl}/review?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`}
              className="text-primary underline font-semibold"
            >
              Leave a review
            </Link>
          </InfoBox>
        )}

        <Text className="text-base my-6 mt-0">
          <strong>Important:</strong> Please arrive 5 minutes early for your
          session. If you need to reschedule or cancel, please do so at least
          24 hours in advance.
        </Text>

        {data.cancellationPolicySummary && (
          <InfoBox type="info" title="Cancellation Policy">
            {data.cancellationPolicySummary}
          </InfoBox>
        )}
      </Section>
    </EmailLayout>
  );
};

BookingConfirmationClient.PreviewProps = {
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com',
  data: {
    sessionType: 'Massage Therapy',
    sessionDate: '2025-02-15',
    sessionTime: '14:00',
    sessionDuration: 60,
    sessionPrice: 50,
    sessionLocation: '123 Main St, London',
    practitionerName: 'Jane Smith',
    sessionId: 'test-session-id',
    cancellationPolicySummary: 'Cancellations must be made 24 hours in advance.',
  },
} as BookingConfirmationClientProps;

export default BookingConfirmationClient;


