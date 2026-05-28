import * as React from 'react';
import { Section } from '../primitives';
import { emailTheme } from '../theme';

export type EmailSectionTone = 'default' | 'muted' | 'danger';

interface EmailSectionProps {
  tone?: EmailSectionTone;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmailSection = ({ tone = 'default', children, style }: EmailSectionProps) => {
  const base: React.CSSProperties = {
    padding: '16px',
    borderRadius: '6px',
    border: `1px solid ${emailTheme.border}`,
    backgroundColor: emailTheme.surface,
    marginBottom: '12px',
    ...style,
  };
  if (tone === 'muted') {
    base.backgroundColor = emailTheme.surfaceMuted;
  }
  if (tone === 'danger') {
    base.backgroundColor = emailTheme.dangerBg;
    base.border = `1px solid ${emailTheme.dangerBorder}`;
  }
  return <Section style={base}>{children}</Section>;
};
