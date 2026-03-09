import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Img } from '@react-email/components';

interface ModernEmailBaseProps {
  children: React.ReactNode;
  preview?: string;
  title?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  heroGradient?: string;
  primaryColor?: string;
  baseUrl?: string;
}

export const ModernEmailBase = ({
  children,
  preview,
      title = 'TheraMate.',
  heroTitle,
  heroSubtitle,
  heroBadge,
  heroGradient = 'from-[#047857] via-[#059669] to-[#10b981]',
  primaryColor = '#059669',
  baseUrl = 'https://theramate.co.uk',
}: ModernEmailBaseProps) => {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <title>{title}</title>
      </Head>
      <Body
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          backgroundColor: '#f6f6f8',
          margin: 0,
          padding: 0,
          color: '#1e293b',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Preview Text */}
          {preview && (
            <Text style={{ display: 'none', fontSize: '1px', color: '#ffffff', lineHeight: '1px', maxHeight: '0px', maxWidth: '0px', opacity: 0, overflow: 'hidden' }}>
              {preview}
            </Text>
          )}

          {/* Header */}
          <Section
            style={{
              padding: '24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            }}
          >
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td>
                  <table cellPadding="0" cellSpacing="0">
                    <tr>
              <td
                style={{
                  verticalAlign: 'middle',
                }}
              >
                <Text
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  TheraMate.
                </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </Section>

          {/* Hero Section */}
          {heroTitle && (
            <Section
              style={{
                background: `linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)`,
                padding: '64px 24px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {/* Dot Pattern Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.2,
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                  backgroundSize: '32px 32px',
                }}
              />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                {heroBadge && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '24px',
                    }}
                  >
                    {heroBadge}
                  </div>
                )}
                
                {heroTitle && (
                  <Text
                    style={{
                      margin: '0 0 24px 0',
                      fontSize: '48px',
                      fontWeight: 900,
                      lineHeight: '1.1',
                      color: '#ffffff',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {heroTitle}
                  </Text>
                )}
                
                {heroSubtitle && (
                  <Text
                    style={{
                      margin: '0 0 40px 0',
                      fontSize: '18px',
                      lineHeight: '1.6',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: 500,
                      maxWidth: '500px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                  >
                    {heroSubtitle}
                  </Text>
                )}
              </div>
            </Section>
          )}

          {/* Main Content */}
          <Section
            style={{
              padding: '48px 24px',
              backgroundColor: '#ffffff',
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section
            style={{
              padding: '48px 24px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
              <td style={{ textAlign: 'center', paddingBottom: '16px' }}>
                <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                  <tr>
                    <td>
                        <Text
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#94a3b8',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          TheraMate.
                        </Text>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center', paddingBottom: '16px' }}>
                  <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
                    <tr>
                      <td style={{ padding: '0 12px' }}>
                        <Link
                          href={`${baseUrl}/privacy`}
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          Privacy Policy
                        </Link>
                      </td>
                      <td style={{ padding: '0 12px' }}>
                        <Link
                          href={`${baseUrl}/terms`}
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          Terms of Service
                        </Link>
                      </td>
                      <td style={{ padding: '0 12px' }}>
                        <Link
                          href={`${baseUrl}/contact`}
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          Contact Us
                        </Link>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center' }}>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#94a3b8',
                    }}
                  >
                    © 2025 TheraMate. All rights reserved.
                  </Text>
                </td>
              </tr>
            </table>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ModernEmailBase;
