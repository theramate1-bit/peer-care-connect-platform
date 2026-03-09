import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernPaymentReceivedPractitionerProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPaymentReceivedPractitioner = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPaymentReceivedPractitionerProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const heroTitle = `Payment Received!`;
  const heroSubtitle = `You have received £${data.practitionerAmount || 0} for your session with ${data.clientName || 'a client'}.`;

  return (
    <ModernEmailBase
      preview={`Payment Received - £${data.practitionerAmount} from ${data.clientName}`}
      title="Payment Received - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Payment Received"
      primaryColor="#059669"
      baseUrl={baseUrl}
    >
      {/* Hero Buttons */}
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/payments`} variant="primary">
                View Transaction
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/settings/payouts`} variant="secondary">
                Manage Payouts
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      {/* Payment Breakdown Card */}
      <ModernCard
        title="Payment Breakdown"
        accentColor="#059669"
      >
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Total Session Price
                </Text>
                <Text style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  £{data.paymentAmount || 0}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Platform Fee (0.5%)
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#64748b' }}>
                  £{data.platformFee || 0}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '16px', borderTop: '2px solid #059669' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Your Earnings
                </Text>
                <Text style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#059669' }}>
                  £{data.practitionerAmount || 0}
                </Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {/* Session Details Card */}
      <ModernCard
        title="Session Details"
        accentColor="#059669"
      >
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            <tr>
              <td style={{ paddingBottom: '12px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Client
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {data.clientName || 'N/A'}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '12px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Session Type
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {data.sessionType || 'N/A'}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '12px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Date
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {formattedDate}
                </Text>
              </td>
            </tr>
            <tr>
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  Payment ID
                </Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  {data.paymentId || 'N/A'}
                </Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      {/* Payout Info */}
      <Section
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          borderLeft: '4px solid #059669',
        }}
      >
        <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          <strong>Payout Schedule:</strong> Funds will be transferred to your bank account within 2-7 business days.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernPaymentReceivedPractitioner;
