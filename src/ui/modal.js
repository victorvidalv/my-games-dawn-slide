/**
 * Ventanas del juego. `openModal` sirve para las que ya están en index.html (se muestran con la clase `show`);
 * `openOverlay` para las que se crean al vuelo (visores de Personalizar). Ambas devuelven la función que las cierra
 * y se encargan de Escape y, si se pide, de mantener Tab dentro de la ventana.
 */
import { tabbables } from './dom-utils.js';

function trapTab(e, root, cycle) {
  const bs = tabbables(root);
  if (!bs.length) return;
  if (cycle) {
    // Ventanas con pocos botones: Tab recorre siempre en círculo, sin depender del orden nativo
    e.preventDefault();
    const i = bs.indexOf(document.activeElement);
    bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
    return;
  }
  if (e.shiftKey && document.activeElement === bs[0]) {
    e.preventDefault();
    bs.at(-1).focus();
  } else if (!e.shiftKey && document.activeElement === bs.at(-1)) {
    e.preventDefault();
    bs[0].focus();
  }
}

/**
 * @param {HTMLElement} modal  Ventana ya presente en el DOM.
 * @param {object} [o]
 * @param {(value?: any) => void} [o.onClose]  Se llama al cerrar (una sola vez), con el valor que se pasó a `close`.
 * @param {(close: Function) => void} [o.onEscape]  Qué hace Escape (por defecto, cerrar). `false` lo desactiva.
 * @param {(e: KeyboardEvent, close: Function) => boolean|void} [o.onKey]  Teclas propias; devolver true = ya tratada.
 * @param {boolean|'cycle'} [o.trap]  Mantener Tab dentro de la ventana (`'cycle'`: recorrer los botones en círculo).
 * @param {HTMLElement} [o.focus]  Elemento que recibe el foco al abrir.
 */
export function openModal(modal, { onClose, onEscape, onKey, trap = false, focus } = {}) {
  let isOpen = true;
  const key = (e) => {
    if (onKey?.(e, close)) return;
    if (e.key === 'Escape' && onEscape !== false) (onEscape || close)(close);
    else if (e.key === 'Tab' && trap) trapTab(e, modal, trap === 'cycle');
  };
  function close(value) {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.remove('show');
    modal.removeEventListener('keydown', key);
    onClose?.(value);
  }
  modal.addEventListener('keydown', key);
  modal.classList.add('show');
  focus?.focus();
  return close;
}

/** Ventana creada al vuelo: se añade a <body>, se cierra con Escape o al pulsar el fondo / un `[data-close]`. */
export function openOverlay(node, { onClose, focus, closeSelector = '[data-close]' } = {}) {
  let isOpen = true;
  const key = (e) => {
    if (e.key === 'Escape') close();
  };
  function close() {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('keydown', key);
    node.remove();
    onClose?.();
  }
  node.addEventListener('click', (e) => {
    if (e.target === node || e.target.closest(closeSelector)) close();
  });
  document.addEventListener('keydown', key);
  document.body.appendChild(node);
  focus?.focus?.();
  return close;
}
