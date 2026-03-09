import * as React from 'react';
import { Section, Text, Link } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';

interface WelcomePractitionerProps {
  recipientName?: string;
  recipientEmail?: string;
  baseUrl?: string;
}

export const WelcomePractitioner = ({
  recipientName,
  recipientEmail,
  baseUrl = 'https://theramate.co.uk',
}: WelcomePractitionerProps) => {
  const dashboardUrl = `${baseUrl}/dashboard`;
  const profileUrl = `${baseUrl}/profile`;
  const availabilityUrl = `${baseUrl}/practice/calendar`;

  return (
    <ModernEmailBase
      preview="Welcome to TheraMate. - Your account is ready!"
      title="Welcome to TheraMate."
      heroTitle={`Welcome to TheraMate., ${recipientName || 'there'}!`}
      heroSubtitle="Your account has been created successfully. Let's get you started on your journey to connect with clients."
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
          Thank you for joining TheraMate.! We're excited to have you on board and help you grow your practice.
        </Text>

        {/* Next Steps Card */}
        <ModernCard>
          <Text style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
            Next Steps to Get Started
          </Text>
          
          <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', margin: '0 0 16px 0' }}>
            To start receiving bookings, complete these steps:
          </Text>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 8px 0' }}>
              <strong>1. Complete Your Profile</strong>
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: '0 0 16px 0', paddingLeft: '16px' }}>
              Add your professional information, qualifications, and specializations to help clients find you.
            </Text>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 8px 0' }}>
              <strong>2. Set Your Availability</strong>
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: '0 0 16px 0', paddingLeft: '16px' }}>
              Configure your working hours and availability so clients can book sessions with you.
            </Text>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 8px 0' }}>
              <strong>3. Explore Your Dashboard</strong>
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: '0 0 0 0', paddingLeft: '16px' }}>
              Get familiar with your dashboard to manage bookings, clients, and your practice.
            </Text>
          </div>
        </ModernCard>

        {/* Action Buttons */}
        <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
          <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
            <tr>
              <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
                <ModernButton href={dashboardUrl} variant="primary">
                  Go to Dashboard
                </ModernButton>
              </td>
              <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
                <ModernButton href={profileUrl} variant="secondary">
                  Complete Profile
                </ModernButton>
              </td>
            </tr>
          </table>
        </Section>

        <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 24px 0' }}>
          If you have any questions or need assistance, our support team is here to help. Simply reply to this email or visit our help center.
        </Text>

        <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#1e293b', margin: '0 0 0 0' }}>
          Welcome aboard!<br />
          The TheraMate. Team
        </Text>
      </Section>
    </ModernEmailBase>
  );
};
