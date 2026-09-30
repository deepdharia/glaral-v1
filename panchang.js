/* ============================================================
   Glaral Panchang Engine v1
   Original implementation. Low-precision astronomical methods
   after Meeus ("Astronomical Algorithms"):
     - Sun: apparent geocentric longitude (ch. 25)
     - Moon: truncated periodic series (ch. 47)
   Lahiri ayanamsa for sidereal positions.
   All calculations are done in UTC (Julian Day); conversion to
   civil time happens via the location's IANA timezone using Intl.
   Accuracy: tithi/nakshatra boundaries ~ +/-20 min, sunrise/sunset
   ~ +/-1 min, sankranti moments ~ +/-3 h. Good enough for a
   compact calendar; festival dates are validated against
   published panchangs (see validate.mjs).
   ============================================================ */
'use strict';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const SYNODIC_MONTH = 29.530588853;

function norm360(x) {
  x = x % 360;
  return x < 0 ? x + 360 : x;
}

/* Julian Day Number (UT). month 1-12. */
function julianDay(y, m, d, utHours) {
  utHours = utHours || 0;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) +
         d + B - 1524.5 + utHours / 24;
}

function jdToDate(jd) {
  // Returns {y,m,d} civil date for a JD (UT)
  let Z = Math.floor(jd + 0.5);
  const F = (jd + 0.5) - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { y: year, m: month, d: Math.floor(day) };
}

/* ---- Sun: apparent geocentric longitude, degrees ---- */
function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M  = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * D2R;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
            0.000289 * Math.sin(3 * Mr);
  const omega = 125.04 - 1934.136 * T;
  return norm360(L0 + C - 0.00569 - 0.00478 * Math.sin(omega * D2R));
}

/* ---- Moon: geocentric longitude, degrees (truncated series) ---- */
function moonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = norm360(218.3164477 + 481267.88123421 * T);
  const D  = norm360(297.8501921 + 445267.1114034 * T);
  const M  = norm360(357.5291092 + 35999.0502909 * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T);
  const F  = norm360(93.2720950 + 483202.0175233 * T);
  const s = (x) => Math.sin(x * D2R);
  // Lunar longitude: Meeus Table 47.A, 25 largest periodic terms
  // (omitted terms are all < 0.004 deg, i.e. < ~1 min in tithi terms)
  const lon = Lp
    + 6.288774 * s(Mp)
    + 1.274027 * s(2 * D - Mp)
    + 0.658314 * s(2 * D)
    + 0.213618 * s(2 * Mp)
    - 0.185116 * s(M)
    - 0.114332 * s(2 * F)
    + 0.058793 * s(2 * D - 2 * Mp)
    + 0.057066 * s(2 * D - M - Mp)
    + 0.053322 * s(2 * D + Mp)
    + 0.045758 * s(2 * D - M)
    - 0.040923 * s(M - Mp)
    - 0.034720 * s(D)
    - 0.030383 * s(Mp + 2 * F)
    + 0.015327 * s(Mp - 2 * F)
    - 0.012528 * s(2 * D - 2 * F)
    + 0.010980 * s(2 * F - Mp)
    + 0.010675 * s(2 * D - Mp + 2 * F)
    + 0.010034 * s(M + 2 * F)
    + 0.008548 * s(2 * D - M + Mp)
    - 0.007888 * s(2 * D + 2 * Mp)
    - 0.006766 * s(4 * D - Mp)
    - 0.005163 * s(3 * Mp)
    + 0.004987 * s(4 * D - 2 * Mp)
    + 0.004036 * s(2 * D + M - Mp)
    + 0.003994 * s(2 * D + M);
  return norm360(lon);
}

/* ---- Moon latitude, degrees (truncated series, for moonrise) ---- */
function moonLatitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const D  = norm360(297.8501921 + 445267.1114034 * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T);
  const F  = norm360(93.2720950 + 483202.0175233 * T);
  const s = (x) => Math.sin(x * D2R);
  return 5.128 * s(F)
    + 0.281 * s(Mp + F)
    + 0.278 * s(Mp - F)
    + 0.173 * s(2 * D - F)
    + 0.055 * s(2 * D - F - Mp)
    + 0.046 * s(2 * D - F + Mp)
    + 0.033 * s(2 * D + F - Mp)
    + 0.017 * s(2 * Mp + F);
}

/* ---- Lahiri ayanamsa, degrees ---- */
function ayanamsaLahiri(jd) {
  const years = (jd - 2451545.0) / 365.25;
  return 23.85 + 0.013969 * years;
}

function siderealSun(jd)  { return norm360(sunLongitude(jd) - ayanamsaLahiri(jd)); }
function siderealMoon(jd) { return norm360(moonLongitude(jd) - ayanamsaLahiri(jd)); }
/* Solar month index 0..11 (0=Mesha, 4=Simha/Chingam, ...), from sidereal sun */
function solarMonthIndex(jd) { return Math.floor(siderealSun(jd) / 30) % 12; }

/* ---- Tithi: 1..30 (1-15 shukla, 16-29 krishna, 30 = amavasya) ---- */
function tithiAt(jd) {
  const elong = norm360(moonLongitude(jd) - sunLongitude(jd));
  return Math.floor(elong / 12) + 1;
}
function pakshaOfTithi(t) { return t <= 15 ? 'shukla' : 'krishna'; }

/* ---- Nakshatra 0..26, Yoga 0..26, Karana 0..59 ---- */
const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashirsha','Ardra',
  'Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni',
  'Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula',
  'Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'];

function nakshatraAt(jd) {
  return Math.floor(siderealMoon(jd) / (360 / 27)) % 27;
}
function yogaAt(jd) {
  return Math.floor(norm360(siderealSun(jd) + siderealMoon(jd)) / (360 / 27)) % 27;
}
function karanaAt(jd) {
  const elong = norm360(moonLongitude(jd) - sunLongitude(jd));
  return Math.floor(elong / 6) % 60;
}
const KARANA_NAMES = ['Kimstughna','Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti','Shakuni','Chatushpada','Naga'];
function karanaName(k) {
  // k = half-tithi index 0..59: 0 = Kimstughna (1st half of Shukla Pratipada);
  // 57 = Shakuni, 58 = Chatushpada, 59 = Naga (fixed); 1..56 = the 7 movable
  // karanas (Bava..Vishti) repeating. Vishti = Bhadra.
  if (k === 0) return KARANA_NAMES[0];
  if (k === 57) return KARANA_NAMES[8];
  if (k === 58) return KARANA_NAMES[9];
  if (k === 59) return KARANA_NAMES[10];
  return KARANA_NAMES[1 + ((k - 1) % 7)];
}
function isBhadraKarana(k) { return k >= 1 && k <= 56 && ((k - 1) % 7 === 6); }

/* ---- New moon instants ----
   Elongation e = norm360(moon - sun); new moon when e wraps 360 -> 0. */
function elongation(jd) { return norm360(moonLongitude(jd) - sunLongitude(jd)); }

function newMoonJD(jdRef, direction) {
  // direction: -1 = most recent at-or-before jdRef, +1 = next at-or-after
  const dist = (jd) => { const e = elongation(jd); return Math.min(e, 360 - e); };
  // degenerate: jdRef itself is within ~2h of a new moon
  if (dist(jdRef) < 1.0) {
    let a = jdRef - 1, b = jdRef + 1;
    const gr = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 60; i++) {
      const c = b - gr * (b - a), d2 = a + gr * (b - a);
      if (dist(c) < dist(d2)) b = d2; else a = c;
    }
    return (a + b) / 2;
  }
  // bracket the wrap in 6-hour steps (elongation moves ~3 deg/step,
  // so the wrap can never be jumped over); up to 35 days
  let lo = null, hi = null, prevJd = jdRef, prevE = elongation(prevJd);
  for (let d = 1; d <= 140; d++) {
    const jd = jdRef + direction * d * 0.25, e = elongation(jd);
    const wrapped = direction === -1 ? (prevE < 12 && e > 348)
                                     : (prevE > 348 && e < 12);
    if (wrapped) { lo = Math.min(jd, prevJd); hi = Math.max(jd, prevJd); break; }
    prevJd = jd; prevE = e;
  }
  if (lo == null) return null;
  // golden-section search for the instant of minimum elongation
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = lo, b = hi;
  for (let i = 0; i < 60; i++) {
    const c = b - gr * (b - a), d2 = a + gr * (b - a);
    if (dist(c) < dist(d2)) b = d2; else a = c;
  }
  return (a + b) / 2;
}

/* ---- Lunar month (0-based). monthNames[0] = Chaitra ... [11] = Phalguna ----
   Anchored at the new moon (rigorous across sankranti boundaries and
   adhika masas). In amanta, the amavasya day belongs to the ENDING month. */
const MONTHS = ['Chaitra','Vaishakha','Jyeshtha','Ashadha','Shravana','Bhadrapada',
  'Ashwin','Kartik','Margashirsha','Pausha','Magha','Phalguna'];

function amantaMonthIndex(jdRise) {
  const t = tithiAt(jdRise);
  let nmJD;
  if (t === 30) {
    nmJD = newMoonJD(jdRise, 1) || newMoonJD(jdRise, -1);
    if (nmJD == null) return 0;
    return Math.floor(siderealSun(nmJD) / 30) % 12; // ending month
  }
  nmJD = newMoonJD(jdRise, -1);
  if (nmJD == null) return 0;
  const r = Math.floor(siderealSun(nmJD) / 30) % 12;
  return (r + 1) % 12;
}

function purnimantaMonthIndex(jdRise) {
  const a = amantaMonthIndex(jdRise);
  const t = tithiAt(jdRise);
  return pakshaOfTithi(t) === 'krishna' ? (a + 1) % 12 : a;
}

/* ---- Precise solar ephemeris helpers (for sunrise/sunset) ---- */
function sunRADec(jd) {
  const lambda = sunLongitude(jd) * D2R; // apparent longitude (Meeus)
  const T = (jd - 2451545.0) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * D2R;
  return {
    ra: Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)), // radians
    dec: Math.asin(Math.sin(eps) * Math.sin(lambda))
  };
}
function gmstRad(jd) {
  const T = (jd - 2451545.0) / 36525;
  const d = jd - 2451545.0;
  return norm360(280.46061837 + 360.98564736629 * d +
                 0.000387933 * T * T - T * T * T / 38710000) * D2R;
}
/* JD of solar transit (local apparent noon) nearest to jd0+0.5 */
function solarTransitJD(jd0, lng) {
  let jd = jd0 + 0.5;
  for (let i = 0; i < 5; i++) {
    const ra = sunRADec(jd).ra;
    let H = norm360(gmstRad(jd) * R2D + lng - ra * R2D); // hour angle, deg
    if (H > 180) H -= 360;
    jd = jd - H / 360.98564736629;
  }
  return jd;
}

/* ---- Sunrise / sunset (fractional UT hours after jd0) ----
   jd0 = JD near local midnight. Zenith 90.833 deg. */
function sunRiseSet(jd0, lat, lng) {
  const latR = lat * D2R;
  const jdT = solarTransitJD(jd0, lng);
  function halfDay(jdGuess) {
    const dec = sunRADec(jdGuess).dec;
    const c = (Math.sin(-0.833 * D2R) - Math.sin(latR) * Math.sin(dec)) /
              (Math.cos(latR) * Math.cos(dec));
    if (c > 1 || c < -1) return null;
    return Math.acos(c) * R2D / 360; // days
  }
  const h = halfDay(jdT);
  if (h == null) return { rise: null, set: null };
  const hr = halfDay(jdT - h); // refine with declination at rise
  const hs = halfDay(jdT + h); // refine with declination at set
  return { rise: (jdT - hr - jd0) * 24, set: (jdT + hs - jd0) * 24 };
}

/* ---- Solar noon (fractional UT hours after jd0), for Abhijit muhurat ---- */
function solarNoonUT(jd0, lat, lng) {
  const jdT = solarTransitJD(jd0, lng);
  return (jdT - jd0) * 24;
}

/* ---- Moonrise (fractional UT hours), coarse scan ---- */
function moonRiseUT(jd0, lat, lng) {
  const latR = lat * D2R;
  function altAt(utH) {
    const jd = jd0 + utH / 24;
    const T = (jd - 2451545.0) / 36525;
    const lambda = moonLongitude(jd) * D2R;
    const beta = moonLatitude(jd) * D2R;
    const eps = (23.4392911 - 0.0130042 * T) * D2R;
    // ecliptic -> equatorial
    const dec = Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda));
    let ra = Math.atan2(Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lambda));
    // GMST
    const d = jd - 2451545.0;
    let gmst = norm360(280.46061837 + 360.98564736629 * d) / 15; // hours
    let lst = gmst + lng / 15;
    const H = (lst - ra * R2D / 15) * 15 * D2R;
    return Math.asin(Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(H)) * R2D;
  }
  const horizon = -0.125; // upper limb + refraction, approx
  let prev = altAt(0) - horizon;
  for (let h = 0.25; h <= 24; h += 0.25) {
    const cur = altAt(h) - horizon;
    if (prev < 0 && cur >= 0) {
      // refine by bisection
      let lo = h - 0.25, hi = h;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (altAt(mid) - horizon < 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prev = cur;
  }
  return null;
}

/* ---- Rahu kaal / Yamaganda / Gulika segment index (0-7) by weekday ----
   weekday: 0=Sunday..6=Saturday */
const RAHU_SEG   = [7, 1, 6, 4, 5, 3, 2]; // Sun..Sat -> 0-based segment
const YAMA_SEG   = [4, 3, 2, 1, 0, 6, 5];
const GULIKA_SEG = [6, 5, 4, 3, 2, 1, 0];

function daySegments(riseUT, setUT) {
  let set = setUT; if (set < riseUT) set += 24;
  const len = (set - riseUT) / 8;
  const segs = [];
  for (let i = 0; i < 8; i++) segs.push([riseUT + i * len, riseUT + (i + 1) * len]);
  return segs;
}

/* ---- Timezone helpers: convert UT hours -> civil time string in IANA tz ---- */
function tzOffsetMinutes(jd, tz) {
  // offset of tz at the given JD, in minutes
  const ms = (jd - 2440587.5) * 86400000;
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = dtf.formatToParts(new Date(ms));
  const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUTC - ms) / 60000);
}

function fmtTime(utHours, jd0, tz) {
  if (utHours == null) return '--:--';
  const ms = (jd0 + utHours / 24 - 2440587.5) * 86400000;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true
  }).format(new Date(ms));
}

function civilDateInTz(jd, tz) {
  const ms = (jd - 2440587.5) * 86400000;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(ms));
  const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/* Weekday in tz for a JD: 0=Sunday */
function weekdayInTz(jd, tz) {
  const ms = (jd - 2440587.5) * 86400000;
  const dow = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date(ms));
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[dow];
}

const VARA_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---- Full panchang for one civil date at a location ----
   loc = {lat, lng, tz}. date = {y, m, d} civil date in that tz. */
function panchangForDate(date, loc) {
  // JD at 0h UT of the UT date that contains local midnight-ish; simpler:
  // compute JD for the civil date at 12:00 local = find UT via offset guess.
  const jdNoonGuess = julianDay(date.y, date.m, date.d, 12);
  const offMin = tzOffsetMinutes(jdNoonGuess, loc.tz);
  const jd0ut = julianDay(date.y, date.m, date.d, 0) - offMin / 1440; // 0h local in UT
  const rs = sunRiseSet(jd0ut, loc.lat, loc.lng);
  const jdRise = rs.rise != null ? jd0ut + rs.rise / 24 : jd0ut + 6 / 24;
  const jdSet  = rs.set  != null ? jd0ut + rs.set / 24  : jd0ut + 18 / 24;
  const jdMidnight = jd0ut + 24 / 24; // next local midnight approx (0h local + 24h)

  const tithiRise = tithiAt(jdRise);
  const sunRashi = Math.floor(siderealSun(jdRise) / 30) % 12;
  const monthA = amantaMonthIndex(jdRise);
  const monthP = purnimantaMonthIndex(jdRise);
  const wd = weekdayInTz(jdRise, loc.tz);

  const segs = (rs.rise != null && rs.set != null) ? daySegments(rs.rise, rs.set) : null;
  function segRange(idx) {
    if (!segs) return null;
    const [a, b] = segs[idx];
    return fmtTime(a, jd0ut, loc.tz) + ' – ' + fmtTime(b, jd0ut, loc.tz);
  }
  // raw segment boundaries as ms timestamps (for live countdowns)
  function segMs(idx) {
    if (!segs) return null;
    const [a, b] = segs[idx];
    return [ (jd0ut + a/24 - 2440587.5)*86400000, (jd0ut + b/24 - 2440587.5)*86400000 ];
  }
  const noonUT = solarNoonUT(jd0ut, loc.lat, loc.lng);
  const jdNoon = jd0ut + noonUT / 24;

  return {
    date, tz: loc.tz,
    vara: VARA_NAMES[wd], weekday: wd,
    tithi: tithiRise,
    tithiName: tithiName(tithiRise),
    paksha: pakshaOfTithi(tithiRise),
    nakshatra: NAKSHATRAS[nakshatraAt(jdRise)],
    nakshatraIndex: nakshatraAt(jdRise),
    yogaIndex: yogaAt(jdRise),
    yogaName: YOGA_NAMES[yogaAt(jdRise)],
    karanaIndex: karanaAt(jdRise),
    karanaName: karanaName(karanaAt(jdRise)),
    sunRashi,
    monthAmanta: MONTHS[monthA],
    monthPurnimanta: MONTHS[monthP],
    monthAmantaIndex: monthA,
    monthPurnimantaIndex: monthP,
    sunrise: fmtTime(rs.rise, jd0ut, loc.tz),
    sunset: fmtTime(rs.set, jd0ut, loc.tz),
    moonrise: fmtTime(moonRiseUT(jd0ut, loc.lat, loc.lng), jd0ut, loc.tz),
    rahuKaal: segRange(RAHU_SEG[wd]),
    yamaganda: segRange(YAMA_SEG[wd]),
    gulika: segRange(GULIKA_SEG[wd]),
    abhijit: fmtTime(noonUT - 0.4, jd0ut, loc.tz) + ' – ' + fmtTime(noonUT + 0.4, jd0ut, loc.tz),
    // raw ms timestamps for live countdowns
    _rahuMs: segMs(RAHU_SEG[wd]),
    _yamaMs: segMs(YAMA_SEG[wd]),
    _gulikaMs: segMs(GULIKA_SEG[wd]),
    _abhijitMs: [ (jd0ut + (noonUT-0.4)/24 - 2440587.5)*86400000, (jd0ut + (noonUT+0.4)/24 - 2440587.5)*86400000 ],
    // raw JDs for festival trigger checks
    _jdRise: jdRise, _jdSet: jdSet, _jdMidnight: jdMidnight, _jdNoon: jdNoon, _jd0ut: jd0ut
  };
}

const TITHI_NAMES = ['','Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi',
  'Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi',
  'Chaturdashi','Purnima','Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi',
  'Trayodashi','Chaturdashi','Amavasya'];

function tithiName(t) { return TITHI_NAMES[t] || ''; }

const YOGA_NAMES = ['Vishkambha','Priti','Ayushmana','Saubhagya','Shobhana','Atiganda',
  'Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana',
  'Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha','Sadhya',
  'Shubha','Shukla','Brahma','Indra','Vaidhriti'];

/* Sankranti moment: JD when sidereal sun crosses rashi boundary k (0..11).
   Searches within [jdStart, jdStart+40]. */
function sankrantiJD(jdStart, k) {
  const target = k * 30;
  function f(jd) {
    let d = norm360(siderealSun(jd) - target);
    if (d > 180) d -= 360;
    return d; // (-180, 180]
  }
  let prevJd = jdStart, prevF = f(prevJd);
  for (let d = 1; d <= 400; d++) {
    const jd = jdStart + d, fv = f(jd);
    // genuine crossing moves ~1 deg/day; the +/-180 wrap jumps ~360 deg
    const crossed = ((prevF <= 0 && fv > 0) || (prevF > 0 && fv <= 0)) &&
                    Math.abs(fv - prevF) < 10;
    if (crossed) {
      let lo = prevJd, hi = jd, flo = prevF;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2, fm = f(mid);
        if ((flo <= 0 && fm > 0) || (flo > 0 && fm <= 0)) hi = mid;
        else { lo = mid; flo = fm; }
      }
      return (lo + hi) / 2;
    }
    prevJd = jd; prevF = fv;
  }
  return null;
}

const RASHI_NAMES = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];

if (typeof module !== 'undefined') {
  module.exports = { julianDay, jdToDate, sunLongitude, moonLongitude, moonLatitude,
    ayanamsaLahiri, siderealSun, siderealMoon, tithiAt, pakshaOfTithi, tithiName,
    nakshatraAt, yogaAt, karanaAt, karanaName, isBhadraKarana, NAKSHATRAS, YOGA_NAMES, MONTHS, amantaMonthIndex, purnimantaMonthIndex,
    sunRiseSet, solarNoonUT, solarTransitJD, sunRADec, gmstRad, moonRiseUT, daySegments, RAHU_SEG, YAMA_SEG, GULIKA_SEG,
    tzOffsetMinutes, fmtTime, civilDateInTz, weekdayInTz, VARA_NAMES, panchangForDate,
    sankrantiJD, norm360, elongation, newMoonJD, solarMonthIndex, RASHI_NAMES };
}
if (typeof window !== 'undefined') {
  window.GlaralPanchang = { julianDay, jdToDate, sunLongitude, moonLongitude, moonLatitude,
    ayanamsaLahiri, siderealSun, siderealMoon, tithiAt, pakshaOfTithi, tithiName,
    nakshatraAt, yogaAt, karanaAt, karanaName, isBhadraKarana, NAKSHATRAS, YOGA_NAMES, MONTHS, amantaMonthIndex, purnimantaMonthIndex,
    sunRiseSet, solarNoonUT, solarTransitJD, sunRADec, gmstRad, moonRiseUT, daySegments, RAHU_SEG, YAMA_SEG, GULIKA_SEG,
    tzOffsetMinutes, fmtTime, civilDateInTz, weekdayInTz, VARA_NAMES, panchangForDate,
    sankrantiJD, norm360, elongation, newMoonJD, solarMonthIndex, RASHI_NAMES };
}
