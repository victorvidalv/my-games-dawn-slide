/**
 * Láminas de origen de los atuendos: héroe, archivo, ids de los 5 conjuntos (de izquierda a derecha), límites de filas y
 * fondo con el que se aplana. `keyWhite`: la lámina trae fondo blanco liso, que se quita desde los bordes.
 */
export const OUTFIT_SHEETS = [
  {
    hero: 'lia',
    file: 'lia-1.png',
    ids: ['capitana', 'aviadora', 'arquera', 'cartografa', 'alquimista'],
    rows: [0, 448, 738, 1024],
    bg: '#3a2a22',
  },
  {
    hero: 'lia',
    file: 'lia-2.png',
    ids: ['ingeniera', 'mecanica', 'violeta', 'piloto', 'neon'],
    rows: [0, 421, 697, 1024],
    bg: '#2a2630',
  },
  {
    hero: 'jean',
    file: 'jean-1.png',
    ids: ['vigia', 'aviador', 'relojero', 'astronomo', 'nomada'],
    rows: [0, 440, 718, 1024],
    bg: '#3a2a1c',
  },
  {
    hero: 'jean',
    file: 'jean-2.png',
    ids: ['erudito', 'principe', 'centurion', 'astrologo', 'arqueologo'],
    rows: [0, 405, 690, 971],
    bg: '#2a2016',
  },
  {
    hero: 'van',
    file: 'juth-1.png',
    ids: ['escriba', 'navegante', 'maga', 'boticaria', 'oraculo'],
    rows: [0, 434, 702, 1024],
    bg: '#3a2d2a',
  },
  {
    hero: 'van',
    file: 'juth-2.png',
    ids: ['carmesi', 'cuervo', 'necromante', 'guardiana', 'cuervos'],
    rows: [0, 440, 710, 1024],
    bg: '#2a2024',
  },
  {
    hero: 'van',
    file: 'juth-3.webp',
    ids: ['astral', 'dama', 'espinas', 'verde', 'cuervera'],
    rows: [0, 311, 536, 750],
    bg: '#2a2230',
    keyWhite: true,
  },
  {
    hero: 'lia',
    file: 'lia-3.webp',
    ids: ['brasas', 'buscatesoros', 'vampira', 'lunar', 'guerrera'],
    rows: [0, 320, 522, 750],
    bg: '#2e2228',
    keyWhite: true,
  },
  {
    hero: 'jean',
    file: 'jean-3.png',
    ids: ['sakura', 'cibernetico', 'oni', 'violeta', 'shogun'],
    rows: [0, 415, 685, 970],
    bg: '#262030',
  },
];
