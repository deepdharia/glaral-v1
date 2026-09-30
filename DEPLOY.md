# Glaral — Deploy Guide (GitHub → Vercel → glaral.com)

## 1. Push to GitHub
```bash
cd ~/workspace/glaral
git init
git add .
git commit -m "Glaral v1: panchang engine + web app"
# create repo "glaral" on github.com (public or private), then:
git remote add origin git@github.com:deepdharia/glaral.git
git push -u origin main
```

## 2. Deploy on Vercel
1. vercel.com → Add New → Project → import `deepdharia/glaral`.
2. Framework preset: **Other**. No build step needed (static + `api/` serverless).
3. Deploy. You get `glaral.vercel.app`.

## 3. Connect glaral.com
1. Vercel project → Settings → Domains → add `glaral.com` (and `www.glaral.com`).
2. At your domain registrar, point DNS to Vercel:
   - `A` record `@` → `76.76.21.21`, or
   - `CNAME` `www` → `cname.vercel-dns.com`
   (Vercel shows exact values in the Domains panel.)
3. Wait for SSL (~1 min). Done.

## 4. Dodo Payments (one-time $6.99 Pro)
1. Dodo dashboard → Products → New product:
   - Name: `Glaral Pro`, type: **one-time**, price: **$6.99**.
   - Copy the **payment link**.
2. Paste it into `config.js` → `DODO_PAYMENT_LINK`, commit & push (auto-redeploys).
3. Webhooks → add `https://glaral.com/api/webhook`, subscribe to `payment.succeeded`.
4. Vercel → Project → Settings → Environment Variables:
   - `DODO_WEBHOOK_SECRET` = webhook signing secret
   - `DODO_API_KEY` = Dodo API key (for emailing keys)
5. Test: buy with a test card → check Vercel function logs for `GLARAL license issued`
   → wire the `TODO: email` line in `api/webhook.js` to actually send the key
   (Resend.com is the simplest: 1 API call).

## 5. Generate license keys manually (for friends/testers)
```bash
node scripts/genkey.js        # prints a valid GLRL-XXXX-XXXX-XXXX key
node scripts/genkey.js 5      # prints 5
```

## 6. Verify live
- Open `https://glaral.com` on your iPhone → Add to Home Screen (PWA).
- Today tab shows tithi/nakshatra/sunrise for New Delhi.
- City search → pick a city → times update.
- Calendar/Festivals tabs → Pro paywall → paste a `genkey.js` key → unlocks.

## Files
- `panchang.js` / `festivals.js` — original computation engine (validated 45/45 vs Drik Panchang 2025+2026)
- `validate.cjs` — regression suite (`node validate.cjs`)
- `index.html` / `app.js` / `cities.js` / `config.js` — the web app
- `manifest.json` / `sw.js` / `icons/` — PWA
- `api/webhook.js` / `api/verify.js` — Dodo + license serverless stubs
