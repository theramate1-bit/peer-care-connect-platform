import { Section } from '@react-email/components';
import * as React from 'react';

interface ButtonGroupProps {
  children: React.ReactNode;
}

export const ButtonGroup = ({ children }: ButtonGroupProps) => {
  return (
    <Section className="text-center my-8">
      {children}
    </Section>
  );
};


