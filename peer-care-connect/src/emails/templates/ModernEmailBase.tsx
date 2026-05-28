import * as React from 'react';
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '../primitives';
import { EmailFooter, EmailHeader } from '../components';
import type { EmailFooterVariant, EmailHeaderVariant } from '../components';
import { emailTheme } from '../theme';

interface ModernEmailBaseProps {
  children: React.ReactNode;
  preview?: string;
  title?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  primaryColor?: string;
  baseUrl?: string;
  /** Header layout: brand (default), brandNav, minimal */
  headerVariant?: EmailHeaderVariant;
  /** simple (default) or legal (extra disclaimer) */
  footerVariant?: EmailFooterVariant;
}

export const ModernEmailBase = ({
  children,
  preview,
  title = 'TheraMate.',
  heroTitle,
  heroSubtitle,
  heroBadge,
  primaryColor = emailTheme.brand,
  baseUrl = 'https://theramate.co.uk',
  headerVariant = 'brand',
  footerVariant = 'simple',
}: ModernEmailBaseProps) => {
  const hasHero = Boolean(heroTitle);

  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>{title}</title>
      </Head>
      {preview && <Preview>{preview}</Preview>}
      <Body style={{ margin: 0, backgroundColor: emailTheme.surface }}>
        <Container style={{ width: '600px', maxWidth: '600px', margin: '0 auto', padding: '24px 12px' }}>
          <EmailHeader variant={headerVariant} baseUrl={baseUrl} />

          <Section
            style={{
              border: `1px solid ${emailTheme.border}`,
              borderRadius: '6px',
              padding: '20px 20px 12px 20px',
              backgroundColor: emailTheme.surface,
            }}
          >
            {hasHero && (
              <>
                {heroBadge && (
                  <Text style={{ margin: 0, fontSize: '12px', lineHeight: '16px', color: emailTheme.muted }}>
                    {heroBadge}
                  </Text>
                )}
                <Text
                  style={{
                    margin: heroBadge ? '8px 0 0 0' : 0,
                    fontSize: '20px',
                    lineHeight: '28px',
                    color: emailTheme.ink,
                    fontWeight: 700,
                  }}
                >
                  {heroTitle}
                </Text>
                {heroSubtitle && (
                  <Text style={{ margin: '6px 0 0 0', fontSize: '14px', lineHeight: '20px', color: emailTheme.muted }}>
                    {heroSubtitle}
                  </Text>
                )}
                <Hr style={{ borderColor: emailTheme.border, margin: '16px 0 0 0' }} />
              </>
            )}

            <Section style={{ paddingTop: hasHero ? '16px' : '0' }}>{children}</Section>
          </Section>

          <EmailFooter variant={footerVariant} baseUrl={baseUrl} primaryColor={primaryColor} />
        </Container>
      </Body>
    </Html>
  );
};

export default ModernEmailBase;
