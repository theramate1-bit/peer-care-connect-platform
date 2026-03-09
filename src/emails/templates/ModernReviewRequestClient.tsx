import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { formatTimeForEmail } from '../utils/formatting';
import { EmailData } from '../utils/types';

interface ModernReviewRequestClientProps {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernReviewRequestClient = ({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernReviewRequestClientProps) => {
  const formattedDate = data.sessionDate
    ? new Date(data.sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';
  const formattedTime = formatTimeForEmail(data.sessionTime);

  const reviewUrl = `${baseUrl}/review?session_id=${data.sessionId}${recipientEmail ? `&email=${encodeURIComponent(recipientEmail)}` : ''}`;

  const heroTitle = `Thank You for Your Session!`;
  const heroSubtitle = `We hope you enjoyed your ${data.sessionType || 'session'} with ${data.practitionerName || 'your practitioner'}.`;

  return (
    <ModernEmailBase
      preview={`How was your session with ${data.practitionerName || 'your practitioner'}?`}
      title="Share Your Experience - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Review Request"
      primaryColor="#059669"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ paddingBottom: '12px' }}>
              <ModernButton href={reviewUrl} variant="primary" fullWidth>
                Leave a Review
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Session Details" accentColor="#059669">
        <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            {data.sessionType && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Session Type</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.sessionType}</Text>
                </td>
              </tr>
            )}
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Date</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{formattedDate}</Text>
              </td>
            </tr>
            {data.sessionTime && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Time</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{formattedTime}</Text>
                </td>
              </tr>
            )}
            {data.sessionDuration && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Duration</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.sessionDuration} minutes</Text>
                </td>
              </tr>
            )}
            <tr>
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(5, 150, 105, 0.05)', borderRadius: '16px', border: '1px solid rgba(5, 150, 105, 0.1)' }}>
        <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>💬 Share Your Experience</Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          Your feedback helps other clients make informed decisions and helps practitioners improve their services.
        </Text>
        <Text style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
          <strong>Why leave a review?</strong><br />
          • Help other clients find the right practitioner<br />
          • Support your practitioner's practice<br />
          • Share your experience with the community
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernReviewRequestClient;
