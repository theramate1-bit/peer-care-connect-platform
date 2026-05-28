import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface ReviewRequestClientProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ReviewRequestClient = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ReviewRequestClientProps) => {
  return (
    <EmailLayout
      preview={`How was your session with ${data.practitionerName || 'your practitioner'}?`}
    >
      <EmailHeader title="Thank You for Your Session!" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          We hope you enjoyed your {data.sessionType || 'session'} with{' '}
          {data.practitionerName || 'your practitioner'}.
        </Text>

        <DetailCard title="Session Details" accentColor="#059669">
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
          {data.sessionTime && (
            <Text className="m-0 mb-2 text-base">
              <strong>Time:</strong> {data.sessionTime}
            </Text>
          )}
          {data.sessionDuration && (
            <Text className="m-0 mb-2 text-base">
              <strong>Duration:</strong> {data.sessionDuration} minutes
            </Text>
          )}
          <Text className="m-0 text-base">
            <strong>Practitioner:</strong> {data.practitionerName || 'N/A'}
          </Text>
        </DetailCard>

        <InfoBox type="success">
          <Text className="m-0 mb-3 font-semibold text-base" style={{ color: '#166534' }}>
            💬 Share Your Experience
          </Text>
          <Text className="m-0" style={{ color: '#166534' }}>
            Your feedback helps other clients make informed decisions and helps
            practitioners improve their services.
          </Text>
        </InfoBox>

        <ButtonGroup>
          <CTAButton
            href={`${baseUrl}/review?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`}
          >
            Leave a Review
          </CTAButton>
        </ButtonGroup>

        <Text className="text-sm text-textSecondary leading-relaxed my-6 mt-0">
          <strong>Why leave a review?</strong>
          <br />• Help other clients find the right practitioner
          <br />• Support your practitioner's practice
          <br />• Share your experience with the community
        </Text>

        <Text className="mt-6 text-sm text-textSecondary">
          If you have any questions or concerns about your session, please don't
          hesitate to contact us at support@theramate.co.uk
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default ReviewRequestClient;


