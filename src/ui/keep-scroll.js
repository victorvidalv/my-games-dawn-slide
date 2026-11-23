/**
 * Conserva el desplazamiento al repintar un panel con innerHTML (equipar, marcar novedades…): sin esto el navegador del
 * móvil volvía arriba y todo parecía recargarse.
 */
export function snapScroll(box) {
  const scrolls = (root) =>
    [...root.querySelectorAll('*')].filter(
      (e) => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY),
    );
  const parents = [];
  for (let e = box; e && e !== document.body; e = e.parentElement)
    if (e.scrollTop || e.scrollLeft) parents.push([e, e.scrollTop, e.scrollLeft]);
  const inner = scrolls(box).map((e) => [e.className, e.scrollTop]); // contenedores internos (se vuelven a crear con el HTML)
  const rows = [...box.querySelectorAll('[role="tablist"]')].map((r) => r.scrollLeft);
  return () => {
    for (const [e, top, left] of parents) {
      e.scrollTop = top;
      e.scrollLeft = left;
    }
    for (const [cls, top] of inner)
      if (cls) box.querySelector(`.${cls.trim().split(/\s+/).join('.')}`)?.scrollTo(0, top);
    box.querySelectorAll('[role="tablist"]').forEach((r, i) => {
      r.scrollLeft = rows[i] || 0;
    });
  };
}
