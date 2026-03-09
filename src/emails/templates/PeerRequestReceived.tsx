import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface PeerRequestReceivedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PeerRequestReceived = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PeerRequestReceivedProps) => {
  return (
    <EmailLayout
      preview={`New Peer Treatment Request from ${data.requesterName || 'A Practitioner'}`}
    >
      <EmailHeader title="New Peer Treatment Request" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          You have received a new peer treatment request from{' '}
          {data.requesterName || 'another practitioner'}.
        </Text>

        <DetailCard title="Request Details" accentColor="#059669">
          <Text className="m-0 mb-2 text-base">
            <strong>From:</strong> {data.requesterName || 'A Practitioner'}
          </Text>
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
          {data.paymentAmount && (
            <Text className="m-0 text-base">
              <strong>Credits:</strong> {data.paymentAmount} credits
            </Text>
          )}
        </DetailCard>

        {data.expiresAt && (
          <InfoBox type="warning" title="⏰ Action Required">
            <Text className="m-0 mb-2" style={{ color: '#92400e' }}>
              This request expires on{' '}
              {new Date(data.expiresAt).toLocaleString()}
            </Text>
            <Text className="m-0" style={{ color: '#92400e' }}>
              Please respond soon to secure this booking.
            </Text>
          </InfoBox>
        )}

        <ButtonGroup>
          {data.acceptUrl && (
            <CTAButton href={data.acceptUrl}>Accept Request</CTAButton>
          )}
          {data.declineUrl && (
            <CTAButton href={data.declineUrl} color="#dc2626">
              Decline Request
            </CTAButton>
          )}
          {data.bookingUrl && (
            <CTAButton href={data.bookingUrl} variant="secondary">
              View Request
            </CTAButton>
          )}
        </ButtonGroup>

        <Text className="text-base mt-6">
          This is a peer treatment exchange request. Accepting will create a
          booking and transfer credits. You can review the full details in your
          dashboard.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PeerRequestReceived;


