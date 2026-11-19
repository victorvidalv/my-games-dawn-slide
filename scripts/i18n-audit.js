/**
 * Auditoría de traducción (se pega en la consola del navegador con el juego en inglés): lista los textos que siguen en español
 * (texto visible o atributos de accesibilidad) para añadirlos a src/i18n/en*.js.
 */
(() => {
  const spanish =
    /[áéíóúñ¿¡Á-Ú]|\b(el|la|los|las|de|del|un|una|tu|tus|que|con|para|por|se|te|al|nivel|niveles|pista|turnos?|puntos?|tienda|elige|volver|siguiente|jugar|salir|héroe|camino|tablero|pieza|movimiento|llave|sello|aventura|partida|ahora|aquí|cada|más|sin|ya|como|pero|este|esta|todo|hasta)\b/i;
  const allowed =
    /^(Lía|Jean|Juth|Don Dublón|Maela|Azhar|Tri|Vhorn|Thyes|Español|English|DAWN|SLIDE|DAWNSLIDE|Kogn|Sahrim|Ennari|Aluen)$/;
  const out = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const p = n.parentElement;
    if (!p || ['SCRIPT', 'STYLE'].includes(p.tagName)) continue;
    const t = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (t.length < 2 || allowed.test(t) || !/[A-Za-zÁ-ú]/.test(t)) continue;
    if (spanish.test(t)) out.add(t);
  }
  for (const el of document.querySelectorAll('[aria-label],[alt],[title],[placeholder]')) {
    for (const a of ['aria-label', 'alt', 'title', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v && spanish.test(v) && !/^Language/.test(v)) out.add(`[${a}] ${v}`);
    }
  }
  return [...out];
})();
