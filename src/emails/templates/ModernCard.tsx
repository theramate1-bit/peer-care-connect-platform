import * as React from 'react';
import { Section, Text } from '@react-email/components';

interface ModernCardProps {
  children: React.ReactNode;
  title?: string;
  imageUrl?: string;
  imageAlt?: string;
  badge?: string;
  accentColor?: string;
}

export const ModernCard = ({
  children,
  title,
  imageUrl,
  imageAlt,
  badge,
  accentColor = '#059669',
}: ModernCardProps) => {
  return (
    <Section
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        marginBottom: '24px',
      }}
    >
      {imageUrl && (
        <div
          style={{
            position: 'relative',
            height: '256px',
            width: '100%',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {badge && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: accentColor,
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
            >
              {badge}
            </div>
          )}
        </div>
      )}
      
      <Section style={{ padding: '32px' }}>
        {title && (
          <div style={{ marginBottom: '24px' }}>
            <table width="100%" cellPadding="0" cellSpacing="0">
              <tr>
                <td>
                  <Text
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: accentColor,
                    }}
                  >
                    {title.split(' - ')[0]}
                  </Text>
                  <Text
                    style={{
                      margin: 0,
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: '1.2',
                    }}
                  >
                    {title.split(' - ')[1] || title}
                  </Text>
                </td>
                {badge && !imageUrl && (
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        backgroundColor: accentColor,
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 700,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {badge}
                    </div>
                  </td>
                )}
              </tr>
            </table>
          </div>
        )}
        
        {children}
      </Section>
    </Section>
  );
};

export default ModernCard;
