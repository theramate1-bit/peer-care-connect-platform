import * as React from 'react';
import { Link } from '../primitives';
import { emailTheme } from '../theme';

interface CtaLinkProps {
  href: string;
  children: React.ReactNode;
}

/** Text link styled as primary action (not a button) */
export const CtaLink = ({ href, children }: CtaLinkProps) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      fontSize: '14px',
      fontWeight: 600,
      color: emailTheme.brand,
      textDecoration: 'none',
    }}
  >
    {children}
  </Link>
);
