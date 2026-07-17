// Public web origin the app talks to: the admin API (QA badge count), the
// real-render WebView (/qrcode) and the QA console (/adminqrcode/test).
//
// Configurable via EXPO_PUBLIC_BASE_URL so the app can be pointed at a Vercel
// preview to validate the multi-zone cutover (migration M4) without a rebuild
// of the production APK. Defaults to the production hub cenacrew.com — the apex
// redirects to www, which fetch and the WebView follow transparently.
export const BASE_URL = (
  process.env.EXPO_PUBLIC_BASE_URL ?? "https://cenacrew.com"
).replace(/\/+$/, "");
