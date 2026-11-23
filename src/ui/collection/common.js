/** Personalizar: nombres de categorías, agrupación en pestañas y pequeñas utilidades compartidas. */
import { RARITY, rewardById } from '../../game/achievements.js';
import { numLocale } from '../../i18n.js';
import { S } from '../../state.js';

export const TYPE_NAME = {
  board: 'Borde',
  pieces: 'Fichas',
  key: 'Llave',
  card: 'Tarjetas',
  outfit: 'Atuendos',
  cover: 'Héroes',
  music: 'Música',
  bg: 'Fondo',
  trail: 'Estelas',
  fx: 'Celebración',
  aura: 'Clima',
  ui: 'Tema',
};
/**
 * Pestañas principales de Personalizar (Lore vive ahora en su propia sección desde el menú principal):
 *   Tablero → Borde · Fichas · Llave · Tarjetas · Estelas · Celebración
 *   Atuendos → Lía · Jean · Juth
 *   Portada → Héroes · Música · Fondo · Clima · Tema
 */
export const GROUPS = [
  { id: 'board', label: 'Tablero', icon: 'flag', types: ['board', 'pieces', 'key', 'card', 'trail', 'fx'] },
  { id: 'outfit', label: 'Atuendos', icon: 'heart', types: ['outfit'] },
  { id: 'cover', label: 'Portada', icon: 'stars', types: ['cover', 'music', 'bg', 'aura', 'ui'] },
];
export const groupOf = (type) => GROUPS.find((g) => g.types.includes(type)) || GROUPS[0];
export const TYPE_HINT = {
  board: 'Así se verá en tu tablero',
  pieces: 'Así se verán en tu tablero',
  key: 'Así se verá en tu tablero',
  card: 'Así lucirán las cartas del destino',
  cover: 'Así lucirán los héroes en la portada',
  music: 'Así sonará en el menú',
  bg: 'Así lucirá el fondo de la portada',
  trail: 'Así se verá tu estela al mover fichas',
  fx: 'Así celebrará tu llave al salir',
  aura: 'Así lucirá el clima en la portada',
  ui: 'Así lucirá la interfaz de la portada',
};

export const fmt = (n) => n.toLocaleString(numLocale());
export const rewardName = (type, id) => rewardById(type, id)?.name || '';
export const rarityOf = (item) => RARITY[item?.rarity] || RARITY.common;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const inRun = () => !!(S.run && S.G && !S.G.done);
