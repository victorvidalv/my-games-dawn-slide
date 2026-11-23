/**
 * Ventana superpuesta accesible, común a los visores de Personalizar y Lore (probador, atuendos, libros y escenas):
 * crea el diálogo modal, lo cierra con Esc, tocando el fondo o un botón de cierre, y devuelve el foco a quien la abrió.
 */
import { sfx } from '../audio/sound.js';

/**
 * @param {object} o
 * @param {string} o.className      clase del fondo (p. ej. «book-ov»)
 * @param {string} o.html           contenido
 * @param {string} o.closeSelector  botón(es) que cierran (p. ej. «[data-book-close]»)
 * @param {string} [o.labelledBy]   id del título (aria-labelledby)
 * @param {(e: KeyboardEvent) => void} [o.onKey]   teclas distintas de Esc
 * @param {(e: MouseEvent) => void}   [o.onClick] clics que no cierran
 * @param {() => void} [o.onClose]  se llama una vez al cerrar
 * @param {() => Element | null} [o.returnFocus] elemento que recupera el foco
 * @returns {{ el: HTMLElement, close: () => void }}
 */
export function openOverlay({ className, html, closeSelector, labelledBy, onKey, onClick, onClose, returnFocus }) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (labelledBy) el.setAttribute('aria-labelledby', labelledBy);
  el.innerHTML = html;
  document.body.appendChild(el);

  let open = true;
  const close = () => {
    if (!open) return;
    open = false;
    document.removeEventListener('keydown', keydown);
    el.remove();
    onClose?.();
    returnFocus?.()?.focus?.();
  };
  const keydown = (e) => {
    if (e.key === 'Escape') close();
    else onKey?.(e);
  };
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest(closeSelector)) {
      sfx.ui();
      close();
    } else onClick?.(e);
  });
  document.addEventListener('keydown', keydown);
  return { el, close };
}

/** Paginador ←/→ para visores con páginas (libros y escenas): avanza dentro de [0, count) y repinta. */
export function pager({ count, start = 0, canMove = () => true, onChange }) {
  const state = { index: start };
  const go = (d) => {
    const n = state.index + d;
    if (n < 0 || n >= count() || !canMove()) return;
    state.index = n;
    sfx.ui();
    onChange();
  };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  };
  return { state, go, onKey };
}
