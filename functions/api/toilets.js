// GET /api/toilets – alle aktive toiletter som GeoJSON (ODbL).
// ?download=1 giver filen som download. Svaret caches pr. dataversion.

const COLUMNS = [
  'id', 'source', 'osm_type', 'osm_id', 'osm_timestamp', 'osm_check_date', 'lat', 'lon', 'name', 'access_category',
  'opening_hours', 'fee', 'charge', 'payment', 'wheelchair', 'wheelchair_description',
  'changing_table', 'key_required', 'key_info', 'toilet_type', 'unisex', 'description',
  'status', 'updated_at', 'last_verified_at',
];

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const download = url.searchParams.get('download') === '1';
  const version = (await env.DB.prepare("SELECT value FROM meta WHERE key = 'data_version'").first('value')) || '0';
  const etag = `"${version}"`;
  if (!download && request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/toilets?v=${encodeURIComponent(version)}`);
  let body = null;
  const hit = await cache.match(cacheKey);
  if (hit) body = await hit.text();

  if (!body) {
    const { results } = await env.DB.prepare(
      `SELECT ${COLUMNS.join(', ')} FROM toilets WHERE status IN ('active', 'temporarily_closed')`,
    ).all();
    const features = results.map((r) => {
      const properties = {};
      for (const c of COLUMNS) {
        if (c === 'lat' || c === 'lon') continue;
        if (r[c] !== null && r[c] !== undefined) properties[c] = r[c];
      }
      return { type: 'Feature', id: r.id, geometry: { type: 'Point', coordinates: [r.lon, r.lat] }, properties };
    });
    body = JSON.stringify({
      type: 'FeatureCollection',
      license: 'ODbL-1.0',
      attribution: '© OpenStreetMap contributors, ToiletKort',
      data_version: version,
      features,
    });
    waitUntil(
      cache.put(cacheKey, new Response(body, { headers: { 'Cache-Control': 'public, max-age=86400' } })),
    );
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    ETag: etag,
  };
  if (download) {
    headers['Content-Type'] = 'application/geo+json; charset=utf-8';
    headers['Content-Disposition'] = 'attachment; filename="toiletkort.geojson"';
  }
  return new Response(body, { headers });
}
