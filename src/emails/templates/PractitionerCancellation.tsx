import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface PractitionerCancellationProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const PractitionerCancellation = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: PractitionerCancellationProps) => {
  return (
    <EmailLayout
      preview={`Session Cancelled by Practitioner - ${data.sessionType}`}
    >
      <EmailHeader title="Session Cancelled" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          We're sorry to inform you that your practitioner has cancelled your
          session.
        </Text>

        <DetailCard title="Session Details" accentColor="#059669">
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
            <strong>Time:</strong> {data.sessionTime || 'N/A'}
          </Text>
          <Text className="m-0 mb-2 text-base">
            <strong>Practitioner:</strong> {data.practitionerName || 'N/A'}
          </Text>
          {data.cancellationReason && (
            <Text className="m-0 text-base">
              <strong>Reason:</strong> {data.cancellationReason}
            </Text>
          )}
        </DetailCard>

        {data.refundAmount && data.refundAmount > 0 && (
          <InfoBox type="success" title="Refund Information">
            <Text className="m-0 mb-2" style={{ color: '#166534' }}>
              <strong>Refund Amount:</strong> £{data.refundAmount.toFixed(2)}
            </Text>
            <Text className="m-0 mb-2" style={{ color: '#166534' }}>
              <strong>Refund Percentage:</strong> {data.refundPercent || 100}%
            </Text>
            <Text className="m-0" style={{ color: '#166534' }}>
              Your refund will be processed within 5-10 business days. You will
              receive a confirmation email once the refund has been processed.
            </Text>
          </InfoBox>
        )}

        <ButtonGroup>
          <CTAButton href={`${baseUrl}/marketplace`}>Book Another Session</CTAButton>
          {data.sessionId && (
            <CTAButton
              href={`${baseUrl}/booking-success?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`}
            >
              View Booking
            </CTAButton>
          )}
        </ButtonGroup>

        <Text className="text-base mt-6">
          We apologize for any inconvenience this may cause. If you have any
          questions or concerns, please don't hesitate to contact us.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PractitionerCancellation;


