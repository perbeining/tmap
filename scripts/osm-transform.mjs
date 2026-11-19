// Omsætter OpenStreetMap-elementer (amenity=toilets) til rækker i tabellen toilets.
// Ren funktion uden afhængigheder, så den kan testes og genbruges (fx i et planlagt job senere).

// Felter, der hentes fra OSM og gemmes pr. felt i toilet_osm_values.
export const OSM_FIELDS = [
  'name',
  'access_category',
  'opening_hours',
  'fee',
  'charge',
  'payment',
  'wheelchair',
  'wheelchair_description',
  'changing_table',
  'key_required',
  'key_info',
  'toilet_type',
  'unisex',
  'description',
];

// OSM access-værdier, der betyder "alle må bruge det". Manglende access-tag tolkes også som offentligt.
const PUBLIC_ACCESS = new Set(['yes', 'public', 'permissive']);

const clean = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s.slice(0, 500);
};

const yesNo = (v, extra = []) => {
  const s = clean(v)?.toLowerCase();
  if (!s) return null;
  if (s === 'yes' || s === 'no' || extra.includes(s)) return s;
  return null; // ukendte værdier behandles som ukendt frem for et gæt
};

/** Afgør adgangskategori. Returnerer null, hvis toilettet ikke skal importeres (fx kun for kunder). */
export function accessCategory(tags) {
  const access = clean(tags.access)?.toLowerCase();
  if (!access || PUBLIC_ACCESS.has(access)) return 'public';
  return null;
}

function wheelchair(tags) {
  const s = clean(tags.wheelchair)?.toLowerCase();
  if (s === 'designated') return 'yes';
  return ['yes', 'limited', 'no'].includes(s) ? s : null;
}

function changingTable(tags) {
  const s = clean(tags.changing_table ?? tags.diaper)?.toLowerCase();
  if (!s) return null;
  if (s === 'yes' || s === 'no' || s === 'limited') return s;
  if (/^\d+$/.test(s)) return s === '0' ? 'no' : 'yes'; // ældre diaper=<antal>
  return null;
}

function payment(tags) {
  const methods = Object.entries(tags)
    .filter(([k, v]) => k.startsWith('payment:') && v === 'yes')
    .map(([k]) => k.slice('payment:'.length));
  return methods.length ? methods.sort().join(',') : null;
}

function keyRequired(tags) {
  // Euronøgle m.fl. ligger i centralkey=*. locked=yes betyder, at døren er låst.
  if (clean(tags.centralkey) && tags.centralkey !== 'no') return 'key';
  const locked = clean(tags.locked)?.toLowerCase();
  if (locked === 'yes') return 'key';
  if (locked === 'no') return 'no';
  return null;
}

function keyInfo(tags) {
  const ck = clean(tags.centralkey);
  if (ck && ck !== 'no') return ck === 'eurokey' ? 'eurokey' : ck;
  return null;
}

function toiletType(tags) {
  if (tags.supervised === 'yes') return 'staffed';
  if (tags.automatic === 'yes' || tags['toilets:type'] === 'automatic') return 'automatic';
  const disposal = clean(tags['toilets:disposal'])?.toLowerCase();
  if (disposal === 'pitlatrine') return 'pit_latrine';
  if (disposal === 'bucket' || disposal === 'dry' || disposal === 'composting' || tags.composting === 'yes') return 'dry';
  if (disposal === 'flush' || disposal === 'chemical') return 'flush';
  return null;
}

function unisex(tags) {
  if (tags.unisex === 'yes' || tags.gender_segregated === 'no') return 'yes';
  if (tags.unisex === 'no' || tags.gender_segregated === 'yes') return 'no';
  return null;
}

/**
 * @param {{type:string,id:number,lat?:number,lon?:number,center?:{lat:number,lon:number},tags?:object,version?:number,timestamp?:string}} el
 * @returns {object|null} række til toilets, eller null hvis elementet springes over
 */
export function transformElement(el) {
  const tags = el.tags || {};
  if (tags.amenity !== 'toilets') return null;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  const category = accessCategory(tags);
  if (!category) return null;

  return {
    osm_type: el.type,
    osm_id: el.id,
    osm_version: el.version ?? null,
    osm_timestamp: el.timestamp ?? null,
    lat: Math.round(lat * 1e7) / 1e7,
    lon: Math.round(lon * 1e7) / 1e7,
    name: clean(tags['name:da'] ?? tags.name),
    access_category: category,
    opening_hours: clean(tags.opening_hours),
    fee: yesNo(tags.fee),
    charge: clean(tags.charge),
    payment: payment(tags),
    wheelchair: wheelchair(tags),
    wheelchair_description: clean(tags['wheelchair:description:da'] ?? tags['wheelchair:description']),
    changing_table: changingTable(tags),
    key_required: keyRequired(tags),
    key_info: keyInfo(tags),
    toilet_type: toiletType(tags),
    unisex: unisex(tags),
    description: clean(tags['description:da'] ?? tags.description),
  };
}
