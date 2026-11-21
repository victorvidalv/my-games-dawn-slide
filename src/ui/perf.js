/* ============================ Modo ligero automático ============================
   Solo se mide mientras ya hay animación: fx.js pasa cada frame de sus partículas, y los poderes y la pantalla de puntos
   piden vigilar unos segundos (watchFrames). Fuera de eso no hay ningún bucle propio. Si el móvil
   va justo (muchos frames de más de 25 ms), se activa el modo ligero: la clase `lite` en <html> quita filtros y sombras
   animadas (35-lite.css) y fx.js lanza menos chispas. Se recuerda en el dispositivo durante 3 días (después se vuelve a
   medir: un bache puntual no apaga los efectos para siempre); `?lite=1` / `?lite=0` lo fuerza (para probar) y
   `?lite=auto` vuelve a la detección. «Reducir movimiento» del sistema sigue funcionando aparte.
   En la tienda de Canjear los diseños animados se mueven siempre (ver 42-cosmetics-animated.css). */
const KEY = 'dawnslide-lite';
const WINDOW = 60,
  SLOW_MS = 25,
  SLOW_SHARE = 0.15,
  IGNORE_MS = 250; // un frame de >250 ms es una pestaña oculta, no lentitud
const root = document.documentElement;
const listeners = new Set();
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const write = (v) => {
  try {
    if (v === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } catch {
    /* sin almacenamiento */
  }
};

const param = new URLSearchParams(location.search).get('lite');
if (param === 'auto') write(null);
else if (param === '1' || param === '0') write(param === '1' ? 'on' : 'off');
/** Cuánto dura el modo ligero que activó la detección automática. */
export const AUTO_LITE_MS = 3 * 24 * 60 * 60 * 1000;
/** ¿Sigue vigente un modo ligero automático guardado como `auto:<ms>`? (el antiguo `auto` sin fecha ya no vale) */
export const autoLiteActive = (value, now = Date.now()) => {
  const at = /^auto:(\d+)$/.exec(value || '')?.[1];
  return !!at && now - Number(at) < AUTO_LITE_MS;
};
let saved = read();
if (saved?.startsWith('auto') && !autoLiteActive(saved)) {
  write(null); // caducado: se vuelve a medir
  saved = null;
}
const forced = saved === 'on' || saved === 'off'; // forzado a mano: no se detecta nada
let lite = saved === 'on' || autoLiteActive(saved); // lo activó la detección hace menos de 3 días
let samples = 0,
  slow = 0,
  prev = 0,
  watching = 0;

function apply(v) {
  lite = v;
  root.classList.toggle('lite', v);
  listeners.forEach((f) => f(v));
}
apply(lite);

export const isLite = () => lite;
/** Avisa cuando cambia el modo (fx.js reajusta su lienzo). */
export const onLiteChange = (f) => {
  listeners.add(f);
};

/** Marca de tiempo de un frame con animación en marcha (la de requestAnimationFrame). Si dos fuentes avisan del mismo
    frame, cuenta una vez; tras una pausa larga empieza de cero, sin contar el hueco. */
export function frameAt(t) {
  const dt = t - prev;
  if (dt <= 0) return;
  prev = t;
  if (lite || forced || dt > IGNORE_MS) return;
  samples++;
  if (dt > SLOW_MS) slow++;
  if (samples < WINDOW) return;
  const tooSlow = slow / samples >= SLOW_SHARE;
  samples = slow = 0;
  if (tooSlow) {
    write(`auto:${Date.now()}`);
    apply(true);
  }
}

/** Vigila los frames durante `ms` (mientras dura un efecto grande). */
export function watchFrames(ms) {
  if (lite || forced) return;
  const end = performance.now() + ms,
    already = watching;
  watching = Math.max(watching, end);
  if (already > performance.now()) return; // ya hay un bucle en marcha: solo se alarga
  const step = (t) => {
    frameAt(t);
    if (t < watching && !lite) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
