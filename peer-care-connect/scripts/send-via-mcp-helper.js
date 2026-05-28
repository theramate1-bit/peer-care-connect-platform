/**
 * Reads email JSON(s) and writes MCP-ready payload(s).
 * Run: node scripts/send-via-mcp-helper.js [file1] [file2] ...
 * With no args: processes all 20 email types, writing to mcp-payloads/<name>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dir = path.join(__dirname, '../.email-renders');
const outDir = path.join(__dirname, '../mcp-payloads');
const to = 'rayman196823@gmail.com';
const from = 'notifications@theramate.co.uk';

fs.mkdirSync(outDir, { recursive: true });
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter(f => f.endsWith('.json'));

for (const f of files) {
  const name = f.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const payload = { to, from, subject: data.subject, text: `[TheraMate Test] ${data.subject}. Best viewed in HTML.`, html: data.html };
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(payload), { encoding: 'utf8' });
}
console.log(`Wrote ${files.length} payload(s) to mcp-payloads/`);
