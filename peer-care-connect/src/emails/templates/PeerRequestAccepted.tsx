import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface PeerRequestAcceptedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerRequestAccepted = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerRequestAcceptedProps) => {
  return (
    <EmailLayout
      preview={`Peer Treatment Request Accepted - ${data.sessionType || 'Session'}`}
    >
      <EmailHeader title="Request Accepted! 🎉" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          Great news! {data.practitionerName || 'The practitioner'} has accepted
          your peer treatment request.
        </Text>

        <DetailCard title="Confirmed Session Details" accentColor="#059669">
          {data.sessionType && (
            <Text className="m-0 mb-2 text-base">
              <strong>Session Type:</strong> {data.sessionType}
            </Text>
          )}
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
          <Text className="m-0 text-base">
            <strong>Practitioner:</strong> {data.practitionerName || 'N/A'}
          </Text>
        </DetailCard>

        {data.paymentAmount && (
          <InfoBox type="success" title="Credit Information">
            <Text className="m-0 mb-2" style={{ color: '#166534' }}>
              <strong>Credits Deducted:</strong> {data.paymentAmount} credits
            </Text>
            <Text className="m-0" style={{ color: '#166534' }}>
              Credits have been transferred from your account. Your booking is
              now confirmed!
            </Text>
          </InfoBox>
        )}

        <ButtonGroup>
          {data.bookingUrl && (
            <CTAButton href={data.bookingUrl}>View Booking</CTAButton>
          )}
          {data.calendarUrl && (
            <CTAButton href={data.calendarUrl}>Add to Calendar</CTAButton>
          )}
          <CTAButton href={`${baseUrl}/credits#peer-treatment`}>
            View Credits
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          Your peer treatment session is confirmed. You'll receive a reminder
          email closer to the session date.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerRequestAccepted;


