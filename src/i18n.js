/**
 * Idiomas: inglés, español y chino (simplificado).
 *
 * El código y los datos del juego están escritos en español (idioma de origen). Los demás idiomas se aplican en el navegador
 * con un traductor de la interfaz: cada texto que aparece en pantalla (también los que el juego genera después: mensajes,
 * ventanas, etiquetas de accesibilidad) se busca en el diccionario del idioma activo. TODOS los textos de cada idioma están
 * centralizados en `src/i18n/<idioma>*.js`, con las mismas claves (el texto en español) en todos: añadir un idioma es añadir
 * un diccionario aquí, y `tests/i18n.test.js` comprueba que ninguno se deja una clave ni un marcador `{x}`.
 *   · Clave exacta:  'Pista': 'Hint'
 *   · Plantilla:     'Te quedan {n} turnos.': 'You have {n} turns left.'  ({x} captura cualquier trozo; si el trozo es un texto
 *                    conocido, como un nombre de ciudad, también se traduce; las plantillas con más texto fijo van primero)
 * Idioma inicial: el que eligió el jugador la última vez; si no hay elección, el del navegador (`navigator.languages`) cuando
 * es uno de los nuestros; si no, inglés.
 * Cambiar de idioma es instantáneo (no recarga la página, así la música no se corta): se restauran los textos originales y
 * se traduce de nuevo la pantalla, y se avisa con el evento `langchange` para que la interfaz repinte números y listas.
 */
import { EN } from './i18n/en.js';
import { ZH } from './i18n/zh.js';

const KEY = 'slideslay.lang';
export const LANGS = ['en', 'es', 'zh'];
/** Diccionario de cada idioma traducido (el español es el idioma de origen y no necesita ninguno). */
export const DICTS = { en: EN, zh: ZH };
/** Datos de cada idioma: etiqueta HTML (`lang`), formato de números y nombre propio para el selector. */
export const LANG_INFO = {
  en: { html: 'en', locale: 'en-US', name: 'English' },
  es: { html: 'es', locale: 'de-DE', name: 'Español' }, // de-DE: separador de miles con punto también por debajo de 10.000
  zh: { html: 'zh-Hans', locale: 'zh-CN', name: '中文' },
};
/** Idioma del juego que corresponde a una lista de preferencias del navegador («es-CL», «zh-TW», «ja»…), o inglés. */
export function detectLang(preferred = []) {
  for (const tag of preferred) {
    const base = String(tag || '')
      .toLowerCase()
      .split(/[-_]/)[0];
    if (LANGS.includes(base)) return base;
  }
  return 'en';
}
const stored = (() => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
})();
/* Solo en el navegador: en Node (tests, scripts) el idioma por defecto es siempre el inglés, sea cual sea el del sistema. */
const browser = (() => {
  try {
    return typeof document === 'undefined' || typeof navigator === 'undefined'
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  } catch {
    return [];
  }
})();
export let lang = LANGS.includes(stored) ? stored : detectLang(browser);
export const numLocale = () => LANG_INFO[lang].locale;

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
const unquote = (s) => s.replace(/^[“"「『]|[”"」』]$/g, '');
/** Índice de búsqueda de un diccionario: claves exactas + plantillas (las más específicas primero). Se construye una vez por idioma. */
function compile(dict) {
  const exact = new Map();
  const patterns = [];
  for (const [es, out] of Object.entries(dict)) {
    if (/\{\w+\}/.test(es)) {
      const names = [];
      const source = esc(norm(es)).replace(/\{(\w+)\}/g, (_, n) => {
        names.push(n);
        return '(.+?)';
      });
      patterns.push({ re: new RegExp(`^${source}$`), names, out, literal: norm(es).replace(/\{\w+\}/g, '').length });
    } else {
      exact.set(norm(es), out.trim());
      const quoted = norm(es).match(/^«(.+)»$/); // una frase entre «» también se reconoce sin las comillas (se cita dentro de otros textos)
      if (quoted) exact.set(quoted[1], unquote(out.trim()));
    }
  }
  patterns.sort((a, b) => b.literal - a.literal);
  return { exact, patterns, memo: new Map() };
}
const compiled = {};
const indexOf = (code) => (compiled[code] ||= compile(DICTS[code]));

/** Traduce un texto ya compuesto al idioma `to` (por defecto, el activo) o devuelve el mismo si no hay traducción. */
export function tr(text, to = lang) {
  if (!DICTS[to]) return text;
  const core = norm(text);
  if (!core || !/[A-Za-zÁ-ú]/.test(core)) return text;
  const { exact, patterns, memo } = indexOf(to);
  if (memo.has(core)) return memo.get(core);
  let out = exact.get(core);
  if (out === undefined) {
    for (const p of patterns) {
      const m = core.match(p.re);
      if (!m) continue;
      const vars = Object.fromEntries(p.names.map((n, i) => [n, tr(m[i + 1], to)]));
      out = p.out.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '');
      break;
    }
  }
  if (out === undefined) out = core;
  if (memo.size > 4000) memo.clear();
  memo.set(core, out);
  return out;
}
/** Para textos de JavaScript que no pasan por el DOM (títulos, avisos). */
export const t = tr;

const ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
const written = new Map(); // nodo de texto → { es, en }: lo que había y lo que escribimos (para restaurar y no re-traducir lo nuestro)
const attrWritten = new Map(); // elemento → { atributo: { es, en } }

function textNode(node) {
  const value = node.nodeValue;
  const rec = written.get(node);
  if (rec && rec.en === value) return;
  const lead = value.match(/^\s*/)[0];
  const trail = value.match(/\s*$/)[0];
  const out = tr(value);
  if (out === value || out === norm(value)) {
    if (rec) written.delete(node);
    return;
  }
  const next = lead + out + trail;
  written.set(node, { es: value, en: next });
  node.nodeValue = next;
}
function attrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (!v) continue;
    const rec = attrWritten.get(el)?.[a];
    if (rec && rec.en === v) continue;
    const out = tr(v);
    if (out === v) continue;
    attrWritten.set(el, { ...attrWritten.get(el), [a]: { es: v, en: out } });
    el.setAttribute(a, out);
  }
}
function walk(root) {
  if (root.nodeType === 3) {
    textNode(root);
    return;
  }
  if (root.nodeType !== 1) return;
  if (root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  attrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) textNode(n);
    else if (n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') attrs(n);
  }
}
/** Deja cada texto escrito por nosotros como estaba (español) y olvida el resto. */
function restore() {
  for (const [node, rec] of written) if (node.isConnected && node.nodeValue === rec.en) node.nodeValue = rec.es;
  for (const [el, map] of attrWritten) {
    if (!el.isConnected) continue;
    for (const [a, rec] of Object.entries(map)) if (el.getAttribute(a) === rec.en) el.setAttribute(a, rec.es);
  }
  written.clear();
  attrWritten.clear();
}

const OPTIONS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
let observer = null;
function startTranslating() {
  document.documentElement.lang = LANG_INFO[lang].html;
  walk(document.body);
  if (observer) return;
  observer = new MutationObserver((records) => {
    observer.disconnect();
    for (const r of records) {
      if (r.type === 'characterData') textNode(r.target);
      else if (r.type === 'attributes') attrs(r.target);
      else r.addedNodes.forEach(walk);
    }
    if (written.size > 6000) for (const n of written.keys()) if (!n.isConnected) written.delete(n);
    observer.observe(document.body, OPTIONS);
  });
  observer.observe(document.body, OPTIONS);
}
function stopTranslating() {
  observer?.disconnect();
  observer = null;
  restore();
  document.documentElement.lang = 'es';
}

/** Cambia de idioma al instante: guarda la elección, retraduce la pantalla y avisa a la interfaz (`langchange`). */
export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
  stopTranslating(); // vuelve al español de origen y, si toca, traduce desde ahí al idioma nuevo
  if (DICTS[lang]) startTranslating();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

if (typeof document !== 'undefined') {
  const start = () => {
    if (DICTS[lang]) startTranslating();
    else document.documentElement.lang = 'es';
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
}
