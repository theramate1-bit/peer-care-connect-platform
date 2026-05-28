import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { ButtonGroup } from '../components/ButtonGroup';
import { CTAButton } from '../components/CTAButton';
import { DetailCard } from '../components/DetailCard';
import { EmailHeader } from '../components/EmailHeader';
import { EmailLayout } from '../components/EmailLayout';
import { InfoBox } from '../components/InfoBox';
import { EmailData } from '../utils/types';

interface MessageReceivedGuestProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const MessageReceivedGuest = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: MessageReceivedGuestProps) => {
  const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(recipientEmail || '')}&redirect=${encodeURIComponent(`/messages?conversation=${data.conversationId}`)}`;

  return (
    <EmailLayout
      preview={`New Message from ${data.practitionerName || 'your practitioner'}`}
    >
      <EmailHeader title="You Have a New Message" color="#059669" />
      <Section className="bg-bgPrimary rounded-b-xl p-6 shadow-sm">
        <Text className="text-base mb-4 mt-0">Hi {recipientName || 'there'},</Text>
        <Text className="text-base mb-6 mt-0">
          {data.practitionerName || 'Your practitioner'} has sent you a message.
        </Text>

        <DetailCard title="Message Preview" accentColor="#059669">
          <Text className="m-0 italic text-base text-textSecondary leading-relaxed">
            "{data.messagePreview ||
              'You have a new message. Create an account to view and reply.'}"
          </Text>
        </DetailCard>

        <InfoBox type="success" title="🔐 Create Your Account">
          <Text className="m-0" style={{ color: '#166534' }}>
            To view the full message and reply, you'll need to create a free
            account. It only takes a minute!
          </Text>
        </InfoBox>

        <ButtonGroup>
          <CTAButton href={registerUrl}>
            Create Account & View Message
          </CTAButton>
        </ButtonGroup>

        <Text className="text-sm text-textSecondary leading-relaxed my-6 mt-0">
          <strong>Why create an account?</strong>
          <br />• View and reply to messages from your practitioner
          <br />• Access your session history and booking details
          <br />• Manage your appointments in one place
          <br />• Receive important updates about your sessions
        </Text>

        <Text className="mt-6 text-sm text-textSecondary">
          If you have any questions or concerns, please don't hesitate to
          contact us at support@theramate.co.uk
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default MessageReceivedGuest;


