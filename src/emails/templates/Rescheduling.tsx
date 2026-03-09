import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface ReschedulingProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const Rescheduling = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ReschedulingProps) => {
  const bookingUrl = data.bookingUrl || `${baseUrl}/client/sessions`;
  const calendarUrl = data.calendarUrl || '#';

  return (
    <EmailLayout preview="Session Rescheduled - New Date/Time">
      <EmailHeader title="Session Rescheduled" color="#d97706" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          Your session has been rescheduled. Here are the updated details:
        </Text>

        <DetailCard title="Updated Session Details" accentColor="#d97706">
          <Text className="m-0 mb-2 text-base">
            <strong>Session:</strong> {data.sessionType}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Original Date:</strong>{' '}
            {data.originalDate
              ? new Date(data.originalDate).toLocaleDateString()
              : 'N/A'}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Original Time:</strong> {data.originalTime}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>New Date:</strong>{' '}
            {data.newDate ? new Date(data.newDate).toLocaleDateString() : 'N/A'}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>New Time:</strong> {data.newTime}
          </Text>
          <Text className="m-0 text-base">
            <strong>Practitioner:</strong> {data.practitionerName}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={bookingUrl} color="#d97706">
            Confirm New Time
          </CTAButton>
          <CTAButton href={calendarUrl} color="#d97706">
            Add to Calendar
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          Please make sure to update your calendar with the new time.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default Rescheduling;


