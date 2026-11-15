/**
 * Idiomas: inglés (por defecto) y español.
 *
 * El código y los datos del juego están escritos en español (idioma de origen); el inglés se aplica en el navegador con un
 * traductor de la interfaz: cada texto que aparece en pantalla (también los que el juego genera después: mensajes, ventanas,
 * etiquetas de accesibilidad) se busca en el diccionario `src/i18n/en*.js`.
 *   · Clave exacta:  'Pista': 'Hint'
 *   · Plantilla:     'Te quedan {n} turnos.': 'You have {n} turns left.'  ({x} captura cualquier trozo; si el trozo es un texto
 *                    conocido, como un nombre de ciudad, también se traduce; las plantillas con más texto fijo van primero)
 * Cambiar de idioma es instantáneo (no recarga la página, así la música no se corta): se restauran los textos originales o se
 * traduce de nuevo la pantalla, y se avisa con el evento `langchange` para que la interfaz repinte números y listas.
 */
import { EN } from './i18n/en.js';

const KEY = 'slideslay.lang';
export const LANGS = ['en', 'es'];
const stored = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
export let lang = LANGS.includes(stored) ? stored : 'en';
export let isEnglish = lang === 'en';
export const numLocale = () => (isEnglish ? 'en-US' : 'de-DE');

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const exact = new Map();
const patterns = [];
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
for (const [es, en] of Object.entries(EN)) {
  if (/\{\w+\}/.test(es)) {
    const names = [];
    const source = esc(norm(es)).replace(/\{(\w+)\}/g, (_, n) => { names.push(n); return '(.+?)'; });
    patterns.push({ re: new RegExp(`^${source}$`), names, en, literal: norm(es).replace(/\{\w+\}/g, '').length });
  } else {
    exact.set(norm(es), en.trim());
    const quoted = norm(es).match(/^«(.+)»$/);   // una frase entre «» también se reconoce sin las comillas (se cita dentro de otros textos)
    if (quoted) exact.set(quoted[1], en.trim().replace(/^[“"]|[”"]$/g, ''));
  }
}
patterns.sort((a, b) => b.literal - a.literal);   // las plantillas más específicas se prueban primero
const memo = new Map();

/** Traduce un texto ya compuesto (o devuelve el mismo si no hay traducción). */
export function tr(text) {
  if (!isEnglish) return text;
  const core = norm(text);
  if (!core || !/[A-Za-zÁ-ú]/.test(core)) return text;
  if (memo.has(core)) return memo.get(core);
  let out = exact.get(core);
  if (out === undefined) {
    for (const p of patterns) {
      const m = core.match(p.re);
      if (!m) continue;
      const vars = Object.fromEntries(p.names.map((n, i) => [n, tr(m[i + 1])]));
      out = p.en.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '');
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
const written = new Map();       // nodo de texto → { es, en }: lo que había y lo que escribimos (para restaurar y no re-traducir lo nuestro)
const attrWritten = new Map();   // elemento → { atributo: { es, en } }

function textNode(node) {
  const value = node.nodeValue;
  const rec = written.get(node);
  if (rec && rec.en === value) return;
  const lead = value.match(/^\s*/)[0];
  const trail = value.match(/\s*$/)[0];
  const out = tr(value);
  if (out === value || out === norm(value)) { if (rec) written.delete(node); return; }
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
  if (root.nodeType === 3) { textNode(root); return; }
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
  document.documentElement.lang = 'en';
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
  isEnglish = next === 'en';
  try { localStorage.setItem(KEY, next); } catch { /* sin almacenamiento: no se recuerda */ }
  memo.clear();
  if (isEnglish) startTranslating(); else stopTranslating();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

if (typeof document !== 'undefined') {
  const start = () => { if (isEnglish) startTranslating(); else document.documentElement.lang = 'es'; };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
