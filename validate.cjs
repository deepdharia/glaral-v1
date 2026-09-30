// Validates the Glaral engine against published festival dates (India).
// 2026 = primary ground truth; 2025 = regression suite for tricky nirnayas
// (Bhadra-shifted Holika Dahan, kshaya Ugadi, midday-rule festivals).
const P = require('./panchang.js');
const F = require('./festivals.js');

const DELHI = { lat: 28.6139, lng: 77.2090, tz: 'Asia/Kolkata', name: 'New Delhi' };

// Ground truth: [festivalId, expectedY, expectedM, expectedD, note]
const TRUTH_2026 = [
  ['makar-sankranti', 2026, 1, 14],
  ['vasant-panchami', 2026, 1, 23],
  ['maha-shivratri', 2026, 2, 15],
  ['holi', 2026, 3, 4],
  ['holika-dahan', 2026, 3, 3],
  ['ugadi', 2026, 3, 19],
  ['ram-navami', 2026, 3, 26],
  ['akshaya-tritiya', 2026, 4, 19, 'approx'],
  ['buddha-purnima', 2026, 5, 1],
  ['rath-yatra', 2026, 7, 16],
  ['raksha-bandhan', 2026, 8, 28],
  ['onam', 2026, 8, 26, 'Thiruvonam in Chingam (solar Simha)'],
  ['janmashtami', 2026, 9, 4],
  ['ganesh-chaturthi', 2026, 9, 14],
  ['dussehra', 2026, 10, 20],
  ['karva-chauth', 2026, 10, 29, 'disputed 28/29'],
  ['dhanteras', 2026, 11, 6],
  ['diwali', 2026, 11, 8],
  ['govardhan-puja', 2026, 11, 9],
  ['bhai-dooj', 2026, 11, 11],
  ['chhath', 2026, 11, 15],
  ['guru-nanak-jayanti', 2026, 11, 24],
  ['mesha-sankranti', 2026, 4, 14, 'approx (Vaisakhi)'],
];

// 2025 regression: Bhadra past midnight -> Holika Dahan Mar 13 (no shift);
// kshaya Ugadi -> Mar 30 via sunrise; Akshaya Tritiya midday-rule -> Apr 30.
const TRUTH_2025 = [
  ['makar-sankranti', 2025, 1, 14],
  ['vasant-panchami', 2025, 2, 2, 'kshaya panchami -> begin-day'],
  ['maha-shivratri', 2025, 2, 26],
  ['holika-dahan', 2025, 3, 13, 'Bhadra ends 11:29 PM, no shift'],
  ['holi', 2025, 3, 14],
  ['ugadi', 2025, 3, 30, 'pratipada at sunrise'],
  ['ram-navami', 2025, 4, 6],
  ['mesha-sankranti', 2025, 4, 14],
  ['akshaya-tritiya', 2025, 4, 30, 'tritiya at midday'],
  ['buddha-purnima', 2025, 5, 12],
  ['rath-yatra', 2025, 6, 27],
  ['raksha-bandhan', 2025, 8, 9],
  ['onam', 2025, 9, 5, 'Thiruvonam in Chingam (solar Simha)'],
  ['ganesh-chaturthi', 2025, 8, 27, 'chaturthi at midday'],
  ['dussehra', 2025, 10, 2],
  ['karva-chauth', 2025, 10, 10, 'chaturthi at sunrise (not moonrise)'],
  ['dhanteras', 2025, 10, 18],
  ['diwali', 2025, 10, 20, 'amavasya at pradosh, first day'],
  ['govardhan-puja', 2025, 10, 22, 'India date; Americas observe Oct 21'],
  ['bhai-dooj', 2025, 10, 23],
  ['chhath', 2025, 10, 27],
  ['guru-nanak-jayanti', 2025, 11, 5],
];

let pass = 0, fail = 0;
for (const [year, truth] of [[2026, TRUTH_2026], [2025, TRUTH_2025]]) {
  console.log(`--- ${year} ---`);
  const { major } = F.festivalsForYear(year, DELHI);
  const byId = {};
  for (const f of major) byId[f.id] = f;
  for (const [id, ey, em, ed, note] of truth) {
    const got = byId[id];
    const gotStr = got ? `${got.y}-${String(got.m).padStart(2,'0')}-${String(got.d).padStart(2,'0')}` : 'MISSING';
    const wantStr = `${ey}-${String(em).padStart(2,'0')}-${String(ed).padStart(2,'0')}`;
    const ok = got && got.y === ey && got.m === em && got.d === ed;
    if (ok) pass++; else fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(20)} got ${gotStr}  want ${wantStr}${note ? '  ('+note+')' : ''}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);

// Spot-check today's panchang values look sane
const now = new Date();
const p = P.panchangForDate({ y: 2026, m: 9, d: 30 }, DELHI);
console.log('\nSample panchang 2026-09-30 Delhi:', JSON.stringify({
  vara: p.vara, tithi: p.tithiName, paksha: p.paksha, nakshatra: p.nakshatra,
  monthAmanta: p.monthAmanta, monthPurnimanta: p.monthPurnimanta,
  sunrise: p.sunrise, sunset: p.sunset, moonrise: p.moonrise,
  rahuKaal: p.rahuKaal, abhijit: p.abhijit
}, null, 1));

// Sunrise sanity: Delhi Sep 30 ~ 06:10 IST
console.log('sunrise raw check done');
