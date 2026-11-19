// Åbningstider (F4b) læses med biblioteket opening_hours.js, som hentes, efter kortet er vist.

let OpeningHours = null;
let loading = null;
const cache = new Map();

export function loadHoursLib() {
  if (!loading) {
    loading = import('opening_hours').then((m) => {
      OpeningHours = m.default || m;
      return OpeningHours;
    });
  }
  return loading;
}

export const hoursReady = () => OpeningHours !== null;

function parse(t, lang) {
  const key = `${t.id}|${lang}`;
  if (cache.has(key)) return cache.get(key);
  let oh = null;
  try {
    oh = new OpeningHours(
      t.opening_hours,
      { lat: t.lat, lon: t.lon, address: { country_code: 'dk', state: '' } },
      { locale: lang },
    );
  } catch {
    oh = null; // ugyldig værdi i OSM – behandles som ukendt
  }
  cache.set(key, oh);
  return oh;
}

/**
 * @returns {{state:'open'|'closed'|'unknown', next:Date|null, alwaysOpen:boolean, pretty:string|null}}
 */
export function hoursInfo(t, lang = 'da', now = new Date()) {
  if (!t.opening_hours) return { state: 'unknown', next: null, alwaysOpen: false, pretty: null };
  if (t.opening_hours.trim() === '24/7') return { state: 'open', next: null, alwaysOpen: true, pretty: null };
  if (!OpeningHours) return { state: 'unknown', next: null, alwaysOpen: false, pretty: null };
  const oh = parse(t, lang);
  if (!oh) return { state: 'unknown', next: null, alwaysOpen: false, pretty: t.opening_hours };
  let state = 'unknown';
  let next = null;
  let pretty = null;
  try {
    state = oh.getUnknown(now) ? 'unknown' : oh.getState(now) ? 'open' : 'closed';
    next = oh.getNextChange(now) || null;
    pretty = oh.prettifyValue({ conf: { locale: lang } });
  } catch {
    state = 'unknown';
  }
  return { state, next, alwaysOpen: false, pretty };
}
