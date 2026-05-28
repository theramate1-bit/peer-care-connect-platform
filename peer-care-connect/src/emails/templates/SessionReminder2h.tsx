import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface SessionReminder2hProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const SessionReminder2h = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: SessionReminder2hProps) => {
  const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
  const messageUrl = data.messageUrl || `${baseUrl}/messages`;

  return (
    <EmailLayout preview="Reminder: Your session starts in 2 hours">
      <EmailHeader title="Session Reminder" color="#ea580c" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">
          Hi {data.clientFirstName || recipientName || 'there'},
        </Text>
        <Text className="text-base mb-6 mt-0">
          This is a friendly reminder that your session starts in 2 hours!
        </Text>

        <DetailCard title="Session Details" accentColor="#ea580c">
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
            <strong>Practitioner:</strong> {data.practitionerName}
          </Text>
          {data.sessionLocation && (
            <Text className="m-0 text-base">
              <strong>Location:</strong> {data.sessionLocation}
            </Text>
          )}
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={bookingUrl} color="#ea580c">
            View Details
          </CTAButton>
          {data.directionsUrl && data.directionsUrl !== '#' && (
            <CTAButton href={data.directionsUrl} color="#ea580c">
              Get Directions
            </CTAButton>
          )}
          <CTAButton href={messageUrl} color="#ea580c">
            Message {data.practitionerFirstName || 'Practitioner'}
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base my-6 mb-3 mt-0">
          <strong>Preparation Tips:</strong>
        </Text>
        <Text className="text-base leading-relaxed my-0 mb-6 pl-6">
          • Plan to arrive 5 minutes early<br />
          • Check your route and travel time<br />
          • Wear comfortable clothing<br />
          • Bring any relevant medical information<br />
          • Stay hydrated before your session
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

export default SessionReminder2h;


