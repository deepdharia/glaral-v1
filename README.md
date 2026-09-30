# Glaral — Hindu Calendar

A precise, on-device Hindu panchang calendar for anywhere on Earth. One-time purchase, no subscription.

**Live:** https://glaral.com

## What it does
- **Today view (free):** tithi, paksha, nakshatra, yoga, karana, vara, sunrise/sunset/moonrise, Rahu Kaal, Yamaganda, Gulika, Abhijit — for 150+ world cities or your GPS location.
- **Monthly calendar (Pro):** any month, daily tithis with festival markers.
- **Festival list (Pro):** all major festivals for the year, computed for your city.
- Amanta / Purnimanta month toggle. PWA — installable, works offline.

## The engine
`panchang.js` + `festivals.js` are an **original implementation** (no copied code):
- Meeus low-precision solar theory + nutation, 25-term lunar theory (Meeus Table 47.A)
- Lahiri ayanamsa, transit-based sunrise/sunset, moonrise scan
- Rule-based festival nirnaya (pradosh-vyapini, udaya-tithi, Bhadra rules, kshaya-tithi fallbacks, solar-month gating for Onam)

**Validated: 45/45 against Drik Panchang** (23 dates for 2026 + 22 for 2025), including tricky
cases: Holika Dahan Bhadra shift, Diwali pradosh-vyapini, kshaya-tithi Ugadi/Vasant Panchami,
Karva Chauth, Chhath keep-first-day. Run: `node validate.cjs`.

## Monetization
One-time **$6.99** via Dodo Payments. `config.js` holds the payment link; `api/webhook.js`
issues license keys on `payment.succeeded`; `api/verify.js` verifies them. See `DEPLOY.md`.

## Deploy
See [DEPLOY.md](DEPLOY.md) — GitHub → Vercel → glaral.com, Dodo setup, key generation.
