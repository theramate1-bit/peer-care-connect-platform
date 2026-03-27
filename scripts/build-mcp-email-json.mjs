#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dumpDir = path.join(root, '.email-dumps');
const outDir = path.join(dumpDir, 'mcp-payloads');
fs.mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(dumpDir, 'manifest.json'), 'utf8'));

for (const e of manifest) {
  const html = fs.readFileSync(path.join(dumpDir, `${e.n}.html`), 'utf8');
  const payload = {
    to: 'theramate1@gmail.com',
    from: 'onboarding@resend.dev',
    subject: e.subject,
    text: `TheraMate transactional: ${e.type}. Full HTML in body.`,
    html,
  };
  fs.writeFileSync(path.join(outDir, `${e.n}.json`), JSON.stringify(payload), 'utf8');
}
console.log('Wrote', manifest.length, 'payloads to', outDir);
