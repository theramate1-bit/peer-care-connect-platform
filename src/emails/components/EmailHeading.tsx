import * as React from 'react';
import { Text } from '../primitives';
import { emailTheme } from '../theme';

export type EmailHeadingLevel = 'page' | 'section';

interface EmailHeadingProps {
  level?: EmailHeadingLevel;
  children: React.ReactNode;
}

export const EmailHeading = ({ level = 'page', children }: EmailHeadingProps) => {
  if (level === 'section') {
    return (
      <Text style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: emailTheme.ink }}>
        {children}
      </Text>
    );
  }
  return (
    <Text style={{ margin: '0 0 8px 0', fontSize: '20px', lineHeight: '28px', fontWeight: 700, color: emailTheme.ink }}>
      {children}
    </Text>
  );
};
