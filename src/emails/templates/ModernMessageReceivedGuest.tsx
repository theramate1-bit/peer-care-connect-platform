import * as React from 'react';
import { Section, Text } from '../primitives';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { EmailData } from '../utils/types';

interface ModernMessageReceivedGuestProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernMessageReceivedGuest = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernMessageReceivedGuestProps) => {
  const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(recipientEmail || '')}&redirect=${encodeURIComponent(`/messages?conversation=${data.conversationId}`)}`;

  const heroTitle = `You Have a New Message`;
  const heroSubtitle = `${data.practitionerName || 'Your practitioner'} has sent you a message.`;

  return (
    <ModernEmailBase
      preview={`New Message from ${data.practitionerName || 'your practitioner'}`}
      title="New Message - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="New Message"
      primaryColor="#8e9b53"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <ModernButton href={registerUrl} variant="primary" fullWidth>
                Create Account & View Message
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Message Preview" accentColor="#8e9b53">
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <Text style={{ margin: 0, fontSize: '16px', fontStyle: 'italic', color: '#5a5a5a', lineHeight: '1.6' }}>
            "{data.messagePreview || 'You have a new message. Create an account to view and reply.'}"
          </Text>
        </Section>
      </ModernCard>

      <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(142, 155, 83, 0.08)', borderRadius: '16px', border: '1px solid rgba(142, 155, 83, 0.12)' }}>
        <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>🔐 Create Your Account</Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          To view the full message and reply, you'll need to create a free account. It only takes a minute!
        </Text>
        <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          <strong>Why create an account?</strong><br />
          • View and reply to messages from your practitioner<br />
          • Access your session history and booking details<br />
          • Manage your appointments in one place<br />
          • Receive important updates about your sessions
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernMessageReceivedGuest;

