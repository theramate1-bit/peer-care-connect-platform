import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview?: string;
  headerColor?: string;
  children: React.ReactNode;
  baseUrl?: string;
}

export const EmailLayout = ({
  preview,
  headerColor = '#059669',
  children,
  baseUrl = 'https://theramate.co.uk',
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: '#059669',
                primaryLight: '#10b981',
                primaryDark: '#047857',
                primaryBg: '#f0fdf4',
                warning: '#d97706',
                warningBg: '#fef3c7',
                urgent: '#ea580c',
                urgentBg: '#fff7ed',
                error: '#dc2626',
                errorBg: '#fee2e2',
                textPrimary: '#111827',
                textSecondary: '#6b7280',
                bgPrimary: '#ffffff',
                bgSecondary: '#f9fafb',
                border: '#e5e7eb',
              },
            },
          },
        }}
      >
        <Body className="bg-bgSecondary font-sans">
          <Container className="mx-auto my-0 max-w-[600px] px-5 py-5">
            {children}
            <Section className="mt-8 pt-8 border-t border-border text-center text-textSecondary text-sm">
              <Text className="m-0 mb-2">
                <strong>TheraMate</strong>
              </Text>
              <Text className="m-0 mb-3">This email was sent by TheraMate</Text>
              <Text className="m-0 mb-2">
                <Link
                  href={`${baseUrl}/help`}
                  className="text-primary no-underline mr-4"
                  style={{ marginRight: '16px' }}
                >
                  Help Center
                </Link>
                <Link
                  href={`${baseUrl}/terms`}
                  className="text-primary no-underline"
                >
                  Terms & Conditions
                </Link>
              </Text>
              <Text className="m-0">
                If you have any questions, please contact us at{' '}
                <Link
                  href="mailto:support@theramate.co.uk"
                  className="text-primary no-underline"
                >
                  support@theramate.co.uk
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};


