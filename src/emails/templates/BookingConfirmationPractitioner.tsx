import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface BookingConfirmationPractitionerProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const BookingConfirmationPractitioner = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: BookingConfirmationPractitionerProps) => {
  const bookingUrl =
    data.bookingUrl ||
    (data.sessionId
      ? `${baseUrl}/practice/sessions/${data.sessionId}`
      : `${baseUrl}/bookings`);
  const messageUrl = data.messageUrl || `${baseUrl}/messages`;

  return (
    <EmailLayout
      preview={`New Booking - ${data.sessionType} with ${data.clientName}`}
    >
      <EmailHeader title="New Booking Received!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          You have received a new booking! Here are the details:
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
            <strong>Price:</strong> £{data.sessionPrice}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Client:</strong> {data.clientName}
          </Text>
          <Text className="m-0 text-base">
            <strong>Client Email:</strong> {data.clientEmail}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={bookingUrl}>View Session</CTAButton>
          <CTAButton href={messageUrl}>Message Client</CTAButton>
          <CTAButton href={`${baseUrl}/practice/scheduler`}>
            Manage Availability
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          <strong>Payment Status:</strong>{' '}
          {data.paymentStatus || 'Pending confirmation'}
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default BookingConfirmationPractitioner;


