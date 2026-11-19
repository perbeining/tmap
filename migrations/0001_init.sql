-- ToiletKort: datamodel (kravdokumentets afsnit 6 og 7).
-- Feltnavne og værdier følger OpenStreetMap, hvor de findes.

CREATE TABLE toilets (
  id                     INTEGER PRIMARY KEY,
  source                 TEXT NOT NULL CHECK (source IN ('osm', 'municipality', 'user')),
  osm_type               TEXT CHECK (osm_type IN ('node', 'way', 'relation')),
  osm_id                 INTEGER,
  osm_version            INTEGER,
  osm_timestamp          TEXT,             -- seneste redigering i OSM
  lat                    REAL NOT NULL,
  lon                    REAL NOT NULL,
  name                   TEXT,             -- navn eller kort beskrivelse
  access_category        TEXT NOT NULL DEFAULT 'public'
                           CHECK (access_category IN ('public', 'customers', 'permission')),
  opening_hours          TEXT,             -- OSM opening_hours
  fee                    TEXT,             -- yes / no / NULL = ukendt
  charge                 TEXT,             -- pris, fx "5 DKK"
  payment                TEXT,             -- betalingsformer, kommasepareret (payment:*=yes)
  wheelchair             TEXT,             -- yes / limited / no / NULL
  wheelchair_description TEXT,
  changing_table         TEXT,             -- yes / no / limited / NULL
  key_required           TEXT,             -- no / key / code / NULL. Selve koden gemmes aldrig.
  key_info               TEXT,             -- hvor man får nøgle/kode, fx "Euronøgle"
  toilet_type            TEXT,             -- staffed / automatic / flush / pit_latrine / dry / NULL
  unisex                 TEXT,             -- yes / no / NULL (kønsneutralt)
  description            TEXT,             -- fri tekst
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'pending', 'temporarily_closed', 'removed')),
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  last_verified_at       TEXT,             -- sættes af indtjekninger i trin 3
  osm_seen_at            TEXT,             -- seneste import, hvor elementet fandtes i OSM
  UNIQUE (osm_type, osm_id)
);
CREATE INDEX toilets_status ON toilets (status);
CREATE INDEX toilets_latlon ON toilets (lat, lon);

-- De værdier, der sidst blev hentet fra OSM, pr. felt (flettereglerne i afsnit 7).
-- Ved næste import kan man se, om OSM har ændret et felt, som en bidragyder har rettet.
CREATE TABLE toilet_osm_values (
  toilet_id  INTEGER NOT NULL REFERENCES toilets (id) ON DELETE CASCADE,
  field      TEXT NOT NULL,
  value      TEXT,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (toilet_id, field)
);

-- Log over importer.
CREATE TABLE import_runs (
  id             INTEGER PRIMARY KEY,
  source         TEXT NOT NULL,
  started_at     TEXT NOT NULL,
  finished_at    TEXT,
  osm_base       TEXT,    -- Overpass' tidsstempel for datagrundlaget
  elements       INTEGER,
  imported       INTEGER,
  skipped        INTEGER,
  marked_removed INTEGER
);

-- Små nøgle/værdi-oplysninger, fx data_version, som bruges til cache.
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta (key, value) VALUES ('data_version', '0');
