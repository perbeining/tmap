// Oversættelser. Teksterne ligger i <sprog>.json – et nyt sprog kræver kun en ny fil
// og en linje i LANGS.
import da from './da.json';
import en from './en.json';

const LANGS = { da, en };
const STORAGE_KEY = 'tmap.lang';
let current = 'da';
const listeners = new Set();

function initialLang() {
  const param = new URLSearchParams(location.search).get('lang');
  if (param && LANGS[param]) return param;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS[saved]) return saved;
  } catch {
    /* ingen adgang til lager – brug browserens sprog */
  }
  const nav = (navigator.languages || [navigator.language || 'da']).map((l) => l.slice(0, 2));
  for (const l of nav) {
    if (l === 'da' || l === 'nb' || l === 'nn' || l === 'no' || l === 'sv') return 'da';
    if (LANGS[l]) return l;
  }
  return 'en';
}

export function getLang() {
  return current;
}

export function locale() {
  return current === 'da' ? 'da-DK' : 'en-GB';
}

export function t(key, params = {}) {
  const s = LANGS[current][key] ?? LANGS.da[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
}

/** Udfylder alle elementer med data-i18n, data-i18n-placeholder, -aria-label og -title. */
export function applyTranslations(root = document) {
  document.documentElement.lang = current;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of root.querySelectorAll('[data-i18n-aria-label]')) el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-content]')) el.setAttribute('content', t(el.dataset.i18nContent));
}

export function setLang(lang) {
  if (!LANGS[lang]) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignorer */
  }
  applyTranslations();
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn) {
  listeners.add(fn);
}

/** Kobler sprogknappen og sætter startsproget. */
export function initI18n() {
  current = initialLang();
  applyTranslations();
  const btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.addEventListener('click', () => setLang(current === 'da' ? 'en' : 'da'));
  }
}
