import * as React from 'react';
import { Section, Text } from '../primitives';
import { emailTheme } from '../theme';

interface ModernCardProps {
  children: React.ReactNode;
  title?: string;
  imageUrl?: string;
  imageAlt?: string;
  badge?: string;
  accentColor?: string;
}

export const ModernCard = ({ children, title, badge, accentColor = emailTheme.brand }: ModernCardProps) => {
  return (
    <Section
      style={{
        border: `1px solid ${emailTheme.border}`,
        borderLeft: title ? `3px solid ${accentColor}` : `1px solid ${emailTheme.border}`,
        borderRadius: '6px',
        backgroundColor: emailTheme.surface,
        marginBottom: '12px',
      }}
    >
      <Section style={{ padding: '16px' }}>
        {title && (
          <div style={{ marginBottom: '12px' }}>
            <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
              <tr>
                <td>
                  <Text style={{ margin: 0, fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: emailTheme.ink }}>
                    {title}
                  </Text>
                </td>
                {badge && (
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        backgroundColor: emailTheme.surfaceMuted,
                        color: emailTheme.ink,
                        padding: '4px 8px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: `1px solid ${emailTheme.border}`,
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
