import { Section, Text } from '@react-email/components';
import * as React from 'react';

interface DetailCardProps {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}

export const DetailCard = ({
  title,
  children,
  accentColor = '#059669',
}: DetailCardProps) => {
  return (
    <Section
      className="bg-bgPrimary rounded-lg my-6 p-6 shadow-sm"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <Text className="m-0 mb-4 text-lg font-semibold text-textPrimary">
        {title}
      </Text>
      {children}
    </Section>
  );
};


