import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeFilterCount, DEFAULT_FILTERS, distanceMeters, formatDistance, nearest, osmEditUrl, passesFilters, routeUrl } from '../src/logic.js';

const f = (o = {}) => ({ ...DEFAULT_FILTERS, categories: ['public'], ...o });

test('standard: kun offentlige vises', () => {
  assert.equal(passesFilters({ access_category: 'public' }, f()), true);
  assert.equal(passesFilters({ access_category: 'customers' }, f()), false);
  assert.equal(passesFilters({ access_category: 'customers' }, f({ categories: ['public', 'customers'] })), true);
});

test('F4a: ukendt værdi skjules ikke af et filter', () => {
  assert.equal(passesFilters({ access_category: 'public' }, f({ free: true })), true);
  assert.equal(passesFilters({ access_category: 'public', fee: 'no' }, f({ free: true })), true);
  assert.equal(passesFilters({ access_category: 'public', fee: 'yes' }, f({ free: true })), false);
});

test('F4a: brugeren kan skjule ukendte', () => {
  assert.equal(passesFilters({ access_category: 'public' }, f({ free: true, hideUnknown: true })), false);
  assert.equal(passesFilters({ access_category: 'public', fee: 'no' }, f({ free: true, hideUnknown: true })), true);
  // hideUnknown alene gør intet, når intet filter er slået til
  assert.equal(passesFilters({ access_category: 'public' }, f({ hideUnknown: true })), true);
});

test('handicap: delvist tæller som match, nej skjules', () => {
  assert.equal(passesFilters({ wheelchair: 'limited' }, f({ wheelchair: true })), true);
  assert.equal(passesFilters({ wheelchair: 'no' }, f({ wheelchair: true })), false);
});

test('åbent nu bruger den beregnede tilstand', () => {
  assert.equal(passesFilters({}, f({ openNow: true }), 'open'), true);
  assert.equal(passesFilters({}, f({ openNow: true }), 'closed'), false);
  assert.equal(passesFilters({}, f({ openNow: true }), 'unknown'), true);
  assert.equal(passesFilters({}, f({ openNow: true, hideUnknown: true }), 'unknown'), false);
});

test('antal aktive filtre', () => {
  assert.equal(activeFilterCount(f()), 0);
  assert.equal(activeFilterCount(f({ free: true, categories: ['public', 'customers'] })), 2);
});

test('afstand og formatering', () => {
  const d = distanceMeters([55.6761, 12.5683], [56.1629, 10.2039]); // København–Aarhus ca. 157 km
  assert.ok(d > 150000 && d < 165000);
  assert.equal(formatDistance(340, 'da-DK'), '340 m');
  assert.equal(formatDistance(1234, 'da-DK'), '1,2 km');
  assert.equal(formatDistance(1234, 'en-GB'), '1.2 km');
});

test('nærmeste sorteres efter afstand', () => {
  const ts = [{ lat: 55.7, lon: 12.6 }, { lat: 55.68, lon: 12.57 }, { lat: 56, lon: 10 }];
  const r = nearest(ts, [55.6761, 12.5683], 2);
  assert.deepEqual(r.map((x) => x.t), [ts[1], ts[0]]);
});

test('links', () => {
  assert.match(routeUrl(55, 12, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), /^https:\/\/maps\.apple\.com\/\?daddr=55,12/);
  assert.match(routeUrl(55, 12, 'Mozilla/5.0 (Linux; Android 15)'), /^https:\/\/www\.google\.com\/maps\/dir\//);
  assert.equal(osmEditUrl('node', 123), 'https://www.openstreetmap.org/edit?node=123');
  assert.equal(osmEditUrl(null, null), null);
});
