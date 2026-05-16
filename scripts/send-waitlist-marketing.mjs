/**
 * Send TheraMate pre-launch waitlist email via Resend (batch API, rate-limited).
 *
 * Prerequisites:
 *   - RESEND_API_KEY in env (or load from .env with --dotenv if you use dotenv-cli)
 *   - Verified sender domain in Resend (e.g. connect@theramate.co.uk)
 *
 * Usage:
 *   set RESEND_API_KEY=re_xxx
 *   node scripts/send-waitlist-marketing.mjs path/to/leads.tsv --dry-run
 *   node scripts/send-waitlist-marketing.mjs path/to/leads.tsv --limit 5
 *   node scripts/send-waitlist-marketing.mjs path/to/leads.tsv
 *
 * TSV format: first column business/practice name, second column email (tab or spaces before email).
 * Lines without a valid email are skipped. Duplicate emails are deduped (first wins).
 *
 * Env:
 *   RESEND_FROM=TheraMate <connect@theramate.co.uk>
 *   BATCH_SIZE=100          (max 100 per Resend batch)
 *   DELAY_MS=2000           (pause between batch requests)
 *   WAITLIST_UNSUBSCRIBE=mailto:connect@theramate.co.uk?subject=Unsubscribe
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadResendApiKey() {
  if (process.env.RESEND_API_KEY) return;
  const candidates = [
    path.join(__dirname, 'resend-api-key.local'),
    path.join(os.homedir(), '.resend_api_key'),
    path.join(os.homedir(), '.cursor', 'resend_api_key'),
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const k = fs.readFileSync(p, 'utf8').trim();
      if (k.startsWith('re_')) {
        process.env.RESEND_API_KEY = k;
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

function loadEnvFiles() {
  const dirs = [
    path.join(__dirname, '..'),
    path.join(__dirname, '..', 'peer-care-connect'),
  ];
  for (const dir of dirs) {
    const p = path.join(dir, '.env');
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

const SUBJECT =
  'Private therapy practice in the UK — bookings, notes & payments in one place';

function parseArgs(argv) {
  const args = { file: null, dryRun: false, limit: null, stdinKey: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--stdin-key') args.stdinKey = true;
    else if (a === '--limit' && argv[i + 1]) {
      args.limit = parseInt(argv[++i], 10);
      if (Number.isNaN(args.limit)) args.limit = null;
    } else if (!a.startsWith('-') && !args.file) args.file = a;
  }
  return args;
}

/** @returns {{ name: string, email: string } | null} */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || /^name_for_emails/i.test(trimmed)) return null;
  const m = trimmed.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\s*$/i);
  if (!m) return null;
  const email = m[1].toLowerCase();
  const name = trimmed.slice(0, trimmed.length - m[0].length).trim();
  if (!name) return null;
  return { name, email };
}

function greetingName(businessName) {
  const parts = businessName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'there';
  const skip = new Set(['the', 'a', 'an', 'dr', 'mr', 'mrs', 'ms', 'miss']);
  let w = parts[0].replace(/^[^A-Za-z]+/, '');
  let i = 0;
  while (i < parts.length - 1 && skip.has(w.toLowerCase())) {
    i++;
    w = parts[i].replace(/^[^A-Za-z]+/, '');
  }
  if (!w || w.length > 24) return 'there';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function buildBodies(greeting) {
  const text = `Hey ${greeting},

Do you run a private therapy business in the UK and if so, how are you currently managing bookings, notes, payments, and rehab plans?

A lot of therapists we speak to are juggling multiple tools (or doing things manually), and also relying heavily on word-of-mouth to fill their diary. This makes it harder to stay organised and grow consistently.

We're building TheraMate to solve this by bringing everything into one place:

- Get discovered and booked by new clients through our marketplace
- Built-in payments and diary management
- SOAP notes + optional AI transcription
- Built in rehab exercise prescriptions and progress tracking for clients

Our pre-launch waitlist is now open for practitioners and we want to offer the opportunity to join completely free for the first month — no commitment.

Would you be open to trying it out and giving us some feedback?

We look forward to hearing back from you!

— TheraMate

---
You're receiving this because we believe your practice may benefit from TheraMate. To stop emails from us, reply with "unsubscribe" or email connect@theramate.co.uk.
`.trim();

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,Segoe UI,sans-serif;line-height:1.5;color:#111;">
<p>Hey ${escapeHtml(greeting)},</p>
<p>Do you run a private therapy business in the UK and if so, how are you currently managing bookings, notes, payments, and rehab plans?</p>
<p>A lot of therapists we speak to are juggling multiple tools (or doing things manually), and also relying heavily on word-of-mouth to fill their diary. This makes it harder to stay organised and grow consistently.</p>
<p>We're building <strong>TheraMate</strong> to solve this by bringing everything into one place:</p>
<ul>
<li>Get discovered and booked by new clients through our marketplace</li>
<li>Built-in payments and diary management</li>
<li>SOAP notes + optional AI transcription</li>
<li>Built in rehab exercise prescriptions and progress tracking for clients</li>
</ul>
<p>Our pre-launch waitlist is now open for practitioners and we want to offer the opportunity to join <strong>completely free for the first month</strong> — no commitment.</p>
<p>Would you be open to trying it out and giving us some feedback?</p>
<p>We look forward to hearing back from you!</p>
<p>— TheraMate</p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;" />
<p style="font-size:12px;color:#666;">You're receiving this because we believe your practice may benefit from TheraMate. To stop emails from us, reply with "unsubscribe" or email <a href="mailto:connect@theramate.co.uk">connect@theramate.co.uk</a>.</p>
</body></html>`;

  return { text, html };
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadEnvFiles();
  const { file, dryRun, limit, stdinKey } = parseArgs(process.argv);
  if (stdinKey) {
    const key = fs.readFileSync(0, 'utf8').trim();
    if (key) process.env.RESEND_API_KEY = key;
  }
  loadResendApiKey();
  if (!file) {
    console.error(
      'Usage: node scripts/send-waitlist-marketing.mjs <leads.tsv> [--dry-run] [--limit N]',
    );
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && !dryRun) {
    console.error(
      'Missing RESEND_API_KEY. Set env, add to .env, or create scripts/resend-api-key.local with one line: re_xxx',
    );
    process.exit(1);
  }

  const from =
    process.env.RESEND_FROM || 'connect@theramate.co.uk';
  const batchSize = Math.min(
    100,
    Math.max(1, parseInt(process.env.BATCH_SIZE || '100', 10) || 100),
  );
  const delayMs = parseInt(process.env.DELAY_MS || '2000', 10) || 2000;

  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = fs.readFileSync(abs, 'utf8');
  const lines = raw.split(/\r?\n/);

  /** @type {Map<string, { name: string, email: string }>} */
  const byEmail = new Map();
  for (const line of lines) {
    const row = parseLine(line);
    if (!row) continue;
    if (!byEmail.has(row.email)) byEmail.set(row.email, row);
  }

  let rows = [...byEmail.values()];
  if (limit != null && limit > 0) rows = rows.slice(0, limit);

  console.log(
    `Leads with valid email: ${rows.length} (deduped, ${byEmail.size} unique in file)`,
  );
  if (dryRun) {
    rows.slice(0, 20).forEach((r) =>
      console.log(`  ${r.email}\t${greetingName(r.name)}\t${r.name}`),
    );
    if (rows.length > 20) console.log(`  ... and ${rows.length - 20} more`);
    console.log('\nDry run — no emails sent.');
    return;
  }

  const batches = chunk(rows, batchSize);
  let sent = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const payload = batch.map((r) => {
      const g = greetingName(r.name);
      const { text, html } = buildBodies(g);
      return {
        from,
        to: [r.email],
        subject: SUBJECT,
        text,
        html,
      };
    });

    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = { raw: bodyText };
    }

    if (!res.ok) {
      const isQuota =
        res.status === 429 ||
        data?.name === 'daily_quota_exceeded' ||
        String(data?.message || '')
          .toLowerCase()
          .includes('quota');
      if (isQuota) {
        const start = b * batchSize;
        const remaining = rows.slice(start);
        const remPath = path.join(
          path.dirname(abs),
          'waitlist-leads-remaining.private.tsv',
        );
        const header = 'name_for_emails\temail_1';
        const body = remaining
          .map((r) => `${r.name}\t${r.email}`)
          .join('\n');
        fs.writeFileSync(remPath, `${header}\n${body}`, 'utf8');
        console.error(
          `Batch ${b + 1}/${batches.length}: Resend quota (${res.status}).`,
          data?.message || data,
        );
        console.error(
          `Wrote ${remaining.length} unsent leads to ${remPath} — run again after quota resets or upgrade plan.`,
        );
        process.exit(2);
      }
      console.error(`Batch ${b + 1}/${batches.length} failed:`, res.status, data);
      process.exit(1);
    }

    const ids = data.data?.map((x) => x.id) || [];
    sent += batch.length;
    console.log(
      `Batch ${b + 1}/${batches.length}: sent ${batch.length} (total ${sent}). IDs: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '…' : ''}`,
    );

    if (b < batches.length - 1) {
      console.log(`Waiting ${delayMs}ms before next batch...`);
      await sleep(delayMs);
    }
  }

  console.log(`\nDone. Sent ${sent} emails.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
