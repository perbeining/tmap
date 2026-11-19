#!/usr/bin/env node
// Henter alle toiletter (amenity=toilets) i Danmark fra Overpass og lægger dem i D1.
// Kan køres igen og igen: eksisterende toiletter opdateres via OSM-ID, nye oprettes,
// og toiletter, der er forsvundet fra OSM, markeres som nedlagt.
//
// Brug:
//   node scripts/import-osm.mjs --local            # lokal D1 (wrangler dev)
//   node scripts/import-osm.mjs --remote           # D1 på Cloudflare
//   node scripts/import-osm.mjs --remote --from-file data/overpass.json   # genbrug et tidligere udtræk
//   node scripts/import-osm.mjs --sql-only         # skriv kun SQL-filen, kør den ikke

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OSM_FIELDS, transformElement } from './osm-transform.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const DB_NAME = 'tmap';

// Offentlige Overpass-servere. Den første, der svarer, bruges.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="DK"][admin_level=2]->.dk;
nwr["amenity"="toilets"](area.dk);
out center meta;`;

// Sikkerhedsgrænse: færre elementer end dette tyder på et ufuldstændigt svar,
// og så markeres intet som nedlagt.
const MIN_ELEMENTS_FOR_REMOVAL = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass() {
  let wait = 5000;
  for (let attempt = 1; attempt <= 4; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        console.log(`Henter fra ${url} (forsøg ${attempt}) ...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'ToiletKort-import/0.1 (https://github.com/perbeining/tmap)',
          },
          body: new URLSearchParams({ data: QUERY }),
          signal: AbortSignal.timeout(240_000),
        });
        if (!res.ok) {
          console.log(`  svarede ${res.status}`);
          continue;
        }
        const json = await res.json();
        if (!Array.isArray(json.elements)) throw new Error('svar uden elements');
        if (json.remark) console.log(`  bemærkning fra Overpass: ${json.remark}`);
        if (json.remark && /runtime error|timed out/i.test(json.remark)) continue;
        return json;
      } catch (err) {
        console.log(`  fejl: ${err.message}`);
      }
    }
    console.log(`Venter ${wait / 1000} s før næste runde ...`);
    await sleep(wait);
    wait *= 2;
  }
  throw new Error('Ingen Overpass-server svarede. Prøv igen senere.');
}

const sql = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replaceAll("'", "''")}'`;
};

export function buildSql(rows, { now, osmBase, elementCount, skipped }) {
  const out = [];
  out.push(
    `INSERT INTO import_runs (source, started_at, osm_base, elements, imported, skipped) VALUES ('osm', ${sql(now)}, ${sql(osmBase)}, ${elementCount}, ${rows.length}, ${skipped});`,
  );

  const cols = ['source', 'osm_type', 'osm_id', 'osm_version', 'osm_timestamp', 'osm_check_date', 'lat', 'lon', ...OSM_FIELDS, 'status', 'created_at', 'updated_at', 'osm_seen_at'];
  // Felter, der følger OSM. I trin 2 skal felter, som en bidragyder har rettet, undtages her
  // (se flettereglerne i docs/krav.md afsnit 7) – toilet_osm_values gør forskellen synlig.
  const followOsm = ['osm_version', 'osm_timestamp', 'osm_check_date', 'lat', 'lon', ...OSM_FIELDS];

  for (const r of rows) {
    const values = {
      ...r,
      source: 'osm',
      status: 'active',
      created_at: now,
      updated_at: now,
      osm_seen_at: now,
    };
    out.push(
      `INSERT INTO toilets (${cols.join(', ')}) VALUES (${cols.map((c) => sql(values[c])).join(', ')})\n` +
        `  ON CONFLICT (osm_type, osm_id) DO UPDATE SET ` +
        followOsm.map((c) => `${c} = excluded.${c}`).join(', ') +
        `, updated_at = CASE WHEN toilets.osm_version IS excluded.osm_version AND toilets.status = 'active' THEN toilets.updated_at ELSE excluded.updated_at END` +
        `, status = CASE WHEN toilets.status = 'removed' THEN 'active' ELSE toilets.status END` +
        `, osm_seen_at = excluded.osm_seen_at;`,
    );
    const pairs = OSM_FIELDS.map((f) => `(${sql(f)}, ${sql(r[f])})`).join(', ');
    out.push(
      `INSERT INTO toilet_osm_values (toilet_id, field, value, fetched_at)\n` +
        `  SELECT t.id, v.column1, v.column2, ${sql(now)} FROM toilets t, (VALUES ${pairs}) v\n` +
        `  WHERE t.osm_type = ${sql(r.osm_type)} AND t.osm_id = ${r.osm_id}\n` +
        `  ON CONFLICT (toilet_id, field) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at;`,
    );
  }

  let removalNote = '';
  if (elementCount >= MIN_ELEMENTS_FOR_REMOVAL) {
    // Trin 2: toiletter, som bidragydere har rettet eller tjekket ind på, skal i stedet i moderatorernes kø.
    out.push(
      `UPDATE toilets SET status = 'removed', updated_at = ${sql(now)} WHERE source = 'osm' AND status != 'removed' AND (osm_seen_at IS NULL OR osm_seen_at < ${sql(now)});`,
    );
  } else {
    removalNote = `Kun ${elementCount} elementer – intet markeres som nedlagt.`;
  }
  out.push(
    `UPDATE import_runs SET finished_at = ${sql(new Date().toISOString())}, marked_removed = (SELECT COUNT(*) FROM toilets WHERE status = 'removed' AND updated_at = ${sql(now)}) WHERE started_at = ${sql(now)};`,
  );
  out.push(`UPDATE meta SET value = ${sql(now)} WHERE key = 'data_version';`);
  return { text: out.join('\n') + '\n', removalNote };
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.includes('--remote') ? '--remote' : args.includes('--local') ? '--local' : null;
  const sqlOnly = args.includes('--sql-only');
  const fromFileIdx = args.indexOf('--from-file');
  const fromFile = fromFileIdx >= 0 ? args[fromFileIdx + 1] : null;
  if (!target && !sqlOnly) {
    console.error('Angiv --local, --remote eller --sql-only');
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  let data;
  if (fromFile) {
    data = JSON.parse(readFileSync(fromFile, 'utf8'));
    console.log(`Læste ${data.elements.length} elementer fra ${fromFile}`);
  } else {
    data = await fetchOverpass();
    const rawPath = join(DATA_DIR, 'overpass.json');
    writeFileSync(rawPath, JSON.stringify(data));
    console.log(`Hentede ${data.elements.length} elementer (OSM-data fra ${data.osm3s?.timestamp_osm_base}). Gemt i ${rawPath}`);
  }

  const rows = [];
  const seen = new Set();
  let skipped = 0;
  for (const el of data.elements) {
    const row = transformElement(el);
    const key = row && `${row.osm_type}/${row.osm_id}`;
    if (!row || seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    rows.push(row);
  }
  console.log(`${rows.length} offentlige toiletter, ${skipped} sprunget over (fx kun for kunder eller private).`);

  const now = new Date().toISOString();
  const { text, removalNote } = buildSql(rows, {
    now,
    osmBase: data.osm3s?.timestamp_osm_base ?? null,
    elementCount: data.elements.length,
    skipped,
  });
  if (removalNote) console.log(removalNote);
  const sqlPath = join(DATA_DIR, 'import.sql');
  writeFileSync(sqlPath, text);
  console.log(`SQL skrevet til ${sqlPath} (${(text.length / 1024).toFixed(0)} KB)`);
  if (sqlOnly) return;

  console.log(`Kører importen mod D1 (${target}) ...`);
  execFileSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, target, '--file', sqlPath, '--yes'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  console.log('Import færdig.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
