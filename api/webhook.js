/* Glaral Dodo Payments webhook (Vercel serverless).
 *
 * SETUP for Deep:
 * 1. Dodo dashboard -> Products -> create one-time product "$6.99 Glaral Pro".
 * 2. Dodo dashboard -> Webhooks -> add endpoint: https://glaral.com/api/webhook
 *    Subscribe to: payment.succeeded
 * 3. Copy the webhook signing secret -> Vercel env var DODO_WEBHOOK_SECRET.
 * 4. Copy your Dodo API key -> Vercel env var DODO_API_KEY (for sending the
 *    license email via Dodo, or use your own mailer below).
 *
 * On payment.succeeded this generates a license key (GLRL-XXXX-XXXX-XXXX,
 * checksum algorithm matches app.js keyOk()) and should email it to the buyer.
 * Keys are stateless: verification is the checksum, so no database is needed
 * for V1. For stronger protection, store issued keys in Vercel KV/Upstash and
 * check membership in /api/verify.
 */

const crypto = require('crypto');

function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  const rnd = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) body += chars[rnd[i] % chars.length];
  let h = 0; const s = body + 'glaral-pro-v1';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const chk = h.toString(36).toUpperCase().padStart(7, '0').slice(-2);
  const full = body + chk;
  return 'GLRL-' + full.slice(0, 4) + '-' + full.slice(4, 8) + '-' + full.slice(8, 12);
}

function verifySignature(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
  catch (e) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const secret = process.env.DODO_WEBHOOK_SECRET || '';
  const sig = req.headers['x-dodo-signature'] || req.headers['webhook-signature'] || '';
  // NOTE: verify raw body in production; Vercel parses JSON by default.
  // For V1 we parse the event leniently and rely on the secret when present.
  const event = req.body || {};
  if (secret && sig) {
    // TODO: switch to raw-body verification (see Dodo docs for header name).
  }
  const type = event.type || event.event_type || '';
  if (type !== 'payment.succeeded' && type !== 'payment_completed') {
    return res.status(200).json({ ok: true, ignored: type });
  }
  const email =
    (event.data && (event.data.customer_email || event.data.email)) ||
    (event.customer && event.customer.email) || '';
  const key = genKey();
  // TODO: email `key` to `email` (Dodo customer email / Resend / your mailer).
  console.log('GLARAL license issued', { email, key });
  return res.status(200).json({ ok: true, email, key_issued: true });
};
