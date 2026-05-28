import { Section, Text } from '@react-email/components';
import * as React from 'react';

interface InfoBoxProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
}

const typeConfig = {
  success: {
    bg: '#f0fdf4',
    border: '#059669',
    text: '#166534',
  },
  warning: {
    bg: '#fef3c7',
    border: '#d97706',
    text: '#92400e',
  },
  error: {
    bg: '#fee2e2',
    border: '#dc2626',
    text: '#991b1b',
  },
  info: {
    bg: '#fff7ed',
    border: '#ea580c',
    text: '#9a3412',
  },
};

export const InfoBox = ({
  type = 'info',
  title,
  children,
}: InfoBoxProps) => {
  const config = typeConfig[type];

  return (
    <Section
      className="rounded-lg my-6 p-5"
      style={{
        backgroundColor: config.bg,
        borderLeft: `4px solid ${config.border}`,
      }}
    >
      {title && (
        <Text
          className="m-0 mb-3 text-base font-semibold"
          style={{ color: config.text }}
        >
          {title}
        </Text>
      )}
      <Text
        className="m-0 text-sm leading-relaxed"
        style={{ color: config.text }}
      >
        {children}
      </Text>
    </Section>
  );
};


