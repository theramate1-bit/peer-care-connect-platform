import { render } from '@react-email/render';
import * as React from 'react';
import { ModernBookingConfirmationClient } from './templates/ModernBookingConfirmationClient';
import { EmailData } from './utils/types';

export function renderModernBookingConfirmation({
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: {
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}): { subject: string; html: string } {
  const subject = `Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`;
  
  const html = render(
    React.createElement(ModernBookingConfirmationClient, {
      recipientName,
      recipientEmail,
      data,
      baseUrl,
    })
  );

  return { subject, html };
}
