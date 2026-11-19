// Ren logik uden DOM: filtre, afstande og formatering. Testes i test/logic.test.mjs.

export const CATEGORIES = ['public', 'customers', 'permission'];

export const DEFAULT_FILTERS = Object.freeze({
  openNow: false,
  free: false,
  wheelchair: false,
  changingTable: false,
  categories: ['public'], // F4: som standard vises kun offentlige toiletter
  hideUnknown: false,
});

/** 'match' | 'nomatch' | 'unknown' for hvert filter. */
export const checks = {
  free(p) {
    if (p.fee === 'no') return 'match';
    if (p.fee === 'yes') return 'nomatch';
    return 'unknown';
  },
  wheelchair(p) {
    if (p.wheelchair === 'yes' || p.wheelchair === 'limited') return 'match';
    if (p.wheelchair === 'no') return 'nomatch';
    return 'unknown';
  },
  changingTable(p) {
    if (p.changing_table === 'yes' || p.changing_table === 'limited') return 'match';
    if (p.changing_table === 'no') return 'nomatch';
    return 'unknown';
  },
  openNow(_p, openState) {
    if (openState === 'open') return 'match';
    if (openState === 'closed') return 'nomatch';
    return 'unknown';
  },
};

/**
 * F4a: et filter skjuler kun toiletter, hvor oplysningen er kendt og ikke passer.
 * Ukendte vises, medmindre brugeren har valgt at skjule dem.
 */
export function passesFilters(p, filters, openState = 'unknown') {
  if (!filters.categories.includes(p.access_category || 'public')) return false;
  for (const name of ['openNow', 'free', 'wheelchair', 'changingTable']) {
    if (!filters[name]) continue;
    const r = checks[name](p, openState);
    if (r === 'nomatch') return false;
    if (r === 'unknown' && filters.hideUnknown) return false;
  }
  return true;
}

export function activeFilterCount(f) {
  let n = ['openNow', 'free', 'wheelchair', 'changingTable'].filter((k) => f[k]).length;
  const cats = [...f.categories].sort().join(',');
  if (cats !== 'public') n++;
  if (f.hideUnknown) n++;
  return n;
}

/** Afstand i meter mellem to [lat, lon]. */
export function distanceMeters(a, b) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Kompasretning fra a til b som en af N, NE, E, SE, S, SW, W, NW. */
export function bearing(a, b) {
  const rad = Math.PI / 180;
  const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad);
  const x = Math.cos(a[0] * rad) * Math.sin(b[0] * rad) - Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad);
  const deg = (Math.atan2(y, x) / rad + 360) % 360;
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}

export function formatDistance(m, locale) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  const km = m / 1000;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

/** De n nærmeste toiletter, der passer til filteret, sorteret efter afstand. */
export function nearest(toilets, origin, n, keep = () => true) {
  const out = [];
  for (const t of toilets) {
    if (!keep(t)) continue;
    out.push({ t, d: distanceMeters(origin, [t.lat, t.lon]) });
  }
  out.sort((x, y) => x.d - y.d);
  return out.slice(0, n);
}

/** Link til rutevejledning i telefonens kort-app (Apple Kort på iPhone/iPad, ellers Google Maps). */
export function routeUrl(lat, lon, userAgent = '') {
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
}

/** Link til at rette elementet i OpenStreetMaps editor. */
export function osmEditUrl(osmType, osmId) {
  if (!osmType || !osmId) return null;
  return `https://www.openstreetmap.org/edit?${osmType}=${osmId}`;
}
