// Kører foran alle forespørgsler: sender til den kanoniske adresse (hvis sat) og
// tilføjer sikkerhedsheadere. Ingen adresse er skrevet fast her – se CANONICAL_HOST i wrangler.jsonc.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  "connect-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const canonical = (env.CANONICAL_HOST || '').trim().toLowerCase();
  if (
    canonical &&
    url.hostname !== canonical &&
    !LOCAL_HOSTS.has(url.hostname) &&
    !url.hostname.endsWith('.pages.dev')
  ) {
    url.hostname = canonical;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  const res = await next();
  const out = new Response(res.body, res);
  const h = out.headers;
  h.set('Content-Security-Policy', CSP);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (url.pathname.startsWith('/assets/')) {
    h.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  return out;
}
