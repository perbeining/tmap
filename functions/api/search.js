// GET /api/search?q=...&lang=da|en – adresse- og bysøgning i Danmark via Nominatim.
// Går gennem vores server, så brugerens IP-adresse ikke sendes videre, og svar kan caches.
// Søgningen logges ikke.

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().replace(/\s+/g, ' ').slice(0, 150);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'da';
  if (q.length < 2) return json({ results: [] });

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/search?lang=${lang}&q=${encodeURIComponent(q.toLowerCase())}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const nominatim = new URL('https://nominatim.openstreetmap.org/search');
  nominatim.search = new URLSearchParams({
    q,
    format: 'jsonv2',
    countrycodes: 'dk',
    limit: '6',
    'accept-language': lang,
  }).toString();

  let res;
  try {
    res = await fetch(nominatim, {
      headers: {
        'User-Agent': `ToiletKort/0.1 (+${url.origin}/om; https://github.com/perbeining/tmap)`,
        Referer: `${url.origin}/`,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return json({ error: 'unavailable' }, 502);
  }
  if (!res.ok) return json({ error: 'unavailable' }, 502);

  const raw = await res.json();
  const seen = new Set();
  const results = (Array.isArray(raw) ? raw : [])
    .filter((r) => !seen.has(r.display_name) && seen.add(r.display_name))
    .map((r) => ({
    name: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    bbox: Array.isArray(r.boundingbox) ? r.boundingbox.map(Number) : null, // [syd, nord, vest, øst]
  }));
  const out = json({ results }, 200, { 'Cache-Control': 'public, max-age=86400' });
  waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
