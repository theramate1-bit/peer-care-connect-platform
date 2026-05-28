import * as React from 'react';
import { Text } from '../primitives';
import { emailTheme } from '../theme';

interface SmallTextProps {
  children: React.ReactNode;
  muted?: boolean;
  style?: React.CSSProperties;
}

export const SmallText = ({ children, muted = true, style }: SmallTextProps) => (
  <Text style={{ margin: 0, fontSize: '12px', lineHeight: '18px', color: muted ? emailTheme.muted : emailTheme.ink, ...style }}>
    {children}
  </Text>
);
