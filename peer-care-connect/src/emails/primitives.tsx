/**
 * Native HTML email primitives - compatible with react-dom SSR.
 * Use these instead of @react-email/components to avoid forwardRef rendering issues.
 */
import * as React from 'react';

interface StyleProps {
  style?: React.CSSProperties;
  [key: string]: unknown;
}

export const Html = ({ children, lang = 'en', ...props }: { children?: React.ReactNode; lang?: string } & StyleProps) => (
  <html lang={lang} {...props}>{children}</html>
);

export const Head = ({ children, ...props }: { children?: React.ReactNode } & StyleProps) => (
  <head {...props}>{children}</head>
);

export const Body = ({ children, style, ...props }: { children?: React.ReactNode; style?: React.CSSProperties } & StyleProps) => (
  <body style={style} {...props}>{children}</body>
);

export const Container = ({ children, style, ...props }: { children?: React.ReactNode; style?: React.CSSProperties } & StyleProps) => (
  <div style={style} {...props}>{children}</div>
);

export const Section = ({ children, style, ...props }: { children?: React.ReactNode; style?: React.CSSProperties } & StyleProps) => (
  <div style={style} {...props}>{children}</div>
);

export const Text = ({
  children,
  style = {},
  ...props
}: { children?: React.ReactNode; style?: React.CSSProperties } & StyleProps) => (
  <p
    style={{
      margin: 0,
      fontSize: 14,
      lineHeight: '20px',
      ...style,
    }}
    {...props}
  >
    {children}
  </p>
);

// React Email-compatible helpers (SSR-safe)
export const Preview = ({ children }: { children?: React.ReactNode }) => (
  <Text
    style={{
      display: 'none',
      fontSize: '1px',
      color: '#ffffff',
      lineHeight: '1px',
      maxHeight: 0,
      maxWidth: 0,
      opacity: 0,
      overflow: 'hidden',
      margin: 0,
    }}
  >
    {children}
  </Text>
);

export const Link = ({
  children,
  href,
  style,
  ...props
}: { children?: React.ReactNode; href: string; style?: React.CSSProperties } & StyleProps) => (
  <a href={href} style={style} {...props}>
    {children}
  </a>
);

export const Hr = ({ style, ...props }: { style?: React.CSSProperties } & StyleProps) => (
  <hr
    style={{
      border: 0,
      borderTop: '1px solid #d0d7de',
      margin: '16px 0',
      ...style,
    }}
    {...props}
  />
);
