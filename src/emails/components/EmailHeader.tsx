import { Heading, Section } from '@react-email/components';
import * as React from 'react';

interface EmailHeaderProps {
  title: string;
  color?: string;
}

export const EmailHeader = ({
  title,
  color = '#059669',
}: EmailHeaderProps) => {
  return (
    <Section
      className="rounded-t-xl text-center text-white py-8 px-6"
      style={{ backgroundColor: color }}
    >
      <Heading className="m-0 text-2xl font-bold leading-tight">
        {title}
      </Heading>
    </Section>
  );
};


