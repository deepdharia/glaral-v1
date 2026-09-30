/* Glaral app config. Deep: paste your Dodo Payments payment link below. */
window.GLARAL_CONFIG = {
  // One-time Pro purchase link from Dodo Payments dashboard (Products -> your
  // $6.99 one-time product -> payment link). Leave empty to hide the paywall.
  DODO_PAYMENT_LINK: "",
  PRO_PRICE_LABEL: "$6.99 one-time",
  // Optional: Vercel serverless endpoints for license verification (see /api).
  VERIFY_ENDPOINT: "/api/verify",
};
