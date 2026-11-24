/**
 * Clima del fondo animado (.world): cada tablero sortea uno, con más probabilidad de los que pegan con su zona
 * (nieve en el Refugio Glacial, hojas en la Aldea de Otoño, ascuas en el Puerto del Volcán…), y el inicio sortea
 * uno tranquilo cada vez que se abre. Es suave a propósito: da personalidad sin distraer del tablero.
 * Solo pone `data-weather` en <body>; todo el efecto es CSS (60-weather.css).
 */
export const WEATHERS = ['clear', 'rain', 'storm', 'snow', 'fireflies', 'leaves', 'mist', 'stars', 'embers'];

/** Climas posibles por zona (1-7); repetir uno lo hace más probable. */
const BY_ZONE = {
  1: ['fireflies', 'fireflies', 'rain', 'leaves', 'mist', 'clear'],
  2: ['rain', 'rain', 'storm', 'mist', 'stars', 'clear'],
  3: ['leaves', 'leaves', 'rain', 'fireflies', 'mist', 'clear'],
  4: ['snow', 'snow', 'snow', 'stars', 'mist', 'clear'],
  5: ['stars', 'stars', 'rain', 'fireflies', 'mist', 'clear'],
  6: ['embers', 'embers', 'storm', 'mist', 'clear'],
  7: ['stars', 'storm', 'fireflies', 'snow', 'embers', 'clear'],
};
/** Inicio: climas tranquilos (nada de tormenta). */
const HOME = ['fireflies', 'stars', 'snow', 'rain', 'mist', 'leaves'];

let last = '';
/** Elige un clima de la lista sin repetir el anterior (si hay otra opción). `rnd` se puede inyectar en tests. */
export function rollWeather(list, rnd = Math.random) {
  const pool = list.filter((w) => w !== last);
  const pick = (pool.length ? pool : list)[Math.floor(rnd() * (pool.length || list.length))];
  last = pick;
  return pick;
}
export const setWeather = (kind) => {
  document.body.dataset.weather = kind;
};
/** Clima de un tablero nuevo según su zona (la de `body[data-zone]`). */
export function weatherForBoard() {
  const zone = Number(document.body.dataset.zone) || 0;
  setWeather(rollWeather(BY_ZONE[zone] || WEATHERS));
}
/** Clima del inicio. */
export const weatherForHome = () => setWeather(rollWeather(HOME));

// Al cargar, el inicio ya está abierto: sortea su clima.
if (typeof document !== 'undefined' && document.body && !document.body.dataset.weather) weatherForHome();
