/**
 * Sends all transactional preview emails from .email-dumps/mcp-payloads/{1..21}.json
 * via Resend API. Requires RESEND_API_KEY in the environment.
 *
 * Usage: RESEND_API_KEY=re_... node scripts/send-all-email-previews.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, '.email-dumps', 'mcp-payloads');

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error('RESEND_API_KEY is required');
  process.exit(1);
}

const delayMs = Number(process.env.SEND_DELAY_MS || 650);

for (let i = 1; i <= 21; i++) {
  const fp = path.join(dir, `${i}.json`);
  if (!fs.existsSync(fp)) {
    console.error(`Missing ${fp}`);
    process.exit(1);
  }
  const body = fs.readFileSync(fp, 'utf8');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${i}/21 failed`, res.status, text);
    process.exit(1);
  }
  let id = text;
  try {
    id = JSON.parse(text).id || text;
  } catch {
    /* ok */
  }
  console.log(`${i}/21 OK`, id);
  if (i < 21) await new Promise((r) => setTimeout(r, delayMs));
}

console.log('Done: 21 emails to recipient in payloads.');
