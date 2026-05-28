/**
 * Proxy for Stripe Connect.js to avoid CSP blocking connect-js.stripe.com.
 * Serves https://connect-js.stripe.com/v1.0/connect.js from same origin.
 */
const STRIPE_CONNECT_JS = 'https://connect-js.stripe.com/v1.0/connect.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const r = await fetch(STRIPE_CONNECT_JS, {
      headers: { 'Accept': 'application/javascript' },
    });
    if (!r.ok) {
      return res.status(r.status).end();
    }
    const body = await r.text();
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(body);
  } catch (e) {
    console.error('[proxy/connect.js]', e);
    return res.status(502).json({ error: 'Proxy failed' });
  }
}
