// Indstillinger for siden. Ingen af sidens egne adresser står her: alle links er relative,
// så siden virker uændret på tmap.beining.dk, tmap.dk eller en *.pages.dev-adresse.

export const config = {
  // Kortbilleder. Skift her, hvis der senere skal bruges en anden kortleverandør
  // (husk så også img-src i functions/_middleware.js).
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragydere',
  tileMaxZoom: 19,

  // Startvisning: hele Danmark.
  startCenter: [56.0, 10.6],
  startZoom: 7,
  bounds: [[54.4, 7.7], [57.9, 15.4]],

  // Antal toiletter i listen ad gangen.
  listPageSize: 25,

  // Kontakt og kildekode (vises på siden "Om").
  contactUrl: 'https://www.beining.dk/#contact',
  sourceUrl: 'https://github.com/perbeining/tmap',
};
