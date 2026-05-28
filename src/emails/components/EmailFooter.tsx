import * as React from 'react';
import { Link, Section, Text } from '../primitives';
import { EMAIL_CONFIG } from '../constants';
import { emailTheme } from '../theme';

export type EmailFooterVariant = 'simple' | 'legal';

interface EmailFooterProps {
  variant?: EmailFooterVariant;
  baseUrl?: string;
  primaryColor?: string;
}

export const EmailFooter = ({
  variant = 'simple',
  baseUrl = 'https://theramate.co.uk',
  primaryColor = emailTheme.brand,
}: EmailFooterProps) => {
  if (variant === 'legal') {
    return (
      <Section style={{ padding: '20px 12px 0 12px' }}>
        <Text style={{ margin: 0, fontSize: '12px', lineHeight: '18px', color: emailTheme.muted }}>
          Questions?{' '}
          <Link href={`mailto:${EMAIL_CONFIG.supportEmail}`} style={{ color: primaryColor, textDecoration: 'none' }}>
            {EMAIL_CONFIG.supportEmail}
          </Link>
        </Text>
        <Text style={{ margin: '8px 0 0 0', fontSize: '12px', lineHeight: '18px', color: emailTheme.muted }}>
          <Link href={`${baseUrl}/help`} style={{ color: primaryColor, textDecoration: 'none' }}>
            Help
          </Link>
          {' · '}
          <Link href={`${baseUrl}/privacy`} style={{ color: primaryColor, textDecoration: 'none' }}>
            Privacy
          </Link>
          {' · '}
          <Link href={`${baseUrl}/unsubscribe`} style={{ color: primaryColor, textDecoration: 'none' }}>
            Unsubscribe
          </Link>
        </Text>
        <Text style={{ margin: '12px 0 0 0', fontSize: '11px', lineHeight: '16px', color: emailTheme.muted }}>
          TheraMate is operated in the United Kingdom. Content in these emails is for information only and is not a substitute
          for professional medical or mental health advice.
        </Text>
      </Section>
    );
  }

  return (
    <Section style={{ padding: '16px 12px 0 12px' }}>
      <Text style={{ margin: 0, fontSize: '12px', lineHeight: '18px', color: emailTheme.muted }}>
        Questions?{' '}
        <Link href={`mailto:${EMAIL_CONFIG.supportEmail}`} style={{ color: primaryColor, textDecoration: 'none' }}>
          {EMAIL_CONFIG.supportEmail}
        </Link>
        .
      </Text>
      <Text style={{ margin: '8px 0 0 0', fontSize: '12px', lineHeight: '18px', color: emailTheme.muted }}>
        <Link href={`${baseUrl}/help`} style={{ color: primaryColor, textDecoration: 'none' }}>
          Help
        </Link>
        {' · '}
        <Link href={`${baseUrl}/privacy`} style={{ color: primaryColor, textDecoration: 'none' }}>
          Privacy
        </Link>
        {' · '}
        <Link href={`${baseUrl}/unsubscribe`} style={{ color: primaryColor, textDecoration: 'none' }}>
          Unsubscribe
        </Link>
      </Text>
    </Section>
  );
};
