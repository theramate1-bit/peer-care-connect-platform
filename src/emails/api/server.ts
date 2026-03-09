/**
 * Email Render Service - Node.js Express Server
 * This service renders React Email templates to HTML
 * The Deno Edge Function calls this service to get rendered HTML
 * 
 * Run: npm run email:server
 * or: node src/emails/api/server.js (after building)
 */

import express from 'express';
import { renderEmailTemplate } from './render-service';

const app = express();
const PORT = process.env.EMAIL_RENDER_PORT || 3001;

app.use(express.json());

app.post('/render', async (req, res) => {
  try {
    const { emailType, recipientName, recipientEmail, data, baseUrl } = req.body;

    if (!emailType || !data) {
      return res.status(400).json({
        error: 'Missing required fields: emailType, data',
      });
    }

    const result = renderEmailTemplate({
      emailType,
      recipientName,
      recipientEmail,
      data,
      baseUrl,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Email render error:', error);
    res.status(500).json({
      error: 'Failed to render email',
      details: error.message,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-render' });
});

app.listen(PORT, () => {
  console.log(`📧 Email Render Service running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Render endpoint: http://localhost:${PORT}/render`);
});


