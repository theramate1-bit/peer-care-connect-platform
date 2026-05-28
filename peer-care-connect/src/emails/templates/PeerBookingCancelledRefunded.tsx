import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface PeerBookingCancelledRefundedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerBookingCancelledRefunded = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerBookingCancelledRefundedProps) => {
  return (
    <EmailLayout
      preview={`Peer Treatment Cancelled - ${data.refundAmount || 0} Credits Refunded`}
    >
      <EmailHeader title="Peer Treatment Cancelled" color="#dc2626" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          A peer treatment booking has been cancelled.{' '}
          {data.cancellationReason && `Reason: ${data.cancellationReason}`}
        </Text>

        <DetailCard title="Cancelled Session" accentColor="#dc2626">
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
          {data.practitionerName && (
            <Text className="m-0 mb-2 text-base">
              <strong>Practitioner:</strong> {data.practitionerName}
            </Text>
          )}
          {data.clientName && (
            <Text className="m-0 text-base">
              <strong>Client:</strong> {data.clientName}
            </Text>
          )}
        </DetailCard>

        <InfoBox type="warning" title="Credit Refund">
          <Text className="m-0 mb-2" style={{ color: '#92400e' }}>
            <strong>Credits Refunded:</strong> {data.refundAmount || 0} credits
          </Text>
          <Text className="m-0" style={{ color: '#92400e' }}>
            These credits have been refunded to your account balance and are
            available for future peer treatment bookings.
          </Text>
        </InfoBox>

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/credits`} color="#dc2626">
            View Credit Balance
          </CTAButton>
          <CTAButton href={`${baseUrl}/credits#peer-treatment`} color="#dc2626">
            Book Another Session
          </CTAButton>
        </ButtonGroup>

        <Text className="text-base mt-6">
          If you'd like to reschedule, you can book a new session with the same
          practitioner or choose a different one.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerBookingCancelledRefunded;


