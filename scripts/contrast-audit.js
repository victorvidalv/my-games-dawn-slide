/**
 * Auditoría de contraste de texto (se pega en la consola del navegador con el juego abierto y la pantalla a revisar visible).
 *   · Calcula el color del texto y el fondo sólido efectivo (compone los fondos translúcidos de los ancestros).
 *   · Si el texto está sobre una imagen o degradado, avisa («sobre imagen»): ahí hace falta borde de tinta (text-shadow / -webkit-text-stroke).
 * Devuelve la lista de textos con contraste < 4.5 (< 3 si el texto es grande).
 */
(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const p = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const over = (top, bot) => {
    const a = top[3] + bot[3] * (1 - top[3]);
    return a ? [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a) : [0, 0, 0, 0];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.trim();
    const el = n.parentElement;
    if (!t || !el || seen.has(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (
      cs.visibility === 'hidden' ||
      cs.display === 'none' ||
      r.width < 2 ||
      r.height < 2 ||
      r.bottom < 0 ||
      r.top > innerHeight
    )
      continue;
    let hidden = false;
    let op = 1;
    let bg = [0, 0, 0, 0];
    let image = false;
    const chain = [];
    for (let e = el; e; e = e.parentElement) chain.push(e);
    for (const e of chain) {
      const s = getComputedStyle(e);
      op *= Number(s.opacity);
      if (s.display === 'none') hidden = true;
    }
    if (hidden || op < 0.05) continue;
    for (const e of chain.reverse()) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') image = true;
      bg = over(parse(s.backgroundColor), bg);
      if (bg[3] > 0.97 && s.backgroundImage === 'none') image = false;
    }
    seen.add(el);
    const base = bg[3] > 0 ? bg : [20, 20, 30, 1];
    // degradado propio más cercano: se toma la parada más desfavorable (colores opacos del degradado compuestos sobre el fondo)
    let stops = [];
    for (const e of chain.slice().reverse()) {
      const es = getComputedStyle(e);
      if (parse(es.backgroundColor)[3] > 0.9) break;
      const bi = es.backgroundImage;
      const layers = bi
        .split(/(?=(?:repeating-)?(?:linear|radial|conic)-gradient\()/)
        .filter((l) => l.startsWith('linear-gradient('));
      if (layers.length) {
        const found = layers
          .flatMap((l) => [...l.matchAll(/rgba?\([^)]+\)/g)])
          .map((m) => parse(m[0]))
          .filter((c) => c[3] > 0.6);
        if (found.length) {
          stops = found;
          break;
        }
      }
    }
    const fg = over([...parse(cs.color).slice(0, 3), parse(cs.color)[3] * op], base);
    if (stops.length) {
      const worst = stops.map((c) => over(c, base)).sort((a, b) => ratio(fg, a) - ratio(fg, b))[0];
      base[0] = worst[0];
      base[1] = worst[1];
      base[2] = worst[2];
      image = false;
    }
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.6 && bold) ? 3 : 4.5;
    const cr = ratio(fg, base);
    const stroke =
      parseFloat(cs.webkitTextStrokeWidth) > 0 ||
      (cs.textShadow !== 'none' && /rgba?\((\d+), (\d+), (\d+)/.test(cs.textShadow));
    if (cr < need && !(image && stroke))
      out.push({
        text: t.slice(0, 32),
        ratio: +cr.toFixed(2),
        need,
        image,
        el: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ')[0]}`,
        fg: cs.color,
        bg: `rgb(${base.slice(0, 3).map(Math.round)})`,
      });
    else if (image && !stroke && cr >= need)
      out.push({
        text: t.slice(0, 32),
        ratio: +cr.toFixed(2),
        need,
        image: true,
        note: 'sobre imagen sin borde',
        el: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ')[0]}`,
        fg: cs.color,
      });
  }
  return out;
})();
