/* Glaral license verification (Vercel serverless).
 * POST /api/verify  { "key": "GLRL-XXXX-XXXX-XXXX" }  -> { "valid": true/false }
 * Stateless checksum check (same algorithm as app.js). Upgrade to a KV lookup
 * of webhook-issued keys when you want single-use / revocable licenses.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const k = String((req.body && req.body.key) || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  let valid = false;
  if (/^GLRL[0-9A-Z]{12}$/.test(k)) {
    const body = k.slice(4, 14), chk = k.slice(14);
    let h = 0; const s = body + 'glaral-pro-v1';
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    valid = chk === h.toString(36).toUpperCase().padStart(7, '0').slice(-2);
  }
  return res.status(200).json({ valid });
};
