import * as React from 'react';
import { Link, Section, Text } from '../primitives';
import { emailTheme } from '../theme';

export type EmailHeaderVariant = 'brand' | 'brandNav' | 'minimal';

interface EmailHeaderProps {
  variant?: EmailHeaderVariant;
  baseUrl?: string;
}

export const EmailHeader = ({
  variant = 'brand',
  baseUrl = 'https://theramate.co.uk',
}: EmailHeaderProps) => {
  if (variant === 'minimal') {
    return (
      <Section style={{ padding: '0 12px 8px 12px' }}>
        <Text style={{ margin: 0, fontSize: '12px', lineHeight: '16px', color: emailTheme.muted }}>
          TheraMate notification
        </Text>
      </Section>
    );
  }

  if (variant === 'brandNav') {
    return (
      <Section style={{ padding: '0 12px 16px 12px' }}>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <Text style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: emailTheme.ink, fontWeight: 600 }}>
                TheraMate
              </Text>
            </td>
            <td style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: '12px', lineHeight: '18px' }}>
              <Link href={`${baseUrl}/marketplace`} style={{ color: emailTheme.brand, textDecoration: 'none', marginRight: '12px' }}>
                Therapists
              </Link>
              <Link href={`${baseUrl}/help`} style={{ color: emailTheme.brand, textDecoration: 'none' }}>
                Help
              </Link>
            </td>
          </tr>
        </table>
      </Section>
    );
  }

  return (
    <Section style={{ padding: '0 12px 16px 12px' }}>
      <Text style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: emailTheme.ink, fontWeight: 600 }}>
        TheraMate
      </Text>
    </Section>
  );
};
