/* Generate Glaral Pro license keys: node scripts/genkey.js [count] */
function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 10; i++) body += chars[Math.floor(Math.random() * chars.length)];
  let h = 0; const s = body + 'glaral-pro-v1';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const chk = h.toString(36).toUpperCase().padStart(7, '0').slice(-2);
  const full = body + chk;
  return 'GLRL-' + full.slice(0, 4) + '-' + full.slice(4, 8) + '-' + full.slice(8, 12);
}
const n = parseInt(process.argv[2] || '1', 10) || 1;
for (let i = 0; i < Math.min(n, 100); i++) console.log(genKey());
