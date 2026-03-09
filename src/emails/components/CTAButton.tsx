import { Button, Section } from '@react-email/components';
import * as React from 'react';

interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  color?: string;
  variant?: 'primary' | 'secondary';
}

export const CTAButton = ({
  href,
  children,
  color = '#059669',
  variant = 'primary',
}: CTAButtonProps) => {
  const hoverColor =
    color === '#059669'
      ? '#047857'
      : color === '#d97706'
        ? '#b45309'
        : color === '#ea580c'
          ? '#c2410c'
          : color === '#dc2626'
            ? '#b91c1c'
            : color;

  if (variant === 'secondary') {
    return (
      <Button
        href={href}
        className="rounded-lg border-2 font-semibold text-base px-7 py-3.5 mx-1 my-2 text-center no-underline inline-block"
        style={{
          backgroundColor: '#ffffff',
          color: color,
          borderColor: color,
        }}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      href={href}
      className="rounded-lg font-semibold text-base px-7 py-3.5 mx-1 my-2 text-center no-underline inline-block text-white shadow-sm"
      style={{
        backgroundColor: color,
      }}
    >
      {children}
    </Button>
  );
};


