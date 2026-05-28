import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface CancellationProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const Cancellation = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: CancellationProps) => {
  return (
    <EmailLayout preview={`Session Cancelled - ${data.sessionType}`}>
      <EmailHeader title="Session Cancelled" color="#dc2626" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          We're sorry to inform you that your session has been cancelled.
        </Text>

        <DetailCard title="Cancellation Details" accentColor="#dc2626">
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
            <strong>Practitioner:</strong> {data.practitionerName}
          </Text>
          {data.cancellationReason && (
            <Text className="m-0 mb-2 text-base">
              <strong>Reason:</strong> {data.cancellationReason}
            </Text>
          )}
          {data.refundAmount && (
            <Text className="m-0 text-base">
              <strong>Refund Amount:</strong> £{data.refundAmount}
            </Text>
          )}
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/marketplace`} color="#dc2626">
            Book Another Session
          </CTAButton>
          <CTAButton href={`${baseUrl}/help`} color="#dc2626" variant="secondary">
            View Help Center
          </CTAButton>
        </ButtonGroup>

        {data.refundAmount && (
          <Text className="text-base mt-6">
            <strong>Refund:</strong> Your refund will be processed within 5-10
            business days.
          </Text>
        )}
      </Section>
    </EmailLayout>
  );
};

export default Cancellation;


