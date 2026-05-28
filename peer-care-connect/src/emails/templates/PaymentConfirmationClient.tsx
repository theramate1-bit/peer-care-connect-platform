import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface PaymentConfirmationClientProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PaymentConfirmationClient = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PaymentConfirmationClientProps) => {
  const paymentBookingUrl = data.sessionId
    ? `${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`
    : data.bookingUrl || `${baseUrl}/client/sessions`;

  return (
    <EmailLayout
      preview={`Payment Confirmed - £${data.paymentAmount} for ${data.sessionType}`}
    >
      <EmailHeader title="Payment Confirmed!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          Your payment has been successfully processed. Thank you for your
          booking!
        </Text>

        <DetailCard title="Payment Details" accentColor="#059669">
          <Text className="m-0 mb-2 text-base">
            <strong>Amount:</strong> £{data.paymentAmount}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Session:</strong> {data.sessionType}
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
            <strong>Payment ID:</strong> {data.paymentId}
          </Text>
          {data.sessionLocation && (
            <Text className="m-0 mb-2 text-base">
              <strong>Location:</strong> {data.sessionLocation}
            </Text>
          )}
          <Text className="m-0 text-base">
            <strong>Practitioner:</strong> {data.practitionerName}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={paymentBookingUrl}>View Booking</CTAButton>
        </ButtonGroup>

        <Text className="text-base my-6 mt-0">
          Your session is confirmed and you should receive a separate booking
          confirmation email shortly.
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

export default PaymentConfirmationClient;


