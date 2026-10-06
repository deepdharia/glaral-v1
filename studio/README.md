# Glaral Studio

Next.js on Vercel with the existing GLARAL Supabase project. This directory is the Vercel project root. Run npm ci and npm run dev.

Set the four variables in .env.example on Vercel. GLARAL_BACKEND_SECRET is server-only and must match the protected database setting. Do not use a NEXT_PUBLIC_ prefix for it.

Studio publishing uses the existing Supabase owner account. Visit /admin and sign in with email/password. Public visitors can explore and react without signing in.

Udhar is at /udhar; its project overview is at /projects/udhar. Ledger records stay in browser localStorage. Export and restore a backup when changing browser origins.

The original repository files remain outside studio. Paid checkout is not active.
