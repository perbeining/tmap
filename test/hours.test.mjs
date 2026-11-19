import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hoursInfo, loadHoursLib } from '../src/hours.js';

const tl = (opening_hours, id = opening_hours) => ({ id, lat: 55.68, lon: 12.57, opening_hours });

test('åbningstider: åben, lukket, ukendt og døgnåbent uden at hænge', async () => {
  await loadHoursLib();
  const wed10 = new Date('2026-11-18T10:00:00+01:00');
  const wed23 = new Date('2026-11-18T23:00:00+01:00');
  assert.equal(hoursInfo(tl('Mo-Su 08:00-20:00'), 'da', wed10).state, 'open');
  assert.equal(hoursInfo(tl('Mo-Su 08:00-20:00'), 'da', wed23).state, 'closed');
  assert.equal(hoursInfo(tl(undefined), 'da', wed10).state, 'unknown');
  assert.equal(hoursInfo(tl('noget vrøvl'), 'da', wed10).state, 'unknown');
  assert.equal(hoursInfo(tl('24/7'), 'da', wed10).alwaysOpen, true);
  const t0 = Date.now();
  assert.equal(hoursInfo(tl('Mo-Su,PH 00:00-24:00'), 'da', wed10).state, 'open'); // hang før rettelsen
  assert.ok(Date.now() - t0 < 2000);
});
