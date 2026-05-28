/**
 * Proxy for Tawk.to embed script to avoid CSP blocking embed.tawk.to.
 * GET /api/proxy/tawk?widget=68c3439767c586192c674abd/1j4tc020j&disableAnalytics=true&disablePerformanceLogging=true
 */
const TAWK_BASE = 'https://embed.tawk.to';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { widget, ...query } = req.query;
  if (!widget || typeof widget !== 'string') {
    return res.status(400).json({ error: 'Missing widget query parameter' });
  }
  const qs = new URLSearchParams(query).toString();
  const url = qs ? `${TAWK_BASE}/${widget}?${qs}` : `${TAWK_BASE}/${widget}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/javascript' } });
    if (!r.ok) return res.status(r.status).end();
    const body = await r.text();
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(body);
  } catch (e) {
    console.error('[proxy/tawk.js]', e);
    return res.status(502).json({ error: 'Proxy failed' });
  }
}
