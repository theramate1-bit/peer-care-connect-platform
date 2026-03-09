import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { EmailData } from '../utils/types';

interface PaymentReceivedPractitionerProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PaymentReceivedPractitioner = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PaymentReceivedPractitionerProps) => {
  return (
    <EmailLayout
      preview={`Payment Received - £${data.practitionerAmount} from ${data.clientName}`}
    >
      <EmailHeader title="Payment Received!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          You have received a payment for your session. Here are the details:
        </Text>

        <DetailCard title="Payment Breakdown" accentColor="#059669">
          <Text className="m-0 mb-2 text-base">
            <strong>Total Session Price:</strong> £{data.paymentAmount}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Platform Fee (0.5%):</strong> £{data.platformFee}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Your Earnings:</strong> £{data.practitionerAmount}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Client:</strong> {data.clientName}
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
          <Text className="m-0 text-base">
            <strong>Payment ID:</strong> {data.paymentId}
          </Text>
        </DetailCard>

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/payments`}>View Transaction</CTAButton>
          <CTAButton href={`${baseUrl}/settings/payouts`}>
            Manage Payouts
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          <strong>Payout Schedule:</strong> Funds will be transferred to your
          bank account within 2-7 business days.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PaymentReceivedPractitioner;


