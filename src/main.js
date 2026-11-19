import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import './styles.css';

import { config } from './config.js';
import { applyTranslations, getLang, initI18n, locale, onLangChange, t } from './i18n/index.js';
import { hoursInfo, hoursReady, loadHoursLib } from './hours.js';
import {
  activeFilterCount,
  bearing,
  DEFAULT_FILTERS,
  distanceMeters,
  formatDistance,
  nearest,
  osmEditUrl,
  passesFilters,
  routeUrl,
} from './logic.js';

initI18n();

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
};

// ---------- tilstand ----------
const state = {
  toilets: [], // {id, lat, lon, ...properties}
  filters: { ...DEFAULT_FILTERS, categories: [...DEFAULT_FILTERS.categories] },
  origin: null, // {latlng:[lat,lon], kind:'position'|'search'|'map', label}
  view: 'map',
  listLimit: config.listPageSize,
  visible: [],
};
const wide = window.matchMedia('(min-width: 900px)');

// ---------- kort ----------
const map = L.map('map', {
  center: config.startCenter,
  zoom: config.startZoom,
  maxBounds: L.latLngBounds(config.bounds).pad(0.5),
  minZoom: 6,
  zoomControl: true,
  keyboard: true,
});
L.tileLayer(config.tileUrl, {
  maxZoom: config.tileMaxZoom,
  attribution: config.tileAttribution,
}).addTo(map);
map.attributionControl.setPrefix(false);
map.fitBounds(config.bounds);

const clusters = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  maxClusterRadius: 50,
  chunkedLoading: true,
  iconCreateFunction(cluster) {
    const n = cluster.getChildCount();
    const size = n < 10 ? 'sm' : n < 100 ? 'md' : 'lg';
    return L.divIcon({
      html: `<span>${n}</span>`,
      className: `cluster cluster-${size}`,
      iconSize: L.point(40, 40),
    });
  },
});
map.addLayer(clusters);

const ICON_SVG =
  '<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="M16 39s13-13.2 13-23A13 13 0 0 0 3 16c0 9.8 13 23 13 23z" class="pin"/><text x="16" y="20.5" text-anchor="middle" class="pin-text">WC</text></svg>';
const icons = {
  open: L.divIcon({ html: ICON_SVG, className: 'toilet-pin', iconSize: [32, 40], iconAnchor: [16, 39] }),
  closed: L.divIcon({ html: ICON_SVG, className: 'toilet-pin is-closed', iconSize: [32, 40], iconAnchor: [16, 39] }),
};

let userMarker = null;
const markers = new Map(); // toilet id -> L.Marker

function displayName(tl) {
  return tl.name || t('detail.unnamed');
}

function openLabel(info) {
  if (info.alwaysOpen) return t('open.alwaysOpen');
  if (info.state === 'open') return t('open.open');
  if (info.state === 'closed') return t('open.closed');
  return t('open.unknown');
}

function markerFor(tl) {
  let m = markers.get(tl.id);
  if (!m) {
    m = L.marker([tl.lat, tl.lon], { icon: icons.open, keyboard: true, riseOnHover: true });
    m.on('click', () => openDetail(tl));
    markers.set(tl.id, m);
  }
  const info = hoursInfo(tl, getLang());
  m.setIcon(info.state === 'closed' ? icons.closed : icons.open);
  const label = t('map.marker', { name: displayName(tl), open: openLabel(info) });
  m.options.title = label;
  const iconEl = m.getElement();
  if (iconEl) {
    iconEl.title = label;
    iconEl.setAttribute('aria-label', label);
  }
  return m;
}

// ---------- filtrering ----------
function computeVisible() {
  const lang = getLang();
  state.visible = state.toilets.filter((tl) =>
    passesFilters(tl, state.filters, hoursInfo(tl, lang).state),
  );
}

function refresh() {
  computeVisible();
  clusters.clearLayers();
  clusters.addLayers(state.visible.map(markerFor));
  updateStatus();
  updateFilterButton();
  renderList();
}

function updateStatus() {
  if (!state.toilets.length) return;
  const total = state.toilets.length;
  const shown = state.visible.length;
  $('status').textContent =
    shown === 1 ? t('status.countOne', { total }) : t('status.count', { shown, total });
}

function updateFilterButton() {
  const n = activeFilterCount(state.filters);
  $('filters-btn-label').textContent = n ? t('filters.buttonActive', { n }) : t('filters.button');
  $('filters-btn').classList.toggle('is-active', n > 0);
}

// ---------- liste (F6a) ----------
function currentOrigin() {
  if (state.origin && state.origin.kind !== 'map') return state.origin;
  const c = map.getCenter();
  return { latlng: [c.lat, c.lng], kind: 'map' };
}

function listIsShown() {
  return state.view === 'list' || wide.matches;
}

function renderList() {
  if (!listIsShown()) return;
  const origin = currentOrigin();
  const lang = getLang();
  const loc = locale();
  $('list-origin').textContent =
    origin.kind === 'position'
      ? t('list.fromPosition')
      : origin.kind === 'search'
        ? t('list.fromSearch', { place: origin.label })
        : t('list.fromMap');

  const items = nearest(state.visible, origin.latlng, state.listLimit);
  const ol = $('list-items');
  ol.replaceChildren();
  if (!items.length && state.toilets.length) {
    ol.append(el('li', { class: 'list-empty', text: t('list.empty') }));
  }
  for (const { t: tl, d } of items) {
    const info = hoursInfo(tl, lang);
    const openText = openLabel(info);
    const fee = feeLabel(tl);
    const btn = el(
      'button',
      { type: 'button', class: 'list-item' },
      el('span', { class: 'li-main' },
        el('span', { class: 'li-name', text: displayName(tl) }),
        el('span', { class: 'li-meta' },
          el('span', { class: `badge badge-${info.state}`, text: openText }),
          el('span', { class: `li-fee${tl.fee ? '' : ' is-unknown'}`, text: fee }),
        ),
      ),
      el('span', { class: 'li-dist' },
        el('span', { text: formatDistance(d, loc) }),
        el('span', { class: 'li-dir', text: t(`dir.${bearing(origin.latlng, [tl.lat, tl.lon])}`) }),
      ),
    );
    btn.setAttribute('aria-label', t('list.itemLabel', {
      name: displayName(tl),
      dist: formatDistance(d, loc),
      dir: t(`dirLong.${bearing(origin.latlng, [tl.lat, tl.lon])}`),
      open: openText,
      fee,
    }));
    btn.addEventListener('click', () => openDetail(tl));
    ol.append(el('li', {}, btn));
  }
  $('list-more').hidden = items.length < state.listLimit;
}

function feeLabel(tl) {
  if (tl.fee === 'no') return t('fee.free');
  if (tl.fee === 'yes') return tl.charge ? `${t('fee.paid')}: ${tl.charge}` : t('fee.paid');
  return t('fee.unknown');
}

$('list-more').addEventListener('click', () => {
  state.listLimit += config.listPageSize;
  renderList();
});

let moveTimer = null;
map.on('moveend', () => {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    if (!state.origin || state.origin.kind === 'map') {
      state.listLimit = config.listPageSize;
      renderList();
    }
  }, 250);
});

// ---------- visning: kort / liste ----------
function setView(view, { focus = false } = {}) {
  state.view = view;
  $('view-map').setAttribute('aria-pressed', String(view === 'map'));
  $('view-list').setAttribute('aria-pressed', String(view === 'list'));
  document.body.dataset.view = view;
  $('list').hidden = !listIsShown();
  $('map-view').hidden = !wide.matches && view === 'list';
  if (view === 'map') map.invalidateSize();
  renderList();
  if (focus && view === 'list') $('list').focus();
}
$('view-map').addEventListener('click', () => setView('map'));
$('view-list').addEventListener('click', () => setView('list'));
$('skip-to-list').addEventListener('click', (e) => {
  e.preventDefault();
  setView('list', { focus: true });
});
wide.addEventListener('change', () => setView(state.view));

// ---------- detaljer (F5, F6b) ----------
let lastFocus = null;

function fieldRow(dl, label, value, { unknown = false } = {}) {
  dl.append(el('dt', { text: label }), el('dd', { class: unknown ? 'is-unknown' : '', text: value }));
}

function yesNoText(v) {
  if (v === 'yes') return t('value.yes');
  if (v === 'no') return t('value.no');
  if (v === 'limited') return t('value.limited');
  return t('value.unknown');
}

function formatTime(date) {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const opts = sameDay ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat(locale(), opts).format(date);
}

function openDetail(tl) {
  lastFocus = document.activeElement;
  const lang = getLang();
  const info = hoursInfo(tl, lang);
  $('detail-title').textContent = displayName(tl);

  let summary = openLabel(info);
  if (info.next && info.state !== 'unknown') {
    summary += ` – ${t(info.state === 'open' ? 'open.closesAt' : 'open.opensAt', { time: formatTime(info.next) })}`;
  }
  const origin = state.origin && state.origin.kind !== 'map' ? state.origin : null;
  $('detail-summary').replaceChildren(
    el('span', { class: `badge badge-${info.state}`, text: summary }),
    el('span', { class: 'detail-fee', text: feeLabel(tl) }),
    origin
      ? el('span', {
          class: 'detail-dist',
          text: `${t('list.away', { d: formatDistance(distanceMeters(origin.latlng, [tl.lat, tl.lon]), locale()) })}, ${t('dir.label', { dir: t(`dirLong.${bearing(origin.latlng, [tl.lat, tl.lon])}`) })}`,
        })
      : null,
  );

  const dl = $('detail-fields');
  dl.replaceChildren();
  fieldRow(dl, t('detail.access'), t(`category.${tl.access_category || 'public'}`));
  if (tl.opening_hours) {
    const text = info.alwaysOpen ? t('open.alwaysOpen') : info.pretty || tl.opening_hours;
    fieldRow(dl, t('detail.hours'), text);
  } else {
    fieldRow(dl, t('detail.hours'), t('value.unknown'), { unknown: true });
  }
  fieldRow(dl, t('detail.price'), feeLabel(tl), { unknown: !tl.fee });
  if (tl.payment) {
    const methods = tl.payment.split(',').map((p) => (t(`pay.${p}`) === `pay.${p}` ? p.replaceAll('_', ' ') : t(`pay.${p}`)));
    fieldRow(dl, t('detail.payment'), methods.join(', '));
  }
  fieldRow(
    dl,
    t('detail.wheelchair'),
    yesNoText(tl.wheelchair) + (tl.wheelchair_description ? ` – ${tl.wheelchair_description}` : ''),
    { unknown: !tl.wheelchair },
  );
  fieldRow(dl, t('detail.changingTable'), yesNoText(tl.changing_table), { unknown: !tl.changing_table });
  fieldRow(
    dl,
    t('detail.key'),
    tl.key_required
      ? t(`key.${tl.key_required}`) + (tl.key_info ? ` (${tl.key_info === 'eurokey' ? t('key.eurokey') : tl.key_info})` : '')
      : t('value.unknown'),
    { unknown: !tl.key_required },
  );
  fieldRow(dl, t('detail.type'), tl.toilet_type ? t(`type.${tl.toilet_type}`) : t('value.unknown'), { unknown: !tl.toilet_type });
  if (tl.unisex) fieldRow(dl, t('detail.unisex'), yesNoText(tl.unisex));
  if (tl.description) fieldRow(dl, t('detail.description'), tl.description);
  if (tl.osm_check_date) {
    const cd = new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(new Date(tl.osm_check_date));
    fieldRow(dl, t('detail.checked'), t('detail.checkedOsm', { date: cd }));
  }
  const date = tl.osm_timestamp
    ? new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(new Date(tl.osm_timestamp))
    : null;
  fieldRow(dl, t('detail.source'), date ? t('detail.sourceOsm', { date }) : t('detail.sourceOsmNoDate'));

  const route = $('detail-route');
  route.href = routeUrl(tl.lat, tl.lon, navigator.userAgent);
  route.title = t('detail.routeHint');
  const edit = $('detail-edit');
  const editUrl = osmEditUrl(tl.osm_type, tl.osm_id);
  edit.hidden = !editUrl;
  if (editUrl) edit.href = editUrl;

  $('detail-map').onclick = () => {
    closeDialog($('detail'));
    setView('map');
    clusters.zoomToShowLayer(markerFor(tl), () => markerFor(tl).getElement()?.focus());
  };

  const dlg = $('detail');
  if (!dlg.open) dlg.showModal();
  $('detail-x').focus();
}

function closeDialog(dlg) {
  if (dlg.open) dlg.close();
}
$('detail-x').addEventListener('click', () => closeDialog($('detail')));
$('detail').addEventListener('close', () => lastFocus?.focus?.());
for (const dlg of [$('detail'), $('filters')]) {
  // Tryk uden for arket lukker det.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeDialog(dlg);
  });
}

// ---------- filtre (F4, F4a) ----------
const form = $('filters-form');
function syncFormFromState() {
  for (const name of ['openNow', 'free', 'wheelchair', 'changingTable', 'hideUnknown']) {
    form.elements[name].checked = state.filters[name];
  }
  for (const box of form.querySelectorAll('input[name="category"]')) {
    box.checked = state.filters.categories.includes(box.value);
  }
}
function readForm() {
  const f = {};
  for (const name of ['openNow', 'free', 'wheelchair', 'changingTable', 'hideUnknown']) {
    f[name] = form.elements[name].checked;
  }
  f.categories = [...form.querySelectorAll('input[name="category"]:checked')].map((b) => b.value);
  return f;
}
function updateFiltersStatus() {
  const s = $('filters-status');
  if (state.filters.openNow && !hoursReady()) s.textContent = t('filters.loadingHours');
  else s.textContent = $('status').textContent;
}
form.addEventListener('change', () => {
  state.filters = readForm();
  refresh();
  updateFiltersStatus();
});
$('filters-reset').addEventListener('click', () => {
  state.filters = { ...DEFAULT_FILTERS, categories: [...DEFAULT_FILTERS.categories] };
  syncFormFromState();
  refresh();
  updateFiltersStatus();
});
$('filters-btn').addEventListener('click', () => {
  lastFocus = $('filters-btn');
  syncFormFromState();
  updateFiltersStatus();
  $('filters').showModal();
});
$('filters-x').addEventListener('click', () => closeDialog($('filters')));
$('filters').addEventListener('close', () => $('filters-btn').focus());

// ---------- egen position (F2, F6) ----------
function setStatusMessage(msg) {
  $('status').textContent = msg;
}

$('locate-btn').addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    setStatusMessage(t('locate.unsupported'));
    return;
  }
  setStatusMessage(t('locate.locating'));
  $('locate-btn').setAttribute('aria-busy', 'true');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      $('locate-btn').removeAttribute('aria-busy');
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      state.origin = { latlng, kind: 'position' };
      if (!userMarker) {
        userMarker = L.circleMarker(latlng, {
          radius: 9, weight: 3, color: '#ffffff', fillColor: '#1a56db', fillOpacity: 1, interactive: false,
        }).addTo(map);
      } else userMarker.setLatLng(latlng);
      map.setView(latlng, Math.max(map.getZoom(), 15));
      state.listLimit = config.listPageSize;
      setStatusMessage(t('locate.found'));
      renderList();
      setTimeout(updateStatus, 2500);
    },
    (err) => {
      $('locate-btn').removeAttribute('aria-busy');
      setStatusMessage(err.code === err.PERMISSION_DENIED ? t('locate.denied') : t('locate.unavailable'));
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
});

// ---------- søgning (F3) ----------
let lastResults = [];
function chooseResult(r) {
  const label = r.name.split(',').slice(0, 2).join(',');
  state.origin = { latlng: [r.lat, r.lon], kind: 'search', label };
  state.listLimit = config.listPageSize;
  if (r.bbox && r.bbox.length === 4) {
    const [s, n, w, e] = r.bbox;
    map.fitBounds([[s, w], [n, e]], { maxZoom: 16 });
  } else {
    map.setView([r.lat, r.lon], 15);
  }
  if (map.getZoom() < 13) map.setZoom(13);
  $('search-results').replaceChildren();
  renderList();
}

$('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('search-input').value.trim();
  const out = $('search-results');
  if (q.length < 2) return;
  out.replaceChildren(el('p', { class: 'hint', text: t('search.searching') }));
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${getLang()}`);
    if (!res.ok) throw new Error(String(res.status));
    const { results } = await res.json();
    lastResults = results;
    if (!results.length) {
      out.replaceChildren(el('p', { class: 'hint', text: t('search.noResults', { q }) }));
      return;
    }
    if (results.length === 1) {
      chooseResult(results[0]);
      return;
    }
    const ul = el('ul', { class: 'result-list' });
    for (const r of results) {
      const b = el('button', { type: 'button', class: 'result', text: r.name });
      b.addEventListener('click', () => chooseResult(r));
      ul.append(el('li', {}, b));
    }
    const close = el('button', { type: 'button', class: 'link-btn', text: t('search.clear') });
    close.addEventListener('click', () => out.replaceChildren());
    out.replaceChildren(el('p', { class: 'hint', text: t('search.results', { n: results.length }) }), ul, close);
    ul.querySelector('button')?.focus();
  } catch {
    out.replaceChildren(el('p', { class: 'hint is-error', text: t('search.error') }));
  }
});

// ---------- sprogskift ----------
onLangChange(() => {
  applyTranslations();
  refresh();
  if ($('detail').open) closeDialog($('detail'));
  if (lastResults.length) $('search-results').replaceChildren();
});

// ---------- start ----------
async function loadToilets() {
  $('status').textContent = t('status.loading');
  try {
    const res = await fetch('/api/toilets', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    state.toilets = data.features.map((f) => ({
      ...f.properties,
      id: f.id ?? f.properties.id,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }));
    refresh();
  } catch {
    $('status').textContent = t('status.loadError');
  }
}

setView('map');
loadToilets().then(() => {
  // Åbningstider indlæses bagefter, så kortet er hurtigt brugbart på mobilnet.
  loadHoursLib()
    .then(() => {
      refresh();
      if ($('filters').open) updateFiltersStatus();
    })
    .catch(() => {});
});
