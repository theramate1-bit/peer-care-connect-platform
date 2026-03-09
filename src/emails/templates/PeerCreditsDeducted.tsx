import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface PeerCreditsDeductedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerCreditsDeducted = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerCreditsDeductedProps) => {
  return (
    <EmailLayout
      preview={`${data.paymentAmount || 0} Credits Deducted - Peer Treatment Booking`}
    >
      <EmailHeader title="Credits Deducted" color="#dc2626" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          Credits have been deducted from your account for a peer treatment
          booking.
        </Text>

        <DetailCard title="Transaction Details" accentColor="#dc2626">
          <Text className="m-0 mb-2 text-base">
            <strong>Credits Deducted:</strong> {data.paymentAmount || 0} credits
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
            <strong>Practitioner:</strong> {data.practitionerName}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/credits`} color="#dc2626">
            View Credit Balance
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          You can check your credit balance and transaction history anytime on
          your Credits page.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerCreditsDeducted;


