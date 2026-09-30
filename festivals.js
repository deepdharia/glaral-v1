/* ============================================================
   Glaral festival engine
   Rule-based festival determination from first principles.
   Tithi-based rules are ayanamsa-independent (they use the
   tropical Moon-Sun elongation); solar (sankranti) and
   nakshatra rules use the sidereal sun (Lahiri).
   Triggers: sunrise (udaya tithi), sunset (pradosh),
             midnight (nishita), moonrise (e.g. Karva Chauth).
   ============================================================ */
'use strict';

let P;
if (typeof require !== 'undefined') P = require('./panchang.js');
else P = window.GlaralPanchang;

/* rashi indices: 0 Mesha .. 11 Meena */
const FESTIVALS = [
  // ---- solar ----
  { id: 'makar-sankranti', name: 'Makar Sankranti', type: 'sankranti', rashi: 9,
    blurb: 'Sun enters Capricorn — harvest festival' },
  { id: 'pongal', name: 'Pongal', type: 'sankranti', rashi: 9,
    blurb: 'Tamil harvest festival' },
  { id: 'mesha-sankranti', name: 'Mesha Sankranti', type: 'sankranti', rashi: 0,
    blurb: 'Tamil New Year — Sun enters Aries' },
  { id: 'vaisakhi', name: 'Vaisakhi', type: 'sankranti', rashi: 0,
    blurb: 'Punjabi New Year & harvest festival' },

  // ---- tithi: tithi number 1..30, rashi = sidereal sun rashi list ----
  { id: 'vasant-panchami', name: 'Vasant Panchami', type: 'tithi', tithi: 5, month: [10], trigger: 'sunrise', kshayaFallback: true,
    blurb: 'Saraswati Puja — first day of spring' },
  { id: 'maha-shivratri', name: 'Maha Shivratri', type: 'tithi', tithi: 29, month: [10], trigger: 'midnight',
    blurb: 'Great night of Shiva' },
  { id: 'holika-dahan', name: 'Holika Dahan', type: 'tithi', tithi: 15, month: [11], trigger: 'sunset', keepFirst: true,
    blurb: 'Bonfire night before Holi' },
  { id: 'ugadi', name: 'Ugadi / Gudi Padwa', type: 'tithi', tithi: 1, month: [0], trigger: 'sunrise',
    blurb: 'Lunar New Year (Deccan & Maharashtra)', kshayaFallback: true },
  { id: 'ram-navami', name: 'Ram Navami', type: 'tithi', tithi: 9, month: [0], trigger: 'tithibegins',
    blurb: 'Birth of Lord Rama' },
  { id: 'hanuman-jayanti', name: 'Hanuman Jayanti', type: 'tithi', tithi: 15, month: [0], trigger: 'sunrise',
    blurb: 'Birth of Lord Hanuman' },
  { id: 'akshaya-tritiya', name: 'Akshaya Tritiya', type: 'tithi', tithi: 3, month: [1], trigger: 'midday',
    blurb: 'Auspicious day for new beginnings' },
  { id: 'buddha-purnima', name: 'Buddha Purnima', type: 'tithi', tithi: 15, month: [1], trigger: 'sunrise',
    blurb: 'Birth, enlightenment & nirvana of the Buddha' },
  { id: 'guru-purnima', name: 'Guru Purnima', type: 'tithi', tithi: 15, month: [3], trigger: 'sunrise',
    blurb: 'Honouring teachers & gurus' },
  { id: 'rath-yatra', name: 'Rath Yatra', type: 'tithi', tithi: 2, month: [3], trigger: 'sunrise',
    blurb: 'Chariot festival of Lord Jagannath' },
  { id: 'raksha-bandhan', name: 'Raksha Bandhan', type: 'tithi', tithi: 15, month: [4], trigger: 'sunrise',
    blurb: 'Bond of siblings' },
  { id: 'janmashtami', name: 'Krishna Janmashtami', type: 'tithi', tithi: 23, month: [4], trigger: 'midnight',
    blurb: 'Birth of Lord Krishna' },
  { id: 'ganesh-chaturthi', name: 'Ganesh Chaturthi', type: 'tithi', tithi: 4, month: [5], trigger: 'midday',
    blurb: 'Birth of Lord Ganesha' },
  { id: 'navratri-start', name: 'Sharadiya Navratri begins', type: 'tithi', tithi: 1, month: [6], trigger: 'sunrise',
    blurb: 'Nine nights of the Goddess' },
  { id: 'dussehra', name: 'Dussehra / Vijayadashami', type: 'tithi', tithi: 10, month: [6], trigger: 'tithibegins',
    blurb: 'Victory of good over evil' },
  { id: 'karva-chauth', name: 'Karva Chauth', type: 'tithi', tithi: 19, month: [6], trigger: 'sunrise',
    blurb: 'Fast for the longevity of husbands' },
  { id: 'dhanteras', name: 'Dhanteras', type: 'tithi', tithi: 28, month: [6], trigger: 'sunset',
    blurb: 'Festival of wealth — Diwali begins' },
  { id: 'narak-chaturdashi', name: 'Narak Chaturdashi', type: 'tithi', tithi: 29, month: [6], trigger: 'sunrise',
    blurb: 'Chhoti Diwali' },
  { id: 'diwali', name: 'Diwali / Deepavali', type: 'tithi', tithi: 30, month: [6], trigger: 'sunset', keepFirst: true,
    blurb: 'Festival of lights — Lakshmi Puja' },
  { id: 'govardhan-puja', name: 'Govardhan Puja', type: 'tithi', tithi: 1, month: [7], trigger: 'tithibegins',
    blurb: 'Annakut — day after Diwali' },
  { id: 'bhai-dooj', name: 'Bhai Dooj', type: 'tithi', tithi: 2, month: [7], trigger: 'sunrise',
    blurb: 'Brothers & sisters' },
  { id: 'chhath', name: 'Chhath Puja', type: 'tithi', tithi: 6, month: [7], trigger: 'sunrise', keepFirst: true,
    blurb: 'Worship of the Sun God' },
  { id: 'guru-nanak-jayanti', name: 'Guru Nanak Jayanti', type: 'tithi', tithi: 15, month: [7], trigger: 'sunrise',
    blurb: 'Birth of Guru Nanak Dev Ji' },

  // ---- nakshatra ----
  { id: 'onam', name: 'Onam / Thiruvonam', type: 'nakshatra', nakshatra: 21, solarMonth: [4], trigger: 'sunrise',
    blurb: 'Kerala harvest festival' },

  // ---- monthly observances ----
  { id: 'ekadashi', name: 'Ekadashi', type: 'tithi', tithi: [11, 26], month: 'any', trigger: 'sunrise', monthly: true,
    blurb: 'Fasting day' },
  { id: 'purnima', name: 'Purnima', type: 'tithi', tithi: [15], month: 'any', trigger: 'sunrise', monthly: true,
    blurb: 'Full moon — Satyanarayan vrat' },
  { id: 'amavasya', name: 'Amavasya', type: 'tithi', tithi: [30], month: 'any', trigger: 'sunrise', monthly: true,
    blurb: 'New moon' },
  { id: 'pradosh', name: 'Pradosh Vrat', type: 'tithi', tithi: [13, 28], month: 'any', trigger: 'sunset', monthly: true,
    blurb: 'Evening fast for Shiva' },
  { id: 'sankashti', name: 'Sankashti Chaturthi', type: 'tithi', tithi: [19], month: 'any', trigger: 'moonrise', monthly: true,
    blurb: 'Monthly Ganesha fast' },
  { id: 'durgashtami', name: 'Durgashtami', type: 'tithi', tithi: [8], month: 'any', trigger: 'sunrise', monthly: true,
    blurb: 'Monthly Durga observance' },
];

function tithiList(rule) {
  return Array.isArray(rule.tithi) ? rule.tithi : [rule.tithi];
}

/* Scan one year; returns major festivals + monthly observances.
   loc = {lat, lng, tz} */
function festivalsForYear(year, loc, opts) {
  opts = opts || {};
  const major = [];
  const monthly = [];
  const seen = new Set();

  function add(rule, date) {
    const key = rule.id + '|' + date.y + '-' + date.m + '-' + date.d;
    if (seen.has(key)) return;
    seen.add(key);
    const rec = { id: rule.id, name: rule.name, blurb: rule.blurb || '',
                  y: date.y, m: date.m, d: date.d };
    (rule.monthly ? monthly : major).push(rec);
    return rec;
  }

  // --- sankranti festivals: find crossing JD, convert to civil date in tz ---
  const jan1jd = P.julianDay(year, 1, 1, 0);
  for (const rule of FESTIVALS) {
    if (rule.type !== 'sankranti') continue;
    const jd = P.sankrantiJD(jan1jd - 30, rule.rashi);
    if (jd == null) continue;
    const civil = P.civilDateInTz(jd, loc.tz);
    if (civil.y === year || (civil.y === year - 1 && rule.rashi === 9)) {
      // Makar sankranti sometimes falls Jan 14; keep if in target year
      if (civil.y === year) add(rule, civil);
    }
  }

  // --- tithi / nakshatra festivals: scan each civil date of the year ---
  // (iterate civil dates directly — immune to DST transitions)
  for (const rule of FESTIVALS) rule._matched = false;
  const DIM = [0,31,28,31,30,31,30,31,31,30,31,30,31];
  function nextCivil(dt) {
    const leap = (dt.y % 4 === 0 && dt.y % 100 !== 0) || dt.y % 400 === 0;
    const dim = DIM[dt.m] + (dt.m === 2 && leap ? 1 : 0);
    let y = dt.y, m = dt.m, d = dt.d + 1;
    if (d > dim) { d = 1; m++; if (m > 12) { m = 1; y++; } }
    return { y, m, d };
  }
  let date = { y: year, m: 1, d: 1 };
  for (;;) {
    const p = P.panchangForDate(date, loc);
        const monthOk = (rule) => rule.solarMonth ? rule.solarMonth.includes(P.solarMonthIndex(p._jdRise)) : (rule.month === 'any' || rule.month.includes(p.monthAmantaIndex));

    for (const rule of FESTIVALS) {
      if (rule.type === 'sankranti') continue;
      // tithibegins rules check the month at sunset (their own branch), not sunrise
      if (rule.trigger !== 'tithibegins' && !monthOk(rule)) continue;
      if (rule.type === 'nakshatra') {
        if (p.nakshatraIndex === rule.nakshatra) add(rule, date);
        continue;
      }
      // tithi rule
      const ts = tithiList(rule);
      let t;
      if (rule.trigger === 'sunrise') t = p.tithi;
      else if (rule.trigger === 'sunset') t = P.tithiAt(p._jdSet);
      else if (rule.trigger === 'midnight') t = P.tithiAt(p._jdMidnight);
      else if (rule.trigger === 'midday') t = P.tithiAt(p._jdNoon);
      else if (rule.trigger === 'tithibegins') {
        // the tithi begins during this civil day: present at sunset, not at sunrise.
        // the month is evaluated just after the tithi begins — the beginning tithi
        // may belong to the new month (e.g. Chaitra pratipada beginning on the
        // Phalguna amavasya day, Kartik pratipada beginning on the amavasya day).
        const tR = P.tithiAt(p._jdRise), tS = P.tithiAt(p._jdSet);
        t = (ts.includes(tS) && !ts.includes(tR)) ? tS : null;
        if (t !== null) {
          let lo = p._jdRise, hi = p._jdSet; // bisect to the tithi-begin instant
          for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            if (P.tithiAt(mid) === t) hi = mid; else lo = mid;
          }
          const mBegin = P.amantaMonthIndex(hi + 0.5 / 24);
          if (rule.month === 'any' || rule.month.includes(mBegin)) rule._matched = true;
          else t = null;
        }
      }
      else if (rule.trigger === 'moonrise') {
        const mr = P.moonRiseUT(p._jd0ut, loc.lat, loc.lng);
        t = mr == null ? p.tithi : P.tithiAt(p._jd0ut + mr / 24);
      }
      if (ts.includes(t)) add(rule, { y: date.y, m: date.m, d: date.d });
    }

    // next civil date
    date = nextCivil(date);
    if (date.y > year) break;
  }

  // fallback for tithibegins rules that never matched (adhika/kshaya tithi edge):
  // use the first day with the tithi at sunrise
  for (const rule of FESTIVALS) {
    if (rule.trigger !== 'tithibegins' || rule._matched) continue;
    const ts = tithiList(rule);
    let date = { y: year, m: 1, d: 1 };
    for (;;) {
      const p = P.panchangForDate(date, loc);
      const monthOk = rule.month === 'any' || rule.month.includes(p.monthAmantaIndex);
      if (monthOk && ts.includes(p.tithi)) { add(rule, date); break; }
      date = nextCivil(date);
      if (date.y > year) break;
    }
  }

  // kshaya fallback (e.g. Ugadi): if the tithi never touched a sunrise all year
  // (kshaya tithi), observe it on the day on which it begins.
  for (const rule of FESTIVALS) {
    if (!rule.kshayaFallback || rule.trigger === 'tithibegins') continue;
    if (major.find(f => f.id === rule.id)) continue;
    const ts = tithiList(rule);
    let date = { y: year, m: 1, d: 1 };
    for (;;) {
      const p = P.panchangForDate(date, loc);
      const tR = P.tithiAt(p._jdRise), tS = P.tithiAt(p._jdSet);
      if (ts.includes(tS) && !ts.includes(tR)) {
        let lo = p._jdRise, hi = p._jdSet;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          if (P.tithiAt(mid) === tS) hi = mid; else lo = mid;
        }
        const mBegin = P.amantaMonthIndex(hi + 0.5 / 24);
        if (rule.month === 'any' || rule.month.includes(mBegin)) {
          add(rule, { y: date.y, m: date.m, d: date.d });
          break;
        }
      }
      date = nextCivil(date);
      if (date.y > year) break;
    }
  }

  // keepFirst rules (e.g. Diwali): when the tithi spans two sunsets, Drik takes
  // the first Pradosh-vyapini day.
  for (const rule of FESTIVALS) {
    if (!rule.keepFirst) continue;
    const idxs = [];
    major.forEach((f, i) => { if (f.id === rule.id) idxs.push(i); });
    if (idxs.length > 1) {
      idxs.sort((a, b) => (major[a].y - major[b].y) || (major[a].m - major[b].m) || (major[a].d - major[b].d));
      for (let k = idxs.length - 1; k >= 1; k--) major.splice(idxs[k], 1);
    }
  }

  // Holi (Rangwali) = the day after Holika Dahan
  // Holika Dahan Bhadra rule (Drik nirnaya): the bonfire is lit at Pradosh on the
  // Purnima day, avoiding Bhadra (Vishti karana). If Bhadra covers sunset and
  // extends past midnight, the Dahan moves to the next day.
  {
    const hdi = major.findIndex(f => f.id === 'holika-dahan');
    if (hdi >= 0) {
      const hd = major[hdi];
      const p = P.panchangForDate({ y: hd.y, m: hd.m, d: hd.d }, loc);
      if (P.isBhadraKarana(P.karanaAt(p._jdSet))) {
        let bhadraEnd = null, prev = p._jdSet;
        for (let m = 5; m <= 14 * 60; m += 5) {
          const jd = p._jdSet + m / 1440;
          if (!P.isBhadraKarana(P.karanaAt(jd))) {
            let lo = prev, hi = jd;
            for (let i = 0; i < 30; i++) {
              const mid = (lo + hi) / 2;
              if (P.isBhadraKarana(P.karanaAt(mid))) lo = mid; else hi = mid;
            }
            bhadraEnd = hi; break;
          }
          prev = jd;
        }
        if (bhadraEnd != null && bhadraEnd > p._jdMidnight) {
          const jd = P.julianDay(hd.y, hd.m, hd.d, 12) + 1;
          const c = P.civilDateInTz(jd, loc.tz);
          major[hdi] = { ...hd, y: c.y, m: c.m, d: c.d };
        }
      }
    }
  }
  const hd = major.find(f => f.id === 'holika-dahan');
  if (hd) {
    const jd = P.julianDay(hd.y, hd.m, hd.d, 12) + 1;
    const c = P.civilDateInTz(jd, loc.tz);
    if (c.y === year) major.push({ id: 'holi', name: 'Holi', blurb: 'Festival of colours', y: c.y, m: c.m, d: c.d });
  }

  const cmp = (a, b) => (a.y - b.y) || (a.m - b.m) || (a.d - b.d);
  major.sort(cmp); monthly.sort(cmp);
  // dedupe major on same date+name (e.g. Makar/Pongal share the day - keep both, they're distinct)
  return { major, monthly };
}

if (typeof module !== 'undefined') {
  module.exports = { FESTIVALS, festivalsForYear };
} else if (typeof window !== 'undefined') {
  window.GlaralFestivals = { FESTIVALS, festivalsForYear };
}
