/**
 * Auditoría por comparación (se pega en la consola con el juego en inglés y la pantalla a revisar visible):
 * cambia al español y vuelve, y lista los textos que NO cambian entre idiomas. Esos son nombres propios, números o textos
 * en español sin traducir. Devuelve la lista (sin duplicados) para revisarla a mano.
 */
(async () => {
  const { setLang, lang } = await import('/src/i18n.js');
  if (lang !== 'en') return ['(abre el juego en inglés primero)'];
  const collect = () => {
    const out = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      const p = n.parentElement;
      if (!p || ['SCRIPT', 'STYLE'].includes(p.tagName)) continue;
      out.set(n, n.nodeValue.replace(/\s+/g, ' ').trim());
    }
    for (const el of document.querySelectorAll('[aria-label],[alt],[title]')) {
      for (const a of ['aria-label', 'alt', 'title'])
        if (el.getAttribute(a)) out.set(`${a}:${out.size}`, { el, a, v: el.getAttribute(a) });
    }
    return out;
  };
  const en = collect();
  const attrEn = new Map([...en].filter(([k]) => typeof k === 'string').map(([k, v]) => [v.el + '|' + v.a, v.v]));
  setLang('es');
  await new Promise((r) => setTimeout(r, 150));
  const same = new Set();
  const allowed =
    /^(Lía|Jean|Juth|Don Dublón|Maela|Azhar|Tri|Vhorn|Thyes|Español|English|DAWN|SLIDE|DAWNSLIDE|Kogn|Sahrim|Ennari|Aluen|Normal|Menú?|Nivel|Zona|NORMAL|[IVX]+|[Ⅰ-Ⅻ]+|pts?|\d+.*)$/i;
  for (const [node, text] of en) {
    if (typeof node === 'string' || !node.isConnected) continue;
    const now = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (now === text && /[A-Za-zÁ-ú]{3,}/.test(text) && !allowed.test(text)) same.add(text);
  }
  for (const [k, v] of en) {
    if (typeof k !== 'string') continue;
    if (!v.el.isConnected) continue;
    const now = v.el.getAttribute(v.a);
    if (now === v.v && /[A-Za-zÁ-ú]{3,}/.test(v.v) && !allowed.test(v.v)) same.add(`[${v.a}] ${v.v}`);
  }
  setLang('en');
  void attrEn;
  return [...same];
})();
