import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transformElement } from '../scripts/osm-transform.mjs';
import { buildSql } from '../scripts/import-osm.mjs';

const node = (tags, extra = {}) => ({ type: 'node', id: 1, lat: 55.1, lon: 12.1, version: 3, timestamp: '2024-01-01T00:00:00Z', tags: { amenity: 'toilets', ...tags }, ...extra });

test('offentlige toiletter importeres, kunde-toiletter springes over', () => {
  assert.equal(transformElement(node({})).access_category, 'public');
  assert.equal(transformElement(node({ access: 'yes' })).access_category, 'public');
  assert.equal(transformElement(node({ access: 'permissive' })).access_category, 'public');
  assert.equal(transformElement(node({ access: 'customers' })), null);
  assert.equal(transformElement(node({ access: 'private' })), null);
});

test('felter oversættes til OSM-værdier og ukendt bliver null', () => {
  const r = transformElement(node({ fee: 'no', wheelchair: 'designated', changing_table: 'yes', centralkey: 'eurokey', 'payment:coins': 'yes', 'payment:mobilepay': 'yes', name: "Kiosk's" }));
  assert.equal(r.fee, 'no');
  assert.equal(r.wheelchair, 'yes');
  assert.equal(r.changing_table, 'yes');
  assert.equal(r.key_required, 'key');
  assert.equal(r.key_info, 'eurokey');
  assert.equal(r.payment, 'coins,mobilepay');
  const bare = transformElement(node({ fee: 'maybe' }));
  assert.equal(bare.fee, null);
  assert.equal(bare.wheelchair, null);
  assert.equal(bare.name, null);
});

test('veje bruger center-koordinat', () => {
  const r = transformElement({ type: 'way', id: 9, center: { lat: 56, lon: 10 }, tags: { amenity: 'toilets' } });
  assert.equal(r.lat, 56);
  assert.equal(r.osm_type, 'way');
});

test('SQL escaper anførselstegn og markerer ikke nedlagte ved få elementer', () => {
  const rows = [transformElement(node({ name: "Kiosk's" }))];
  const { text, removalNote } = buildSql(rows, { now: '2026-01-01T00:00:00Z', osmBase: null, elementCount: 1, skipped: 0 });
  assert.match(text, /'Kiosk''s'/);
  assert.doesNotMatch(text, /status = 'removed', updated_at/);
  assert.ok(removalNote);
});
