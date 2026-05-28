import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface PeerRequestDeclinedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerRequestDeclined = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerRequestDeclinedProps) => {
  return (
    <EmailLayout preview="Peer Treatment Request Declined">
      <EmailHeader title="Request Declined" color="#dc2626" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          We're sorry to inform you that {data.practitionerName || 'the practitioner'}{' '}
          has declined your peer treatment request.
        </Text>

        <DetailCard title="Requested Session" accentColor="#dc2626">
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

        <Text className="text-base my-6 mt-0">
          Your credits have not been deducted. You can book another session with
          a different practitioner or try again later.
        </Text>

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/credits#peer-treatment`} color="#dc2626">
            Find Another Practitioner
          </CTAButton>
          <CTAButton href={`${baseUrl}/credits`} color="#dc2626" variant="secondary">
            View Credits
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          Don't worry - there are many other practitioners available for peer
          treatment exchanges. Keep exploring!
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerRequestDeclined;


