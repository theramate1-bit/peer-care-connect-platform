/**
 * Email Render Service
 * This can be used as a Node.js service to render React Email templates
 * The Deno Edge Function can call this service to render emails
 */

import { render } from '@react-email/render';
import * as React from 'react';
import { EmailData, EmailType } from '../utils/types';
import { renderEmail } from '../render';

export interface RenderEmailRequest {
  emailType: EmailType;
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export interface RenderEmailResponse {
  subject: string;
  html: string;
}

export function renderEmailTemplate(
  request: RenderEmailRequest
): RenderEmailResponse {
  return renderEmail({
    emailType: request.emailType,
    recipientName: request.recipientName,
    recipientEmail: request.recipientEmail,
    data: request.data,
    baseUrl: request.baseUrl,
  });
}


