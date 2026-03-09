import * as React from 'react';
import { Section, Text } from '@react-email/components';
import { ModernEmailBase } from './ModernEmailBase';
import { ModernCard } from './ModernCard';
import { ModernButton } from './ModernButton';
import { EmailData } from '../utils/types';

interface ModernPeerRequestDeclinedProps {
  recipientName?: string;
  data: EmailData;
  baseUrl?: string;
}

export const ModernPeerRequestDeclined = ({
  recipientName,
  data,
  baseUrl = 'https://theramate.co.uk',
}: ModernPeerRequestDeclinedProps) => {
  const heroTitle = `Peer Treatment Request Declined`;
  const heroSubtitle = `Unfortunately, your peer treatment request has been declined. You can find another practitioner or view your credits.`;

  return (
    <ModernEmailBase
      preview="Peer Treatment Request Declined"
      title="Request Declined - TheraMate."
      heroTitle={heroTitle}
      heroSubtitle={heroSubtitle}
      heroBadge="Request Declined"
      primaryColor="#dc2626"
      baseUrl={baseUrl}
    >
      <Section style={{ textAlign: 'center', marginBottom: '48px', padding: '0 24px' }}>
        <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto', maxWidth: '500px' }}>
          <tr>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/credits#peer-treatment`} variant="primary" color="#dc2626">
                Find Another Practitioner
              </ModernButton>
            </td>
            <td style={{ padding: '0 8px 8px 8px', width: '50%' }}>
              <ModernButton href={`${baseUrl}/credits`} variant="secondary" color="#dc2626">
                View Credits
              </ModernButton>
            </td>
          </tr>
        </table>
      </Section>

      <ModernCard title="Request Details" accentColor="#dc2626">
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
              <td>
                <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Practitioner</Text>
                <Text style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{data.recipientName || 'N/A'}</Text>
              </td>
            </tr>
          </table>
        </Section>
      </ModernCard>

      <Section style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          Don't worry! You can find another practitioner who can help you. Your credits remain in your account and are available for use.
        </Text>
      </Section>
    </ModernEmailBase>
  );
};

export default ModernPeerRequestDeclined;
