import * as React from 'react';
import { Section, Text } from '../primitives';
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
      primaryColor="#8e9b53"
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

      <ModernCard title="Session Details" accentColor="#8e9b53">
        <Section style={{ borderTop: '1px solid #d9e2d2', paddingTop: '32px' }}>
          <table cellPadding="0" cellSpacing="0" width="100%">
            {data.sessionType && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Session Type</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.sessionType}</Text>
                </td>
              </tr>
            )}
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Date</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{formattedDate}</Text>
              </td>
            </tr>
            {data.sessionTime && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Time</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{formattedTime}</Text>
                </td>
              </tr>
            )}
            {data.sessionDuration && (
              <tr>
                <td style={{ paddingBottom: '16px' }}>
                  <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Duration</Text>
                  <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.sessionDuration} minutes</Text>
                </td>
              </tr>
            )}
            <tr>
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#5a5a5a', fontWeight: 600 }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>{data.practitionerName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      <Section style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(142, 155, 83, 0.08)', borderRadius: '16px', border: '1px solid rgba(142, 155, 83, 0.12)' }}>
        <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#3c4804' }}>💬 Share Your Experience</Text>
        <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
          Your feedback helps other clients make informed decisions and helps practitioners improve their services.
        </Text>
        <Text style={{ margin: 0, fontSize: '14px', color: '#5a5a5a', lineHeight: '1.6' }}>
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

