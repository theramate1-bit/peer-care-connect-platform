import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface PeerCreditsEarnedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerCreditsEarned = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerCreditsEarnedProps) => {
  return (
    <EmailLayout
      preview={`+${data.paymentAmount || 0} Credits Earned - Peer Treatment`}
    >
      <EmailHeader title="Credits Earned!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          Great news! You've earned credits from a peer treatment session.
        </Text>

        <DetailCard title="Transaction Details" accentColor="#059669">
          <Text className="m-0 mb-2 text-base">
            <strong>Credits Earned:</strong> +{data.paymentAmount || 0} credits
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
          <Text className="m-0 text-base">
            <strong>Client:</strong> {data.clientName}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/credits`}>View Credit Balance</CTAButton>
          <CTAButton href={`${baseUrl}/credits#peer-treatment`}>
            Book Peer Treatment
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          You can use these credits to book your own peer treatment sessions
          with other practitioners!
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerCreditsEarned;


