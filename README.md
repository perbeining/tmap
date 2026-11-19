# ToiletKort (TMap)

Et gratis, åbent kort over offentlige toiletter i Danmark, bygget på OpenStreetMap.
Kravene står i [docs/krav.md](docs/krav.md). Dette repo indeholder **trin 1: kortet**.

- I luften: https://tmap-b25.pages.dev
- Kommende adresse: https://tmap.beining.dk (venter på en DNS-post, se "Det mangler" nedenfor)

## Hvad trin 1 kan

| Krav | Hvad |
|---|---|
| F1 | Kort med markører, samlet i klynger, når man zoomer ud |
| F2 | "Min position" centrerer kortet (kun hvis man giver lov) |
| F3 | Søgning på adresse eller by (Nominatim, begrænset til Danmark) |
| F4, F4a | Filtre: åbent nu, gratis, handicapadgang, puslebord, adgangskategori. Ukendte værdier vises, med mindre man vælger "Skjul ukendte" |
| F4b | Åbningstider læses med biblioteket [opening_hours.js](https://github.com/opening-hours/opening_hours.js) |
| F5 | Tryk på en markør viser oplysninger og et link til rutevejledning i telefonens kort-app |
| F6 | Ingen konto, og man behøver ikke dele sin position |
| F6a | Liste over de nærmeste toiletter med afstand, retning, åbent/lukket og pris |
| F6b | "Ret på OpenStreetMap" ved hvert toilet |
| Afsnit 4 | Dansk og engelsk. Teksterne ligger i `src/i18n/*.json`. Kan lægges på hjemmeskærmen (web-manifest) |
| Afsnit 7 | Synlig kreditering af OpenStreetMap, siden `/om` med licens (ODbL), privatliv og download af hele datasættet |
| Afsnit 8 | Ingen cookies. Positionen bliver i browseren. Søgninger går gennem vores server, så brugerens IP ikke sendes videre |

## Opbygning

```
index.html, om.html     Sider (Vite bygger dem til dist/)
src/                    Frontend: Leaflet + markercluster, ren JavaScript
  i18n/da.json, en.json Alle tekster. Nyt sprog = ny fil + én linje i i18n/index.js
  config.js             Kortleverandør, startvisning, kontaktlink. Ingen af sidens egne adresser
  logic.js              Filtre, afstand, links (testet)
  hours.js              Åbningstider (indlæses efter kortet)
functions/              Cloudflare Pages Functions (serverkode)
  _middleware.js        Sikkerhedsheadere (CSP m.m.) og omdirigering til CANONICAL_HOST
  api/toilets.js        Alle toiletter som GeoJSON, cachet pr. dataversion
  api/search.js         Adressesøgning via Nominatim
migrations/             D1-skema (afsnit 6 og 7)
scripts/import-osm.mjs  Import fra Overpass. Kan køres igen og igen
test/                   Enhedstests (node --test)
```

**Hosting:** Cloudflare Pages med Functions og D1 (database `tmap`). Pages er valgt frem for Workers,
fordi beining.dk's DNS ligger hos QuickDNS og ikke hos Cloudflare: Pages kan få et eget domæne
via en CNAME hos en ekstern DNS-udbyder, det kan Workers ikke. Det er samme opsætning som www.beining.dk.

**Klar til trin 2:** Der er et byggetrin med npm (Vite), og Pages Functions bundler npm-pakker,
så Better Auth kan lægges i `functions/` med D1 som database. Datamodellen har allerede
OpenStreetMap-ID, kilde, status, datoer og tabellen `toilet_osm_values` med de sidst hentede værdier pr. felt,
som flettereglerne i afsnit 7 skal bruge.

## Kom i gang lokalt

```bash
npm install
npm run db:migrate:local
npm run import:local          # henter fra Overpass og fylder den lokale database
npm run build
npx wrangler pages dev dist   # http://localhost:8788
npm test
```

## Opdatér data fra OpenStreetMap

```bash
npm run import:remote
```

Scriptet prøver flere Overpass-servere med pause imellem, hvis de er optaget. Det:

- opdaterer toiletter efter OpenStreetMap-ID og opretter nye
- gemmer de hentede værdier pr. felt i `toilet_osm_values`
- markerer toiletter, der er forsvundet fra OpenStreetMap, som `removed` (kun hvis svaret har mindst 2000 elementer, så et halvt svar ikke sletter noget)
- springer toiletter med `access=customers/private/no/...` over. De kommer først ind via brugerne (afsnit 3)

Udtrækket gemmes i `data/overpass.json`, og `--from-file data/overpass.json` genbruger det.

## Udrul

```bash
npm run deploy
```

Skemaændringer: `npm run db:migrate:remote` før udrulning.

## Skift til tmap.dk senere

Intet i koden skal ændres:

1. Tilføj `tmap.dk` som custom domain på Pages-projektet `tmap` (Cloudflare → Workers & Pages → tmap → Custom domains).
2. Sæt miljøvariablen `CANONICAL_HOST` til `tmap.dk` (i `wrangler.jsonc` eller i Cloudflare). Så sendes alle andre adresser, også tmap.beining.dk, videre med 301. Adresser på `*.pages.dev` og localhost sendes ikke videre.

## Valg truffet undervejs

Hvor kravene ikke gav svar, er det enkleste valg taget, som ikke lukker for trin 2 og 3:

1. **Cloudflare Pages i stedet for Workers** på grund af DNS hos QuickDNS (se ovenfor). Projektet hedder `tmap-b25.pages.dev`, fordi `tmap.pages.dev` var optaget.
2. **Hvad er "offentligt" i OSM:** intet `access`-tag, eller `access=yes/public/permissive`. 4.438 af 4.775 toiletter er med.
3. **Alle toiletter hentes på én gang** (ca. 190 KB komprimeret) og filtreres i browseren. Det er hurtigst ved ca. 4.400 toiletter og giver et offline-venligt grundlag. Skal genovervejes ved mange flere.
4. **Åbningstider indlæses efter kortet**, fordi biblioteket fylder 111 KB komprimeret. Indtil da står de som ukendt.
5. **Kortbilleder fra openstreetmap.org** (raster). Simpelt og gratis ved lav trafik. Skiftes i `src/config.js`, hvis trafikken vokser.
6. **Søgning går gennem vores server** til Nominatim, så brugerens IP ikke sendes videre, og svar caches i et døgn.
7. **Navne:** kun 48 toiletter har et navn i OSM. Resten hedder "Offentligt toilet", og listen viser retning (fx "200 m mod nord") for at skelne dem.
8. **"Sidst bekræftet" (F17)** vises i trin 1 som OSM's `check_date` ("Kontrolleret … af en OpenStreetMap-kortlægger") og datoen for seneste ændring i OSM. `last_verified_at` er reserveret til indtjekninger i trin 3.
9. **"Ikke bekræftet for nylig" (F18)** er ikke bygget. Det giver først mening med indtjekninger i trin 3.
10. **Rene pissoirer** (`toilets:position=urinal`) vises med typen "Kun pissoir".
11. **Rutelink:** Apple Kort på iPhone/iPad, ellers Google Maps, til fods.
12. **Sprog:** browserens sprog bestemmer (dansk, norsk og svensk giver dansk, alt andet engelsk). Valget gemmes i `localStorage`, ikke i en cookie.
13. **Kontakt** på siden `/om` linker til kontaktsiden på www.beining.dk. Ingen e-mailadresse er lagt på siden.
14. **Felterne for dørkode:** kun `key_required` og `key_info` (fx Euronøgle). Selve koden har ingen kolonne.
15. **Planlagt import:** importen køres manuelt. Et automatisk ugentligt job er ikke bygget endnu.
16. **Kodens licens** er sat til MIT. Ret `LICENSE`, hvis du vil have en anden.

## Det mangler (skal gøres af ejeren)

1. **DNS-post hos QuickDNS** for at få tmap.beining.dk i luften. Opret:

   | Type | Navn | Værdi |
   |---|---|---|
   | CNAME | `tmap` | `tmap-b25.pages.dev` |

   Domænet er allerede knyttet til Pages-projektet og står som "afventer". Cloudflare udsteder selv
   certifikatet, når posten er på plads (typisk inden for en time). Status kan ses i
   Cloudflare → Workers & Pages → tmap → Custom domains.
2. **Kontaktadresse:** beslut om `/om` skal have en egen mailadresse (ret `contactUrl` i `src/config.js`).
3. **Sikkerhedskopi (afsnit 9):** D1 har Time Travel (30 dages gendannelse) indbygget. Et eksport-job er ikke sat op.

## Licens

Koden: MIT. Data: © OpenStreetMap-bidragydere, [ODbL](https://opendatacommons.org/licenses/odbl/).
Projektets samlede datasæt kan hentes på `/api/toilets?download=1` under samme licens.
