import * as React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';

interface WelcomeClientProps {
  recipientName?: string;
  recipientEmail?: string;
  baseUrl?: string;
}

export const WelcomeClient = ({
  recipientName,
  recipientEmail,
  baseUrl = 'https://theramate.co.uk',
}: WelcomeClientProps) => {
  const marketplaceUrl = `${baseUrl}/marketplace`;
  const dashboardUrl = `${baseUrl}/dashboard`;

  return (
    <ModernEmailBase
      preview="Welcome to TheraMate. - Your account is ready!"
      title="Welcome to TheraMate."
      heroTitle={`Welcome to TheraMate., ${recipientName || 'there'}!`}
      heroSubtitle="Your account has been created successfully. Start your wellness journey by finding the perfect practitioner for you."
      heroBadge="Account Confirmed"
      primaryColor="#059669"
      baseUrl={baseUrl}
    >
      {/* Main Content */}
      <Section style={{ padding: '32px 24px' }}>
        <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 24px 0' }}>
          Hi {recipientName || 'there'},
        </Text>
        
        <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 24px 0' }}>
          Thank you for joining TheraMate.! We're here to help you find the right healthcare professional for your needs.
        </Text>

        {/* Getting Started Card */}
        <ModernCard>
          <Text style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
            How to Get Started
          </Text>
          
          <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', margin: '0 0 16px 0' }}>
            Booking your first session is easy:
          </Text>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 8px 0' }}>
              <strong>1. Browse Practitioners</strong>
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: '0 0 16px 0', paddingLeft: '16px' }}>
              Explore our marketplace to find verified practitioners who match your needs and preferences.
            </Text>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 8px 0' }}>
              <strong>2. Book a Session</strong>
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: '0 0 16px 0', paddingLeft: '16px' }}>
              Choose a date and time that works for you. You can book sessions up to 2 hours in advance.
            </Text>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 8px 0' }}>
              <strong>3. Manage Your Bookings</strong>
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: '0 0 0 0', paddingLeft: '16px' }}>
              View and manage all your upcoming sessions, session history, and messages from your dashboard.
            </Text>
          </div>
        </ModernCard>

        {/* Action Buttons */}
        <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
          <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
            <tr>
              <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
                <ModernButton href={marketplaceUrl} variant="primary">
                  Browse Practitioners
                </ModernButton>
              </td>
              <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
                <ModernButton href={dashboardUrl} variant="secondary">
                  View Dashboard
                </ModernButton>
              </td>
            </tr>
          </table>
        </Section>

        <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 24px 0' }}>
          If you have any questions or need assistance finding the right practitioner, our support team is here to help. Simply reply to this email or visit our help center.
        </Text>

        <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 0 0' }}>
          Welcome aboard!<br />
          The TheraMate. Team
        </Text>
      </Section>
    </ModernEmailBase>
  );
};
