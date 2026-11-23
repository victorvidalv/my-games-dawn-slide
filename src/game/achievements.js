/**
 * Personalizar: tablero, fichas, llave y atuendos. Cada objeto se desbloquea al hacer algo en el juego (UNLOCKS);
 * no hay puntos, logros que reclamar ni tienda. Los 113 logros siguen existiendo por dentro como registro de
 * acciones (ACHIEVEMENTS) porque viajan en el código QR de guardado.
 * Lógica pura (sin DOM).
 */
import { CHALLENGES, maxLevelReached } from './daily.js';
import { PLAN } from './unlock-plan.js';
import { survivalBestLevel, survivalCompletedCount, survivalWonFor } from './survival.js';

export const TIERS = {
  bronze: { id: 'bronze', name: 'Simple' },
  silver: { id: 'silver', name: 'Medio' },
  gold: { id: 'gold', name: 'Difícil' },
};

/**
 * Rareza de cada recompensa: marca el precio (y lo vistoso del diseño). Los diseños épicos y legendarios están animados.
 *   · común       20–45 pts   · se consigue en la primera sesión
 *   · rara        40–95 pts   · un par de logros medios
 *   · épica      80–190 pts   · animada o con brillo propio
 *   · legendaria 250–280 pts  · la joya de cada categoría (varios logros difíciles)
 */
export const RARITY = {
  common: { id: 'common', name: 'Común', note: 'Un cambio sencillo y elegante.' },
  rare: { id: 'rare', name: 'Rara', note: 'Materiales con más detalle y relieve.' },
  epic: { id: 'epic', name: 'Épica', note: 'Diseño animado con brillo propio.' },
  legendary: { id: 'legendary', name: 'Legendaria', note: 'La pieza más espectacular de su colección.' },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

/**
 * Recompensas canjeables en Canjear: la primera de cada tipo es gratuita (de serie).
 * IMPORTANTE: el orden y los id de cada lista forman parte del formato de transferencia QR (v3): no reordenar ni quitar.
 * `anim: true` = el diseño se mueve en el tablero (se apaga en modo ligero y con «reducir movimiento»).
 */
export const REWARDS = {
  board: [
    { id: 'wood', name: 'Madera tallada', price: 0, rarity: 'common' },
    { id: 'slate', name: 'Pizarra nocturna', price: 30, rarity: 'common' },
    { id: 'amber', name: 'Ámbar solar', price: 35, rarity: 'common' },
    { id: 'marble', name: 'Mármol real', price: 65, rarity: 'rare' },
    { id: 'sapphire', name: 'Zafiro real', price: 75, rarity: 'rare' },
    { id: 'jade', name: 'Jade imperial', price: 45, rarity: 'common' },
    { id: 'crimson', name: 'Forja carmesí', price: 150, rarity: 'epic', anim: true },
    { id: 'ivory', name: 'Pergamino dorado', price: 90, rarity: 'rare' },
    { id: 'celestial', name: 'Observatorio astral', price: 280, rarity: 'legendary', anim: true },
    { id: 'obsidian', name: 'Obsidiana real', price: 190, rarity: 'epic', anim: true },
    { id: 'tide', name: 'Marea de luna', price: 160, rarity: 'epic', anim: true },
    { id: 'sakura', name: 'Jardín de cerezos', price: 200, rarity: 'epic', anim: true },
    { id: 'dawnfire', name: 'Corona del alba', price: 320, rarity: 'legendary', anim: true },
    { id: 'moss', name: 'Musgo y piedra', price: 30, rarity: 'common' },
    { id: 'sand', name: 'Arena del desierto', price: 30, rarity: 'common' },
    { id: 'rose', name: 'Cuarzo rosa', price: 35, rarity: 'common' },
    { id: 'steel', name: 'Acero pulido', price: 40, rarity: 'common' },
    { id: 'copper', name: 'Cobre y verdín', price: 70, rarity: 'rare' },
    { id: 'reef', name: 'Arrecife', price: 75, rarity: 'rare' },
    { id: 'lavender', name: 'Lavanda nocturna', price: 80, rarity: 'rare' },
    { id: 'forest', name: 'Bosque encantado', price: 85, rarity: 'rare' },
    { id: 'bronze', name: 'Bronce antiguo', price: 90, rarity: 'rare' },
    { id: 'storm', name: 'Tormenta eléctrica', price: 170, rarity: 'epic', anim: true },
    { id: 'lava', name: 'Cráter de lava', price: 180, rarity: 'epic', anim: true },
    { id: 'glacier', name: 'Glaciar', price: 190, rarity: 'epic', anim: true },
    { id: 'neon', name: 'Ciudad neón', price: 200, rarity: 'epic', anim: true },
    { id: 'toxic', name: 'Pantano tóxico', price: 210, rarity: 'epic', anim: true },
    { id: 'nebula', name: 'Nebulosa', price: 300, rarity: 'legendary', anim: true },
    { id: 'eclipse', name: 'Eclipse total', price: 330, rarity: 'legendary', anim: true },
    { id: 'prism', name: 'Cristal prismático', price: 350, rarity: 'legendary', anim: true },
  ],
  pieces: [
    { id: 'paint', name: 'Madera pintada', price: 0, rarity: 'common' },
    { id: 'stone', name: 'Piedra tallada', price: 30, rarity: 'common' },
    { id: 'glass', name: 'Vidrio de colores', price: 40, rarity: 'common' },
    { id: 'night', name: 'Tinta nocturna', price: 75, rarity: 'rare' },
    { id: 'ceramic', name: 'Porcelana celeste', price: 65, rarity: 'rare' },
    { id: 'brass', name: 'Latón bruñido', price: 90, rarity: 'rare' },
    { id: 'runic', name: 'Pergamino rúnico', price: 150, rarity: 'epic', anim: true },
    { id: 'lacquer', name: 'Lacado imperial', price: 180, rarity: 'epic', anim: true },
    { id: 'oldgold', name: 'Oro viejo', price: 280, rarity: 'epic', anim: true },
    { id: 'frostedge', name: 'Escarcha viva', price: 160, rarity: 'epic', anim: true },
    { id: 'neon', name: 'Filo de neón', price: 200, rarity: 'epic', anim: true },
    { id: 'ember', name: 'Brasas vivas', price: 320, rarity: 'legendary', anim: true },
    { id: 'clay', name: 'Arcilla cocida', price: 30, rarity: 'common' },
    { id: 'candy', name: 'Caramelo', price: 30, rarity: 'common' },
    { id: 'bamboo', name: 'Bambú', price: 35, rarity: 'common' },
    { id: 'marble', name: 'Mármol pulido', price: 70, rarity: 'rare' },
    { id: 'jelly', name: 'Gelatina', price: 70, rarity: 'rare' },
    { id: 'copper', name: 'Cobre patinado', price: 75, rarity: 'rare' },
    { id: 'silk', name: 'Seda', price: 80, rarity: 'rare' },
    { id: 'pearl', name: 'Nácar', price: 85, rarity: 'rare' },
    { id: 'aurora', name: 'Aurora boreal', price: 160, rarity: 'epic', anim: true },
    { id: 'plasma', name: 'Plasma', price: 170, rarity: 'epic', anim: true },
    { id: 'holo', name: 'Holograma', price: 180, rarity: 'epic', anim: true },
    { id: 'lava', name: 'Lava viva', price: 190, rarity: 'epic', anim: true },
    { id: 'tide', name: 'Marea', price: 200, rarity: 'rare' },
    { id: 'volt', name: 'Voltaje', price: 210, rarity: 'rare' },
    { id: 'galaxia', name: 'Galaxia', price: 300, rarity: 'legendary', anim: true },
    { id: 'solar', name: 'Corona solar', price: 320, rarity: 'legendary', anim: true },
    { id: 'prisma', name: 'Prisma', price: 340, rarity: 'legendary', anim: true },
    { id: 'abismo', name: 'Abismo', price: 360, rarity: 'legendary', anim: true },
  ],
  key: [
    { id: 'red', name: 'Llave roja', price: 0, rarity: 'common' },
    { id: 'amber', name: 'Llave de ámbar', price: 25, rarity: 'common' },
    { id: 'iron', name: 'Llave de hierro antiguo', price: 30, rarity: 'common' },
    { id: 'emerald', name: 'Llave de esmeralda', price: 65, rarity: 'rare' },
    { id: 'sapphire', name: 'Llave de zafiro', price: 70, rarity: 'rare' },
    { id: 'rose', name: 'Llave de coral', price: 40, rarity: 'common' },
    { id: 'crystal', name: 'Llave de cristal', price: 90, rarity: 'rare' },
    { id: 'obsidian', name: 'Llave de obsidiana', price: 150, rarity: 'epic', anim: true },
    { id: 'star', name: 'Llave de estrellas', price: 190, rarity: 'epic', anim: true },
    { id: 'gold', name: 'Llave dorada', price: 280, rarity: 'legendary', anim: true },
    { id: 'moon', name: 'Llave lunar', price: 110, rarity: 'rare' },
    { id: 'phoenix', name: 'Llave del fénix', price: 220, rarity: 'epic', anim: true },
    { id: 'eclipse', name: 'Llave del eclipse', price: 340, rarity: 'legendary', anim: true },
    { id: 'jade', name: 'Llave de jade', price: 30, rarity: 'common' },
    { id: 'copper', name: 'Llave de cobre', price: 30, rarity: 'common' },
    { id: 'lilac', name: 'Llave de lavanda', price: 35, rarity: 'common' },
    { id: 'bone', name: 'Llave de hueso', price: 35, rarity: 'common' },
    { id: 'ocean', name: 'Llave del océano', price: 70, rarity: 'rare' },
    { id: 'topaz', name: 'Llave de topacio', price: 75, rarity: 'rare' },
    { id: 'ruby', name: 'Llave de rubí', price: 80, rarity: 'rare' },
    { id: 'frost', name: 'Llave de escarcha', price: 85, rarity: 'rare' },
    { id: 'forest', name: 'Llave del bosque', price: 70, rarity: 'rare' },
    { id: 'storm', name: 'Llave de tormenta', price: 160, rarity: 'epic', anim: true },
    { id: 'toxic', name: 'Llave tóxica', price: 170, rarity: 'epic', anim: true },
    { id: 'aurora', name: 'Llave de aurora', price: 180, rarity: 'epic', anim: true },
    { id: 'magma', name: 'Llave de magma', price: 190, rarity: 'epic', anim: true },
    { id: 'neon', name: 'Llave neón', price: 200, rarity: 'epic', anim: true },
    { id: 'galaxy', name: 'Llave galáctica', price: 300, rarity: 'legendary', anim: true },
    { id: 'dragon', name: 'Llave del dragón', price: 320, rarity: 'legendary', anim: true },
    { id: 'chrono', name: 'Llave del tiempo', price: 340, rarity: 'legendary', anim: true },
  ],
  fx: [
    { id: 'none', name: 'Sin adornos', price: 0, rarity: 'common' },
    {
      id: 'embers',
      name: 'Brasas',
      price: 25,
      rarity: 'common',
      burst: { n: 26, colors: ['#ff9a3d', '#ffd24a', '#ff6a3d', '#fff0b8'], speed: 7 },
    },
    {
      id: 'sparks',
      name: 'Chispas doradas',
      price: 30,
      rarity: 'common',
      burst: { n: 34, colors: ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], speed: 9 },
    },
    {
      id: 'petals',
      name: 'Pétalos',
      price: 40,
      rarity: 'common',
      burst: { n: 30, colors: ['#ffb7d0', '#ff8fb8', '#ffe3ee', '#f7c6d9'], speed: 5 },
    },
    {
      id: 'ink',
      name: 'Salpicadura de tinta',
      price: 65,
      rarity: 'rare',
      burst: { n: 36, colors: ['#150e0c', '#3a2a44', '#e0b04f', '#f3e5c8'], speed: 8 },
    },
    {
      id: 'frost',
      name: 'Destello glaciar',
      price: 75,
      rarity: 'rare',
      burst: { n: 40, colors: ['#b8f2ff', '#5fd6ff', '#ffffff', '#8ab8ff'], speed: 7 },
    },
    {
      id: 'stars',
      name: 'Lluvia de estrellas',
      price: 90,
      rarity: 'rare',
      burst: { n: 44, colors: ['#d7c3ff', '#8fd8ff', '#ffffff', '#ffe9ad'], speed: 8 },
    },
    {
      id: 'aurora',
      name: 'Aurora',
      price: 150,
      rarity: 'epic',
      burst: { n: 44, colors: ['#58f0c8', '#8fd8ff', '#b08cff', '#e6fff6'], speed: 6 },
    },
    {
      id: 'prism',
      name: 'Prisma solar',
      price: 190,
      rarity: 'epic',
      burst: { n: 48, colors: ['#ff8a65', '#ffd54f', '#4dd0e1', '#ce93d8', '#fff8e1'], speed: 9 },
    },
    {
      id: 'leaves',
      name: 'Hojas de otoño',
      price: 45,
      rarity: 'common',
      burst: { n: 30, colors: ['#d9772b', '#e8a23a', '#b5481f', '#f2c76b'], speed: 5 },
    },
    {
      id: 'confetti',
      name: 'Confeti de fiesta',
      price: 80,
      rarity: 'rare',
      burst: { n: 52, colors: ['#ff5f8f', '#ffd24a', '#58d8c8', '#6cb6ff', '#b08cff'], speed: 9 },
    },
    {
      id: 'coins',
      name: 'Lluvia de monedas',
      price: 95,
      rarity: 'rare',
      burst: { n: 34, colors: ['#ffd24a', '#f2b632', '#fff1b0', '#c98d1a'], speed: 7 },
    },
    {
      id: 'lightning',
      name: 'Relámpago',
      price: 170,
      rarity: 'epic',
      burst: { n: 40, colors: ['#e6f2ff', '#8fc6ff', '#b9a6ff', '#ffffff'], speed: 10 },
    },
    {
      id: 'phoenix',
      name: 'Vuelo del fénix',
      price: 300,
      rarity: 'legendary',
      burst: { n: 56, colors: ['#ff7a2e', '#ffc23d', '#ff4a3d', '#fff0b8'], speed: 8 },
    },
    {
      id: 'fireworks',
      name: 'Fuegos artificiales',
      price: 280,
      rarity: 'legendary',
      burst: { n: 60, colors: ['#ff5f8f', '#ffd24a', '#58d8c8', '#6cb6ff', '#ffffff'], speed: 11 },
    },
  ],
  music: [
    { id: 'menu', name: 'Crónicas de la llave roja', price: 0, rarity: 'common' },
    { id: 'z0', name: 'Un corazón al sol', price: 20, rarity: 'common' },
    { id: 'z1', name: 'Vals de las pequeñas velas', price: 20, rarity: 'common' },
    { id: 'z2', name: 'Las hojas recuerdan', price: 25, rarity: 'common' },
    { id: 'z3', name: 'Campanas de cristal', price: 40, rarity: 'rare' },
    { id: 'z4', name: 'Las horas prestadas', price: 30, rarity: 'common' },
    { id: 'heroes', name: 'Llamada de los héroes', price: 40, rarity: 'rare' },
    { id: 'z5', name: 'La fragua de los sueños', price: 45, rarity: 'rare' },
    { id: 's0', name: 'Contrarreloj', price: 50, rarity: 'rare' },
    { id: 's1', name: 'Amanecer de acero', price: 80, rarity: 'epic' },
    { id: 'fate', name: 'Marcha del destino', price: 85, rarity: 'epic' },
    { id: 'z6', name: 'El regreso del amanecer', price: 95, rarity: 'legendary' },
    { id: 's2', name: 'Cumbre astral', price: 110, rarity: 'legendary' },
    { id: 'l0', name: 'Brasa entre tréboles', price: 60, rarity: 'rare' },
    { id: 'l2', name: 'Té con hojas doradas', price: 65, rarity: 'rare' },
    { id: 'l3', name: 'Un abrigo de nieve', price: 70, rarity: 'rare' },
    { id: 'l6', name: 'El baile de las llaves', price: 95, rarity: 'legendary' },
    { id: 'v0', name: 'El mapa de las raíces', price: 60, rarity: 'rare' },
    { id: 'v1', name: 'La marea al revés', price: 100, rarity: 'epic' },
    { id: 'v6', name: 'La llave olvidada', price: 105, rarity: 'legendary' },
  ],
  cover: [
    {
      id: 'alba-arcana',
      name: 'Alba arcana',
      price: 0,
      rarity: 'common',
      src: 'portada/heroes/alba-arcana.webp',
      cutout: true,
    },
    { id: 'lia', name: 'Lía en solitario', price: 60, rarity: 'rare', src: 'backgrounds/cover-heroes-lia.webp' },
    { id: 'van', name: 'Van en solitario', price: 60, rarity: 'rare', src: 'backgrounds/cover-heroes-van.webp' },
    { id: 'jean', name: 'Jean en solitario', price: 60, rarity: 'rare', src: 'backgrounds/cover-heroes-jean.webp' },
    { id: 'battle', name: 'En guardia', price: 140, rarity: 'epic', src: 'backgrounds/cover-heroes-battle.webp' },
    {
      id: 'victory',
      name: 'Amanecer victorioso',
      price: 250,
      rarity: 'legendary',
      src: 'backgrounds/cover-heroes-victory.webp',
    },
    {
      id: 'vapor-dorado',
      name: 'Vapor dorado',
      price: 55,
      rarity: 'common',
      src: 'portada/heroes/vapor-dorado.webp',
      cutout: true,
    },
    {
      id: 'descanso',
      name: 'Descanso en ruta',
      price: 50,
      rarity: 'common',
      src: 'portada/heroes/descanso.webp',
      cutout: true,
    },
    { id: 'mapa', name: 'Rumbo al mapa', price: 50, rarity: 'common', src: 'portada/heroes/mapa.webp', cutout: true },
    {
      id: 'noche-carmesi',
      name: 'Noche carmesí',
      price: 90,
      rarity: 'legendary',
      src: 'portada/heroes/noche-carmesi.webp',
      cutout: true,
    },
    {
      id: 'neon-cibernetico',
      name: 'Neón cibernético',
      price: 90,
      rarity: 'epic',
      src: 'portada/heroes/neon-cibernetico.webp',
      cutout: true,
    },
    {
      id: 'magia-tiempo',
      name: 'Magia del tiempo',
      price: 95,
      rarity: 'rare',
      src: 'portada/heroes/magia-tiempo.webp',
      cutout: true,
    },
    {
      id: 'magia-engranajes',
      name: 'Magia de engranajes',
      price: 95,
      rarity: 'rare',
      src: 'portada/heroes/magia-engranajes.webp',
      cutout: true,
    },
    {
      id: 'magia-sangre',
      name: 'Magia de sangre',
      price: 170,
      rarity: 'legendary',
      src: 'portada/heroes/magia-sangre.webp',
      cutout: true,
    },
    {
      id: 'magia-digital',
      name: 'Magia digital',
      price: 175,
      rarity: 'epic',
      src: 'portada/heroes/magia-digital.webp',
      cutout: true,
    },
    {
      id: 'combate-arcano',
      name: 'Combate arcano',
      price: 180,
      rarity: 'epic',
      src: 'portada/heroes/combate-arcano.webp',
      cutout: true,
    },
    {
      id: 'combate-vapor',
      name: 'Combate de vapor',
      price: 185,
      rarity: 'epic',
      src: 'portada/heroes/combate-vapor.webp',
      cutout: true,
    },
    {
      id: 'combate-sombras',
      name: 'Combate de sombras',
      price: 190,
      rarity: 'legendary',
      src: 'portada/heroes/combate-sombras.webp',
      cutout: true,
    },
    { id: 'pelea', name: 'Hora de pelear', price: 195, rarity: 'epic', src: 'portada/heroes/pelea.webp', cutout: true },
    {
      id: 'combate-neon',
      name: 'Combate neón',
      price: 300,
      rarity: 'epic',
      src: 'portada/heroes/combate-neon.webp',
      cutout: true,
    },
    {
      id: 'oro',
      name: 'La llave dorada',
      price: 320,
      rarity: 'legendary',
      src: 'portada/heroes/oro.webp',
      cutout: true,
    },
    {
      id: 'tormenta',
      name: 'Tormenta arcana',
      price: 340,
      rarity: 'legendary',
      src: 'portada/heroes/tormenta.webp',
      cutout: true,
    },
  ],
  /* Cartas del destino de la aventura: el emblema se mantiene y cambia lo demás (marco, colores, forma). Estilos en 46-card-collection.css. */
  card: [
    { id: 'mision', name: 'Placa de misión', price: 0, rarity: 'common' },
    { id: 'pergamino', name: 'Pergamino', price: 30, rarity: 'common' },
    { id: 'pizarra', name: 'Pizarra de tiza', price: 30, rarity: 'common' },
    { id: 'bosque', name: 'Madera del bosque', price: 35, rarity: 'common' },
    { id: 'cuaderno', name: 'Cuaderno', price: 35, rarity: 'common' },
    { id: 'piedra', name: 'Muro de piedra', price: 40, rarity: 'common' },
    { id: 'bronce', name: 'Placa de bronce', price: 70, rarity: 'rare' },
    { id: 'cristal', name: 'Cristal', price: 75, rarity: 'rare' },
    { id: 'zafiro', name: 'Zafiro', price: 80, rarity: 'rare' },
    { id: 'lacre', name: 'Lacre carmesí', price: 85, rarity: 'rare' },
    { id: 'jade', name: 'Jade imperial', price: 90, rarity: 'rare' },
    { id: 'neon', name: 'Neón', price: 170, rarity: 'epic', anim: true },
    { id: 'forja', name: 'Forja', price: 175, rarity: 'epic', anim: true },
    { id: 'hielo', name: 'Hielo', price: 180, rarity: 'epic', anim: true },
    { id: 'ticket', name: 'Entrada dorada', price: 185, rarity: 'rare' },
    { id: 'circuito', name: 'Circuito', price: 190, rarity: 'epic', anim: true },
    { id: 'aurora', name: 'Aurora', price: 300, rarity: 'legendary', anim: true },
    { id: 'galaxia', name: 'Galaxia', price: 320, rarity: 'legendary', anim: true },
    { id: 'dragon', name: 'Escamas de dragón', price: 340, rarity: 'legendary', anim: true },
    { id: 'eclipse', name: 'Eclipse', price: 360, rarity: 'legendary', anim: true },
  ],
  /* Fondo de la portada (solo se ve en la portada del juego): paisajes recortados de img-originales/portada/fondos con scripts/slice-portadas.mjs → public/portada/fondos. */
  bg: [
    {
      id: 'bosque-cascada',
      name: 'Cascada del bosque',
      price: 0,
      rarity: 'common',
      src: 'portada/fondos/bosque-cascada.webp',
      full: true,
      fx: '#bfffd8',
    },
    {
      id: 'mirador',
      name: 'Mirador de la montaña',
      price: 40,
      rarity: 'common',
      src: 'portada/fondos/mirador.webp',
      full: true,
      fx: '#cfe8ff',
    },
    {
      id: 'muralla',
      name: 'Muralla del estandarte',
      price: 45,
      rarity: 'common',
      src: 'portada/fondos/muralla.webp',
      full: true,
      fx: '#ffe8b0',
    },
    {
      id: 'puente-otono',
      name: 'Puente y cascada otoñal',
      price: 45,
      rarity: 'common',
      src: 'portada/fondos/puente-otono.webp',
      full: true,
      fx: '#ffb36a',
    },
    {
      id: 'ciudad-blanca',
      name: 'Ciudad blanca',
      price: 90,
      rarity: 'rare',
      src: 'portada/fondos/ciudad-blanca.webp',
      full: true,
      fx: '#fff0c0',
    },
    {
      id: 'ciudad-linternas',
      name: 'Ciudad de linternas',
      price: 90,
      rarity: 'rare',
      src: 'portada/fondos/ciudad-linternas.webp',
      full: true,
      fx: '#ffb36a',
    },
    {
      id: 'fortaleza-lunar',
      name: 'Fortaleza lunar',
      price: 95,
      rarity: 'rare',
      src: 'portada/fondos/fortaleza-lunar.webp',
      full: true,
      fx: '#ff9ad0',
    },
    {
      id: 'ciudad-flotante',
      name: 'Ciudad flotante',
      price: 95,
      rarity: 'rare',
      src: 'portada/fondos/ciudad-flotante.webp',
      full: true,
      fx: '#9ad8ff',
    },
    {
      id: 'castillo-rojo',
      name: 'Castillo de luna roja',
      price: 180,
      rarity: 'epic',
      src: 'portada/fondos/castillo-rojo.webp',
      full: true,
      fx: '#ff4a5a',
    },
    {
      id: 'calle-cerezos',
      name: 'Calle bajo los cerezos',
      price: 180,
      rarity: 'epic',
      src: 'portada/fondos/calle-cerezos.webp',
      full: true,
      fx: '#ffb0d8',
    },
    {
      id: 'torii-gigante',
      name: 'Torii y gigante',
      price: 185,
      rarity: 'epic',
      src: 'portada/fondos/torii-gigante.webp',
      full: true,
      fx: '#ff6a4a',
    },
    {
      id: 'puente-dragon',
      name: 'Puente del dragón',
      price: 190,
      rarity: 'epic',
      src: 'portada/fondos/puente-dragon.webp',
      full: true,
      fx: '#ff5a5a',
    },
    {
      id: 'neon-luna',
      name: 'Neón y luna',
      price: 300,
      rarity: 'legendary',
      src: 'portada/fondos/neon-luna.webp',
      full: true,
      fx: '#6ae0ff',
    },
    {
      id: 'plaza-neon',
      name: 'Plaza neón',
      price: 320,
      rarity: 'legendary',
      src: 'portada/fondos/plaza-neon.webp',
      full: true,
      fx: '#c07aff',
    },
    {
      id: 'coloso-neon',
      name: 'Coloso neón',
      price: 330,
      rarity: 'legendary',
      src: 'portada/fondos/coloso-neon.webp',
      full: true,
      fx: '#ff6ad8',
    },
    {
      id: 'santuario-carmesi',
      name: 'Santuario carmesí',
      price: 340,
      rarity: 'legendary',
      src: 'portada/fondos/santuario-carmesi.webp',
      full: true,
      fx: '#ff3a6a',
    },
  ],
  /* Estelas: lo que deja tu ficha al deslizarse por el tablero (partículas en el lienzo de efectos, src/ui/fx.js → TRAILS). */
  trail: [
    { id: 'none', name: 'Sin estela', price: 0, rarity: 'common' },
    { id: 'dust', name: 'Polvo de luz', price: 30, rarity: 'common', colors: ['#fff6d6', '#ffe9ad', '#f1ce82'] },
    { id: 'embers', name: 'Rastro de brasas', price: 35, rarity: 'common', colors: ['#ff9a3d', '#ffd24a', '#ff6a3d'] },
    { id: 'leaves', name: 'Hojas al viento', price: 40, rarity: 'common', colors: ['#8fcf5a', '#5fae3d', '#d9a93a'] },
    { id: 'petals', name: 'Pétalos de cerezo', price: 45, rarity: 'common', colors: ['#ffb7d0', '#ff8fb8', '#ffe3ee'] },
    { id: 'bubbles', name: 'Burbujas', price: 70, rarity: 'rare', colors: ['#bdeeff', '#7fd6ff', '#ffffff'] },
    { id: 'ink', name: 'Tinta china', price: 75, rarity: 'rare', colors: ['#1a1220', '#3a2a44', '#e0b04f'] },
    { id: 'frost', name: 'Copos de nieve', price: 80, rarity: 'rare', colors: ['#d6f6ff', '#8fe0ff', '#ffffff'] },
    { id: 'sparks', name: 'Chispas doradas', price: 90, rarity: 'rare', colors: ['#ffd24a', '#fff6c9', '#e0b04f'] },
    {
      id: 'lightning',
      name: 'Rastro eléctrico',
      price: 170,
      rarity: 'epic',
      colors: ['#e6f2ff', '#8fc6ff', '#b9a6ff'],
    },
    {
      id: 'rainbow',
      name: 'Arcoíris',
      price: 185,
      rarity: 'epic',
      colors: ['#ff6b6b', '#ffd24a', '#58e0a0', '#6cb6ff', '#b08cff'],
    },
    {
      id: 'starlight',
      name: 'Polvo de estrellas',
      price: 200,
      rarity: 'epic',
      colors: ['#d7c3ff', '#8fd8ff', '#ffffff', '#ffe9ad'],
    },
    {
      id: 'comet',
      name: 'Cometa',
      price: 300,
      rarity: 'legendary',
      colors: ['#bfe6ff', '#6cb6ff', '#ffffff', '#ffe9ad'],
    },
    {
      id: 'phoenix',
      name: 'Plumas de fénix',
      price: 320,
      rarity: 'legendary',
      colors: ['#ff7a2e', '#ffc23d', '#ff4a3d', '#fff0b8'],
    },
    {
      id: 'eclipse',
      name: 'Sombra del eclipse',
      price: 340,
      rarity: 'legendary',
      colors: ['#3a1f5c', '#8a5cd6', '#ff8ad8', '#ffffff'],
    },
  ],
  /* Clima de la portada (aura): capa de CSS animada, combinable con cualquier fondo. Estilos en 49-cover-aura.css. */
  aura: [
    { id: 'none', name: 'Cielo despejado', price: 0, rarity: 'common' },
    { id: 'fireflies', name: 'Luciérnagas', price: 35, rarity: 'common' },
    { id: 'mist', name: 'Neblina', price: 40, rarity: 'common' },
    { id: 'sunmotes', name: 'Motas de sol', price: 45, rarity: 'common' },
    { id: 'drizzle', name: 'Lluvia fina', price: 75, rarity: 'rare' },
    { id: 'leaves', name: 'Hojas de otoño', price: 80, rarity: 'rare' },
    { id: 'petals', name: 'Pétalos cayendo', price: 85, rarity: 'rare' },
    { id: 'snow', name: 'Nevada', price: 170, rarity: 'epic', anim: true },
    { id: 'ash', name: 'Cenizas ascendentes', price: 180, rarity: 'epic', anim: true },
    { id: 'meteors', name: 'Estrellas fugaces', price: 190, rarity: 'epic', anim: true },
    { id: 'storm', name: 'Tormenta eléctrica', price: 310, rarity: 'legendary', anim: true },
    { id: 'aurora', name: 'Aurora boreal', price: 340, rarity: 'legendary', anim: true },
  ],
  /* Tema de interfaz: paleta de la portada, los botones y las tarjetas (y del selector de héroe). Estilos en 50-ui-themes.css. */
  ui: [
    { id: 'ink', name: 'Tinta clásica', price: 0, rarity: 'common' },
    { id: 'thyes', name: 'Pergamino de Thyes', price: 40, rarity: 'common' },
    { id: 'jade', name: 'Bosque de jade', price: 45, rarity: 'common' },
    { id: 'crimson', name: 'Noche carmesí', price: 90, rarity: 'rare' },
    { id: 'glacier', name: 'Marea glacial', price: 95, rarity: 'rare' },
    { id: 'faro', name: 'Oro del Faro', price: 190, rarity: 'epic', anim: true },
    { id: 'neon', name: 'Neón', price: 200, rarity: 'epic', anim: true },
    { id: 'eclipse', name: 'Eclipse violeta', price: 330, rarity: 'legendary', anim: true },
  ],
};

/**
 * Cada categoría se ordena de lo más común a lo más raro (común → rara → épica → legendaria); el de serie va siempre primero
 * y, dentro de una misma rareza, se conserva el orden en que están escritos. El formato QR no depende de este orden (QR_LISTS).
 */
for (const list of Object.values(REWARDS))
  list.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

export const REWARD_TYPES = Object.keys(REWARDS);
export const DEFAULT_LOOK = {
  board: 'wood',
  pieces: 'paint',
  key: 'red',
  fx: 'none',
  music: 'menu',
  cover: 'alba-arcana',
  bg: 'bosque-cascada',
  card: 'mision',
  trail: 'none',
  aura: 'none',
  ui: 'ink',
};

/**
 * Objetos que ya existían (y se podían comprar con puntos) antes de que todo se desbloqueara jugando, en su orden histórico.
 * Lo que ya tenías de esta lista se conserva siempre; el formato del código QR también lee estas listas por posición.
 */
// prettier-ignore
export const LEGACY_REWARDS = {
  board: ['wood', 'slate', 'amber', 'marble', 'sapphire', 'jade', 'crimson', 'ivory', 'celestial', 'obsidian', 'tide', 'sakura', 'dawnfire'],
  pieces: ['paint', 'stone', 'glass', 'night', 'ceramic', 'brass', 'runic', 'lacquer', 'oldgold', 'frostedge', 'neon', 'ember'],
  key: ['red', 'amber', 'iron', 'emerald', 'sapphire', 'rose', 'crystal', 'obsidian', 'star', 'gold', 'moon', 'phoenix', 'eclipse'],
  fx: ['none', 'embers', 'sparks', 'petals', 'ink', 'frost', 'stars', 'aurora', 'prism', 'fireworks'],
  music: ['menu', 'z0', 'z1', 'z2', 'z3', 'z4', 'heroes', 'z5', 's0', 's1', 'fate', 'z6', 's2'],
  cover: ['alba-arcana', 'lia', 'van', 'jean', 'battle', 'victory'],
};

export const rewardKey = (type, id) => `${type}:${id}`;
export const rewardById = (type, id) => REWARDS[type]?.find((r) => r.id === id) || null;

/* ───────────── estadísticas ───────────── */

export const COUNTERS = [
  'completed',
  'perfects',
  'mini5',
  'iceRock',
  'locks',
  'fateCards',
  'cleanCity',
  'boardsSolved',
  'heavyBoards',
  'shopBuys',
  'powersUsed',
  'challengeBoards',
  'challengeRelicsUsed',
  'pacts',
  'goldSeals',
  'legacyAchPoints',
  'bestRunStreak', // marca máxima (se sube con raiseStat, no se suma)
  // Rebalance del roguelite (van al final: el código de guardado los lee en este orden)
  'emberBoards', // tableros con la Brasa intacta de Lía
  'bestGrade', // mejor rango de victoria (1 C · 2 B · 3 A · 4 S · 5 S+), marca máxima
  'maxPactsWin', // más Pactos llevados en una aventura ganada, marca máxima
  'fateCap', // 1 si alguna vez se ganó un tablero con las cartas en el tope de puntos
  'cleanRun', // 1 si se completó una aventura sin pistas
  'oathWin', // 1 si se completó una aventura con Juramento
  'challengePure', // 1 si se completó una senda de Desafío sin usar la reliquia
  'dailyBestDay', // más retos diarios distintos completados en un mismo día, marca máxima
  'relicsSeen', // máscara de bits: reliquias de Aventura usadas
  'heroWins', // máscara de bits: héroes con los que se completó una aventura
  'fateSeen', // máscara de bits: cartas del destino elegidas alguna vez
];

/** Contadores que son máscaras de bits (se marcan con `flagStat` y se leen contando bits). */
export const FLAG_STATS = ['relicsSeen', 'heroWins', 'fateSeen'];
const bitCount = (n) => {
  let c = 0;
  for (let x = Number(n) || 0; x > 0; x = Math.floor(x / 2)) c += x % 2;
  return c;
};

export const COLLECTIONS = ['heroes', 'paths', 'mini5Kinds', 'challengeRelics', 'challengeRoutesPlayed'];

const listOf = (store, name) => (Array.isArray(store.stats?.[name]) ? store.stats[name] : []);
const maxAdventureScore = (paths) =>
  Math.max(
    0,
    ...Object.entries(paths || {})
      .filter(([key]) => key.startsWith('c'))
      .map(([, p]) => Number(p?.score) || 0),
  );

export const STATS = {
  ...Object.fromEntries(COUNTERS.map((name) => [name, (store) => Number(store.stats?.[name]) || 0])),
  ...Object.fromEntries(COLLECTIONS.map((name) => [name, (store) => listOf(store, name).length])),
  maxLevel: (store) => maxLevelReached(store.paths),
  hardLevel: (store) => store.paths?.c50?.level || 0,
  hardDone: (store) => (listOf(store, 'paths').includes(50) ? 1 : 0),
  expertLevel: (store) => store.paths?.c75?.level || 0,
  expertDone: (store) => (listOf(store, 'paths').includes(75) ? 1 : 0),
  bestScore: (store) => maxAdventureScore(store.paths),
  dailySolved: (store) => store.daily?.solved || 0,
  dailyGold: (store) => store.daily?.gold || 0,
  bestStreak: (store) => store.daily?.best || 0,
  // el reto Maestro se retiró: cuenta «Todo junto» (y los Maestro que ya tenías)
  masterSolved: (store) => (store.daily?.by?.all || 0) + (store.daily?.by?.master || 0),
  dailyKinds: (store) => CHALLENGES.filter((c) => store.daily?.by?.[c.id]).length,
  challengeBest: (store) => survivalBestLevel(store),
  challenge150Won: (store) => (survivalWonFor(store, '150') ? 1 : 0),
  challenge200Won: (store) => (survivalWonFor(store, '200') ? 1 : 0),
  challenge250Won: (store) => (survivalWonFor(store, '250') ? 1 : 0),
  challengeWonCount: (store) => survivalCompletedCount(store),
  cosmeticsOwned: (store) => Object.keys(store.shopOwned || {}).length,
  relicsSeenCount: (store) => bitCount(store.stats?.relicsSeen),
  heroWinsCount: (store) => bitCount(store.stats?.heroWins),
  heroBoardsLia: (store) => Number(store.stats?.heroBoards_lia) || 0,
  heroBoardsJean: (store) => Number(store.stats?.heroBoards_jean) || 0,
  heroBoardsVan: (store) => Number(store.stats?.heroBoards_van) || 0,
  heroWinLia: (store) => ((Number(store.stats?.heroWins) || 0) & 1 ? 1 : 0),
  heroWinJean: (store) => ((Number(store.stats?.heroWins) || 0) & 2 ? 1 : 0),
  heroWinVan: (store) => ((Number(store.stats?.heroWins) || 0) & 4 ? 1 : 0),
  fateSeenCount: (store) => bitCount(store.stats?.fateSeen),
};

export const statsOf = (store = {}) =>
  Object.fromEntries(Object.entries(STATS).map(([k, read]) => [k, read(store || {})]));

/**
 * Pone al día los logros de un guardado antiguo (se llama al cargar y al importar; se puede repetir sin efecto):
 *   · los de jefes pasaron a ser de cartas del destino (mismos puntos);
 *   · los que se quitaron por ser relleno del inicio conservan sus puntos como «puntos heredados», que siguen sumando
 *     para canjear en la Tienda de logros.
 */
const ACH_RENAMED = { boss1: 'fate1', bosses3: 'fate9', bosses: 'fate27', bosses15: 'fate81' };
export const ACH_RETIRED = { lv5: 10, lv20: 15, lv35: 30, lv65: 40, perf1: 10, fate1: 15, boards10: 15 };
export function migrateAchievements(store) {
  if (!store) return false;
  let changed = false;
  for (const box of [store.ach, store.achClaimed])
    if (box)
      for (const [from, to] of Object.entries(ACH_RENAMED))
        if (Object.hasOwn(box, from)) {
          box[to] ??= box[from];
          delete box[from];
          changed = true;
        }
  if (store.stats && Object.hasOwn(store.stats, 'bosses')) {
    store.stats.fateCards = Math.max(Number(store.stats.fateCards) || 0, Number(store.stats.bosses) || 0);
    delete store.stats.bosses;
    changed = true;
  }
  let legacy = 0;
  for (const [id, points] of Object.entries(ACH_RETIRED)) {
    if (store.ach?.[id] || store.achClaimed?.[id]) legacy += points;
    if (store.ach) delete store.ach[id];
    if (store.achClaimed) delete store.achClaimed[id];
  }
  if (legacy) {
    const stats = (store.stats ||= {});
    stats.legacyAchPoints = (Number(stats.legacyAchPoints) || 0) + legacy;
    changed = true;
  }
  return changed;
}

/** Guarda el valor más alto visto de una marca (p. ej. la mejor racha de una partida). Devuelve true si subió. */
export function raiseStat(store, name, value) {
  const stats = (store.stats ||= {});
  if (!(Number(value) > (Number(stats[name]) || 0))) return false;
  stats[name] = Number(value);
  return true;
}

/** Marca el bit `bit` (0..30) de una estadística máscara (`FLAG_STATS`). Devuelve true si es nuevo. */
export function flagStat(store, name, bit) {
  if (!FLAG_STATS.includes(name)) throw new Error(`unknown flag stat: ${name}`);
  if (!(bit >= 0 && bit <= 30)) return false;
  const stats = (store.stats ||= {});
  const before = Number(stats[name]) || 0;
  const after = before | (1 << bit);
  stats[name] = after;
  return after !== before;
}

const HERO_BITS = ['lia', 'jean', 'van'];
const RELIC_BITS = ['sun', 'purse', 'lantern'];
const GRADE_VALUE = { C: 1, B: 2, A: 3, S: 4, 'S+': 5 };

/** Al empezar una aventura: anota la reliquia (para «Relicario»). */
export function adventureStartStats(store, run) {
  return flagStat(store, 'relicsSeen', RELIC_BITS.indexOf(run?.relic));
}

/**
 * Al completar una aventura: héroe, rango, Pactos, sin pistas y Juramento. `grade` es el de `runGrade` ('S+', 'S'…),
 * `pacts` cuántos Pactos llevaba y `oath` si uno era Juramento. Devuelve true si algo cambió.
 */
export function victoryStats(store, { hero, grade, pacts = 0, oath = false, helped = false }) {
  let changed = flagStat(store, 'heroWins', HERO_BITS.indexOf(hero));
  changed = raiseStat(store, 'bestGrade', GRADE_VALUE[grade] || 0) || changed;
  changed = raiseStat(store, 'maxPactsWin', pacts) || changed;
  if (!helped) changed = raiseStat(store, 'cleanRun', 1) || changed;
  if (oath) changed = raiseStat(store, 'oathWin', 1) || changed;
  return changed;
}

/** Al ganar un tablero de Aventura: Brasa intacta y cartas en el tope de puntos. */
export function boardWinStats(store, { ember = false, capped = false, hero = null }) {
  if (ember) bumpStat(store, 'emberBoards');
  const top = capped && raiseStat(store, 'fateCap', 1);
  // Tableros resueltos con cada héroe (para desbloquear sus atuendos): no viaja en el QR, solo en el guardado local
  const hero_ = HERO_BITS.includes(hero);
  if (hero_) {
    const stats = (store.stats ||= {});
    stats[`heroBoards_${hero}`] = (Number(stats[`heroBoards_${hero}`]) || 0) + 1;
  }
  return ember || top || hero_;
}

export function bumpStat(store, name, by = 1) {
  if (!COUNTERS.includes(name)) throw new Error(`unknown counter: ${name}`);
  const stats = (store.stats ||= {});
  stats[name] = (Number(stats[name]) || 0) + by;
}

export function markStat(store, name, key) {
  if (!COLLECTIONS.includes(name)) throw new Error(`unknown collection: ${name}`);
  const stats = (store.stats ||= {}),
    list = Array.isArray(stats[name]) ? stats[name] : (stats[name] = []);
  if (key == null || list.includes(key)) return false;
  list.push(key);
  return true;
}

export function boardStats(board, run = {}) {
  const out = ['boardsSolved'],
    n = board.n;
  if (board.moves <= board.opt) out.push('perfects');
  if (board.walls?.length || board.pieces?.some((p) => p.kind === 'ice')) out.push('iceRock');
  if (board.pieces?.some((p) => p.kind === 'gate')) out.push('locks');
  if (board.pieces?.some((p) => p.kind === 'heavy')) out.push('heavyBoards');
  if (n % 3 === 0 && (run.firstLevel ?? Infinity) <= n - 2 && (run.helpAt || 0) < n - 2) out.push('cleanCity');
  return out;
}

/* ───────────── 100 logros: 25 simples, 50 medios, 25 difíciles ───────────── */

export const GROUPS = [
  { id: 'adventure', name: 'Aventura' },
  { id: 'mastery', name: 'Maestría' },
  { id: 'challenge', name: 'Desafío' },
  { id: 'daily', name: 'Retos diarios' },
  { id: 'collection', name: 'Colección' },
];

export const ACHIEVEMENTS = [
  // ===== 1. Aventura (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'firstWin',
    group: 'adventure',
    tier: 'bronze',
    points: 10,
    name: 'Primer paso',
    desc: 'Resuelve tu primer tablero en Aventura',
    stat: 'boardsSolved',
    goal: 1,
  },
  {
    id: 'hard10',
    group: 'adventure',
    tier: 'bronze',
    points: 10,
    name: 'Umbral difícil',
    desc: 'Llega al nivel 6 en el camino Difícil',
    stat: 'hardLevel',
    goal: 6,
  },
  {
    id: 'city1',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Primer tramo',
    desc: 'Llega al nivel 6 en Aventura',
    stat: 'maxLevel',
    goal: 6,
  },
  {
    id: 'expert10',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Umbral experto',
    desc: 'Llega al nivel 6 en el camino Experto',
    stat: 'expertLevel',
    goal: 6,
  },
  {
    id: 'heroes2',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Dúo del amanecer',
    desc: 'Juega con 2 héroes distintos',
    stat: 'heroes',
    goal: 2,
  },
  {
    id: 'lv25',
    group: 'adventure',
    tier: 'silver',
    points: 25,
    name: 'Viajero',
    desc: 'Llega al nivel 9 en Aventura',
    stat: 'maxLevel',
    goal: 9,
  },
  {
    id: 'hard75',
    group: 'adventure',
    tier: 'silver',
    points: 30,
    name: 'Cumbre difícil',
    desc: 'Llega al nivel 19 en el camino Difícil',
    stat: 'hardLevel',
    goal: 19,
  },
  {
    id: 'lv50',
    group: 'adventure',
    tier: 'silver',
    points: 35,
    name: 'Medio camino',
    desc: 'Llega al nivel 12 en Aventura',
    stat: 'maxLevel',
    goal: 12,
  },
  {
    id: 'expert50',
    group: 'adventure',
    tier: 'silver',
    points: 40,
    name: 'Acero templado',
    desc: 'Llega al nivel 15 en el camino Experto',
    stat: 'expertLevel',
    goal: 15,
  },
  {
    id: 'lv75',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Entre llamas',
    desc: 'Llega al nivel 16 en Aventura',
    stat: 'maxLevel',
    goal: 16,
  },
  {
    id: 'lv90',
    group: 'adventure',
    tier: 'silver',
    points: 50,
    name: 'Ante la cima',
    desc: 'Llega al nivel 19 en Aventura',
    stat: 'maxLevel',
    goal: 19,
  },
  {
    id: 'heroes',
    group: 'adventure',
    tier: 'silver',
    points: 25,
    name: 'Tres almas',
    desc: 'Juega una partida con cada héroe',
    stat: 'heroes',
    goal: 3,
  },
  {
    id: 'hard25',
    group: 'adventure',
    tier: 'silver',
    points: 35,
    name: 'Ruta exigente',
    desc: 'Llega al nivel 9 en el camino Difícil',
    stat: 'hardLevel',
    goal: 9,
  },
  {
    id: 'hard50',
    group: 'adventure',
    tier: 'silver',
    points: 50,
    name: 'Sendero difícil',
    desc: 'Llega al nivel 15 en el camino Difícil',
    stat: 'hardLevel',
    goal: 15,
  },
  {
    id: 'expert25',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Paso de acero',
    desc: 'Llega al nivel 9 en el camino Experto',
    stat: 'expertLevel',
    goal: 9,
  },
  {
    id: 'lv100',
    group: 'adventure',
    tier: 'gold',
    points: 80,
    name: 'El trono vacío',
    desc: 'Llega al nivel 21 en Aventura',
    stat: 'maxLevel',
    goal: 21,
  },
  {
    id: 'done',
    group: 'adventure',
    tier: 'gold',
    points: 85,
    name: 'Amanece en Thyes',
    desc: 'Completa un camino entero',
    stat: 'completed',
    goal: 1,
  },
  {
    id: 'hard100',
    group: 'adventure',
    tier: 'gold',
    points: 100,
    name: 'Conquistador difícil',
    desc: 'Completa el camino Difícil',
    stat: 'hardDone',
    goal: 1,
  },
  {
    id: 'expert',
    group: 'adventure',
    tier: 'gold',
    points: 120,
    name: 'Solo para expertos',
    desc: 'Completa el camino Experto',
    stat: 'expertDone',
    goal: 1,
  },
  {
    id: 'paths3',
    group: 'adventure',
    tier: 'gold',
    points: 150,
    name: 'Tres amaneceres',
    desc: 'Completa los tres caminos',
    stat: 'paths',
    goal: 3,
  },

  // ===== 2. Maestría (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'pact1',
    group: 'mastery',
    tier: 'bronze',
    points: 10,
    name: 'Primer pacto',
    desc: 'Elige tu primer Pacto del destino',
    stat: 'pacts',
    goal: 1,
  },
  {
    id: 'perf5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Buen ojo',
    desc: 'Resuelve 35 tableros en el mínimo',
    stat: 'perfects',
    goal: 35,
  },
  {
    id: 'goldSeal1',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Buen pulso',
    desc: 'Encadena 6 tableros seguidos en racha',
    stat: 'bestRunStreak',
    goal: 6,
  },
  {
    id: 'icerock5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primer deshielo',
    desc: 'Resuelve 20 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 20,
  },
  {
    id: 'locks5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primera cerradura',
    desc: 'Resuelve 20 tableros con candados',
    stat: 'locks',
    goal: 20,
  },
  {
    id: 'perf10',
    group: 'mastery',
    tier: 'silver',
    points: 25,
    name: 'Pulso firme',
    desc: 'Resuelve 75 tableros en el mínimo',
    stat: 'perfects',
    goal: 75,
  },
  {
    id: 'perf25',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Trazo limpio',
    desc: 'Resuelve 140 tableros en el mínimo',
    stat: 'perfects',
    goal: 140,
  },
  {
    id: 'perf50',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Sin un paso de más',
    desc: 'Resuelve 220 tableros en el mínimo',
    stat: 'perfects',
    goal: 220,
  },
  {
    id: 'icerock',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Rompehielos',
    desc: 'Resuelve 55 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 55,
  },
  {
    id: 'locks',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Cerrajero',
    desc: 'Resuelve 55 tableros con candados',
    stat: 'locks',
    goal: 55,
  },
  {
    id: 'heavy10',
    group: 'mastery',
    tier: 'silver',
    points: 25,
    name: 'Brazo firme',
    desc: 'Resuelve 20 tableros con bloques pesados',
    stat: 'heavyBoards',
    goal: 20,
  },
  {
    id: 'heavy25',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Peso pluma',
    desc: 'Resuelve 55 tableros con bloques pesados',
    stat: 'heavyBoards',
    goal: 55,
  },
  {
    id: 'fate9',
    group: 'mastery',
    tier: 'silver',
    points: 30,
    name: 'Mano completa',
    desc: 'Elige 12 cartas del destino',
    stat: 'fateCards',
    goal: 12,
  },
  {
    id: 'fate27',
    group: 'mastery',
    tier: 'silver',
    points: 45,
    name: 'Lector del destino',
    desc: 'Elige 36 cartas del destino',
    stat: 'fateCards',
    goal: 36,
  },
  {
    id: 'clean',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Sin ayuda',
    desc: 'Supera 7 tramos sin usar pistas',
    stat: 'cleanCity',
    goal: 7,
  },
  {
    id: 'perf100',
    group: 'mastery',
    tier: 'gold',
    points: 100,
    name: 'Perfección absoluta',
    desc: 'Resuelve 400 tableros en el mínimo',
    stat: 'perfects',
    goal: 400,
  },
  {
    id: 'perf200',
    group: 'mastery',
    tier: 'gold',
    points: 130,
    name: 'Mente maestra',
    desc: 'Resuelve 650 tableros en el mínimo',
    stat: 'perfects',
    goal: 650,
  },
  {
    id: 'icerock75',
    group: 'mastery',
    tier: 'gold',
    points: 85,
    name: 'Señor del glaciar',
    desc: 'Resuelve 160 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 160,
  },
  {
    id: 'fate81',
    group: 'mastery',
    tier: 'gold',
    points: 95,
    name: 'Tejedor del destino',
    desc: 'Elige 100 cartas del destino',
    stat: 'fateCards',
    goal: 100,
  },
  {
    id: 'clean5',
    group: 'mastery',
    tier: 'gold',
    points: 110,
    name: 'Sabiduría pura',
    desc: 'Supera 21 tramos sin usar pistas',
    stat: 'cleanCity',
    goal: 21,
  },

  // ===== 3. Desafío (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'chBoard1',
    group: 'challenge',
    tier: 'bronze',
    points: 10,
    name: 'Primer desafío',
    desc: 'Supera tu primer tablero en Desafío',
    stat: 'challengeBoards',
    goal: 1,
  },
  {
    id: 'chBoard3',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Calentando la senda',
    desc: 'Supera 3 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 3,
  },
  {
    id: 'chRelicUse',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Poder de reliquia',
    desc: 'Usa una reliquia en Desafío',
    stat: 'challengeRelicsUsed',
    goal: 1,
  },
  {
    id: 'chLvl5',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Cinco seguidos',
    desc: 'Alcanza el nivel 5 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 5,
  },
  {
    id: 'chRoutes2',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Dos sendas',
    desc: 'Juega en 2 rutas de Desafío',
    stat: 'challengeRoutesPlayed',
    goal: 2,
  },
  {
    id: 'chBoard10',
    group: 'challenge',
    tier: 'silver',
    points: 25,
    name: 'Ritmo constante',
    desc: 'Supera 10 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 10,
  },
  {
    id: 'chBoard20',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Paso firme',
    desc: 'Supera 20 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 20,
  },
  {
    id: 'chBoard30',
    group: 'challenge',
    tier: 'silver',
    points: 40,
    name: 'Mente templada',
    desc: 'Supera 30 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 30,
  },
  {
    id: 'chBoard50',
    group: 'challenge',
    tier: 'silver',
    points: 50,
    name: 'Resistencia pura',
    desc: 'Supera 50 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 50,
  },
  {
    id: 'chRelicUse10',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Maestro de reliquias',
    desc: 'Usa reliquias 10 veces en Desafío',
    stat: 'challengeRelicsUsed',
    goal: 10,
  },
  {
    id: 'chRelics3',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Tres reliquias',
    desc: 'Prueba las 3 reliquias de Desafío',
    stat: 'challengeRelics',
    goal: 3,
  },
  {
    id: 'chRoutes3',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Explorador de sendas',
    desc: 'Juega en las 3 rutas de Desafío',
    stat: 'challengeRoutesPlayed',
    goal: 3,
  },
  {
    id: 'chLvl8',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Octava prueba',
    desc: 'Alcanza el nivel 8 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 8,
  },
  {
    id: 'chLvl10',
    group: 'challenge',
    tier: 'silver',
    points: 40,
    name: 'Diez seguidos',
    desc: 'Alcanza el nivel 10 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 10,
  },
  {
    id: 'chLvl14',
    group: 'challenge',
    tier: 'silver',
    points: 50,
    name: 'A las puertas',
    desc: 'Alcanza el nivel 14 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 14,
  },
  {
    id: 'chBoard100',
    group: 'challenge',
    tier: 'gold',
    points: 90,
    name: 'Incansable',
    desc: 'Supera 100 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 100,
  },
  {
    id: 'ch150',
    group: 'challenge',
    tier: 'gold',
    points: 80,
    name: 'Senda Breve dominada',
    desc: 'Completa el Desafío de 150 turnos',
    stat: 'challenge150Won',
    goal: 1,
  },
  {
    id: 'ch200',
    group: 'challenge',
    tier: 'gold',
    points: 100,
    name: 'Senda Firme dominada',
    desc: 'Completa el Desafío de 200 turnos',
    stat: 'challenge200Won',
    goal: 1,
  },
  {
    id: 'ch250',
    group: 'challenge',
    tier: 'gold',
    points: 120,
    name: 'Senda Eterna dominada',
    desc: 'Completa el Desafío de 250 turnos',
    stat: 'challenge250Won',
    goal: 1,
  },
  {
    id: 'chAll',
    group: 'challenge',
    tier: 'gold',
    points: 150,
    name: 'Señor del Desafío',
    desc: 'Completa las 3 rutas de Desafío',
    stat: 'challengeWonCount',
    goal: 3,
  },

  // ===== 4. Retos diarios (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'day1',
    group: 'daily',
    tier: 'bronze',
    points: 10,
    name: 'Buenos días',
    desc: 'Resuelve tu primer reto diario',
    stat: 'dailySolved',
    goal: 1,
  },
  {
    id: 'day3',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Tres mañanas',
    desc: 'Resuelve 3 retos diarios',
    stat: 'dailySolved',
    goal: 3,
  },
  {
    id: 'gold1',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Primer oro diario',
    desc: 'Gana tu primera medalla de oro diaria',
    stat: 'dailyGold',
    goal: 1,
  },
  {
    id: 'streak2',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Dos días seguidos',
    desc: 'Racha de 2 días',
    stat: 'bestStreak',
    goal: 2,
  },
  {
    id: 'kinds2',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Variedad diaria',
    desc: 'Resuelve 2 tipos de reto diario',
    stat: 'dailyKinds',
    goal: 2,
  },
  {
    id: 'day7',
    group: 'daily',
    tier: 'silver',
    points: 30,
    name: 'Costumbre',
    desc: 'Resuelve 7 retos diarios',
    stat: 'dailySolved',
    goal: 7,
  },
  {
    id: 'day15',
    group: 'daily',
    tier: 'silver',
    points: 35,
    name: 'Quincena resuelta',
    desc: 'Resuelve 15 retos diarios',
    stat: 'dailySolved',
    goal: 15,
  },
  {
    id: 'day30',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Ritual del amanecer',
    desc: 'Resuelve 30 retos diarios',
    stat: 'dailySolved',
    goal: 30,
  },
  {
    id: 'kinds',
    group: 'daily',
    tier: 'silver',
    points: 40,
    name: 'Coleccionista de retos',
    desc: 'Resuelve cada tipo de reto diario',
    stat: 'dailyKinds',
    goal: CHALLENGES.length,
  },
  {
    id: 'streak3',
    group: 'daily',
    tier: 'silver',
    points: 25,
    name: 'Tres de tres',
    desc: 'Racha de 3 días',
    stat: 'bestStreak',
    goal: 3,
  },
  {
    id: 'streak7',
    group: 'daily',
    tier: 'silver',
    points: 40,
    name: 'Una semana',
    desc: 'Racha de 7 días',
    stat: 'bestStreak',
    goal: 7,
  },
  {
    id: 'streak14',
    group: 'daily',
    tier: 'silver',
    points: 55,
    name: 'Dos semanas',
    desc: 'Racha de 14 días',
    stat: 'bestStreak',
    goal: 14,
  },
  {
    id: 'gold5',
    group: 'daily',
    tier: 'silver',
    points: 35,
    name: 'Brillo constante',
    desc: 'Gana 5 medallas de oro',
    stat: 'dailyGold',
    goal: 5,
  },
  {
    id: 'gold10',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Oro puro',
    desc: 'Gana 10 medallas de oro',
    stat: 'dailyGold',
    goal: 10,
  },
  {
    id: 'master',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Maestro del umbral',
    desc: 'Resuelve el reto Todo junto',
    stat: 'masterSolved',
    goal: 1,
  },
  {
    id: 'day100',
    group: 'daily',
    tier: 'gold',
    points: 110,
    name: 'Cien amaneceres',
    desc: 'Resuelve 100 retos diarios',
    stat: 'dailySolved',
    goal: 100,
  },
  {
    id: 'streak30',
    group: 'daily',
    tier: 'gold',
    points: 110,
    name: 'Un mes entero',
    desc: 'Racha de 30 días',
    stat: 'bestStreak',
    goal: 30,
  },
  {
    id: 'gold25',
    group: 'daily',
    tier: 'gold',
    points: 115,
    name: 'Corona de oro',
    desc: 'Gana 25 medallas de oro',
    stat: 'dailyGold',
    goal: 25,
  },
  {
    id: 'day50',
    group: 'daily',
    tier: 'gold',
    points: 100,
    name: 'Medio centenar',
    desc: 'Resuelve 50 retos diarios',
    stat: 'dailySolved',
    goal: 50,
  },
  {
    id: 'master5',
    group: 'daily',
    tier: 'gold',
    points: 100,
    name: 'Leyenda del umbral',
    desc: 'Resuelve 5 retos Todo junto',
    stat: 'masterSolved',
    goal: 5,
  },

  // ===== 5. Colección (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'streak10',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Mano firme',
    desc: 'Encadena una racha de 10 tableros en una partida',
    stat: 'bestRunStreak',
    goal: 10,
  },
  {
    id: 'power1',
    group: 'collection',
    tier: 'bronze',
    points: 10,
    name: 'Primera chispa',
    desc: 'Activa el poder de un héroe 15 veces',
    stat: 'powersUsed',
    goal: 15,
  },
  {
    id: 'shop1',
    group: 'collection',
    tier: 'bronze',
    points: 10,
    name: 'Primera baraja',
    desc: 'Elige 6 Cartas del destino',
    stat: 'fateCards',
    goal: 6,
  },
  {
    id: 'score1k',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Primer botín',
    desc: 'Alcanza 15.000 puntos en una partida',
    stat: 'bestScore',
    goal: 15000,
  },
  {
    id: 'cosmetic1',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Primer estilo',
    desc: 'Canjea tu primer objeto en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 1,
  },
  {
    id: 'mini1',
    group: 'collection',
    tier: 'silver',
    points: 25,
    name: 'Pactante',
    desc: 'Elige 8 Pactos del destino',
    stat: 'pacts',
    goal: 8,
  },
  {
    id: 'mini3',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Sin miedo al costo',
    desc: 'Elige 25 Pactos del destino',
    stat: 'pacts',
    goal: 25,
  },
  {
    id: 'mini5',
    group: 'collection',
    tier: 'silver',
    points: 45,
    name: 'Baraja vivida',
    desc: 'Elige 60 Cartas del destino',
    stat: 'fateCards',
    goal: 60,
  },
  {
    id: 'boards50',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Sesenta llaves',
    desc: 'Resuelve 63 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 63,
  },
  {
    id: 'boards100',
    group: 'collection',
    tier: 'silver',
    points: 50,
    name: 'Ciento cuarenta llaves',
    desc: 'Resuelve 147 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 147,
  },
  {
    id: 'power5',
    group: 'collection',
    tier: 'silver',
    points: 25,
    name: 'Despertar',
    desc: 'Activa el poder de un héroe 60 veces',
    stat: 'powersUsed',
    goal: 60,
  },
  {
    id: 'power25',
    group: 'collection',
    tier: 'silver',
    points: 45,
    name: 'Fuerza interior',
    desc: 'Activa el poder de un héroe 220 veces',
    stat: 'powersUsed',
    goal: 220,
  },
  {
    id: 'shop5',
    group: 'collection',
    tier: 'silver',
    points: 30,
    name: 'Imparable',
    desc: 'Encadena una racha de 15 tableros en una partida',
    stat: 'bestRunStreak',
    goal: 15,
  },
  {
    id: 'score5k',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Tesoro del amanecer',
    desc: 'Alcanza 45.000 puntos en una partida',
    stat: 'bestScore',
    goal: 45000,
  },
  {
    id: 'cosmetic5',
    group: 'collection',
    tier: 'silver',
    points: 40,
    name: 'Armario en marcha',
    desc: 'Canjea 5 objetos en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 5,
  },
  {
    id: 'mini9',
    group: 'collection',
    tier: 'gold',
    points: 100,
    name: 'Viajero incansable',
    desc: 'Completa 8 aventuras enteras',
    stat: 'completed',
    goal: 8,
  },
  {
    id: 'boards250',
    group: 'collection',
    tier: 'gold',
    points: 100,
    name: 'Guardián de llaves',
    desc: 'Resuelve 315 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 315,
  },
  {
    id: 'score25k',
    group: 'collection',
    tier: 'gold',
    points: 95,
    name: 'Fortuna real',
    desc: 'Alcanza 80.000 puntos en una partida',
    stat: 'bestScore',
    goal: 80000,
  },
  {
    id: 'cosmetic15',
    group: 'collection',
    tier: 'gold',
    points: 90,
    name: 'Coleccionista del amanecer',
    desc: 'Canjea 15 objetos en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 15,
  },
  {
    id: 'cosmetic30',
    group: 'collection',
    tier: 'gold',
    points: 130,
    name: 'Galería completa',
    desc: 'Canjea 30 objetos en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 30,
  },
  // ===== Nuevos (rebalance del roguelite): rangos, héroes, reliquias, cartas y retos combinados =====
  {
    id: 'gradeS',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Amanecer brillante',
    desc: 'Completa una aventura con rango S o mejor',
    stat: 'bestGrade',
    goal: 4,
  },
  {
    id: 'gradeSPlus',
    group: 'adventure',
    tier: 'gold',
    points: 130,
    name: 'Sol sin sombra',
    desc: 'Completa una aventura con rango S+',
    stat: 'bestGrade',
    goal: 5,
  },
  {
    id: 'relics3',
    group: 'adventure',
    tier: 'silver',
    points: 30,
    name: 'Relicario',
    desc: 'Juega una aventura con cada reliquia',
    stat: 'relicsSeenCount',
    goal: 3,
  },
  {
    id: 'heroWins3',
    group: 'adventure',
    tier: 'gold',
    points: 140,
    name: 'Trío legendario',
    desc: 'Completa una aventura con cada héroe',
    stat: 'heroWinsCount',
    goal: 3,
  },
  {
    id: 'cleanRun',
    group: 'adventure',
    tier: 'gold',
    points: 130,
    name: 'Sin mapa',
    desc: 'Completa una aventura sin usar ninguna pista',
    stat: 'cleanRun',
    goal: 1,
  },
  {
    id: 'oathWin',
    group: 'adventure',
    tier: 'gold',
    points: 140,
    name: 'Fiel al juramento',
    desc: 'Completa una aventura con el Pacto Juramento',
    stat: 'oathWin',
    goal: 1,
  },
  {
    id: 'ember25',
    group: 'mastery',
    tier: 'silver',
    points: 40,
    name: 'Brasa intacta',
    desc: 'Termina 25 tableros con Lía sin tocar su reserva',
    stat: 'emberBoards',
    goal: 25,
  },
  {
    id: 'pacts3win',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Tratante del destino',
    desc: 'Completa una aventura llevando 3 Pactos',
    stat: 'maxPactsWin',
    goal: 3,
  },
  {
    id: 'fateCap',
    group: 'mastery',
    tier: 'gold',
    points: 100,
    name: 'Destino desbordado',
    desc: 'Gana un tablero con tus cartas en el tope de +90 % de puntos',
    stat: 'fateCap',
    goal: 1,
  },
  {
    id: 'fateAll',
    group: 'mastery',
    tier: 'gold',
    points: 120,
    name: 'Baraja completa',
    desc: 'Elige alguna vez las 31 cartas del destino',
    stat: 'fateSeenCount',
    goal: 31,
  },
  {
    id: 'streak21',
    group: 'mastery',
    tier: 'gold',
    points: 150,
    name: 'Racha del amanecer',
    desc: 'Encadena los 21 tableros de una aventura en racha',
    stat: 'bestRunStreak',
    goal: 21,
  },
  {
    id: 'dailyAll',
    group: 'daily',
    tier: 'silver',
    points: 50,
    name: 'Día completo',
    desc: 'Completa los 5 retos diarios el mismo día',
    stat: 'dailyBestDay',
    goal: 5,
  },
  {
    id: 'chPure',
    group: 'challenge',
    tier: 'gold',
    points: 140,
    name: 'Manos desnudas',
    desc: 'Completa una senda de Desafío sin usar la reliquia',
    stat: 'challengePure',
    goal: 1,
  },
];

export const isDone = (a, stats) => (stats[a.stat] || 0) >= a.goal;

/**
 * Marca en `store.ach` los logros recién cumplidos y los devuelve.
 * Los logros ya no se ven ni se reclaman: son el registro interno de acciones (y viajan en el código QR de guardado).
 * Lo que el jugador ve es Personalizar: cada objeto se desbloquea solo con una acción (ver UNLOCKS).
 */
export function claimAchievements(store, now = Date.now()) {
  const stats = statsOf(store),
    got = (store.ach ||= {}),
    fresh = [];
  for (const a of ACHIEVEMENTS)
    if (!got[a.id] && isDone(a, stats)) {
      got[a.id] = now;
      fresh.push(a);
    }
  return fresh;
}

/* ───────────── Personalizar: desbloqueo por acciones ───────────── */

/** Categorías de Personalizar (en este orden). `outfit` = conjuntos de traje de los héroes. */
export const CUSTOM_TYPES = [
  'board',
  'pieces',
  'key',
  'card',
  'trail',
  'fx',
  'music',
  'cover',
  'bg',
  'aura',
  'ui',
  'outfit',
];

/**
 * Qué hay que hacer en el juego para desbloquear cada objeto. No hay puntos ni canje: al cumplir la acción,
 * el objeto queda tuyo (se anota en `shopOwned`). Las claves son `tipo:id`; los que no aparecen vienen de serie.
 * `stat` es una de las estadísticas de STATS; `goal` el valor a alcanzar.
 */
/**
 * Texto de la acción que pide cada estadística («Resuelve 30 tableros en Aventura»). Los textos llevan el número dentro:
 * las traducciones son plantillas con {n} (src/i18n/*-game.js), no una entrada por cada número.
 */
export const UNLOCK_TEXT = {
  boardsSolved: (n) => (n === 1 ? 'Resuelve tu primer tablero en Aventura' : `Resuelve ${n} tableros en Aventura`),
  maxLevel: (n) => `Llega al nivel ${n} en Aventura`,
  hardLevel: (n) => `Llega al nivel ${n} en el camino Difícil`,
  expertLevel: (n) => `Llega al nivel ${n} en el camino Experto`,
  hardDone: () => 'Completa el camino Difícil',
  expertDone: () => 'Completa el camino Experto',
  paths: () => 'Completa los tres caminos',
  completed: (n) => (n === 1 ? 'Completa una aventura entera' : `Completa ${n} aventuras enteras`),
  heroes: (n) => (n >= 3 ? 'Juega una partida con cada héroe' : `Juega con ${n} héroes distintos`),
  heroWinLia: () => 'Completa una aventura con Lía',
  heroWinJean: () => 'Completa una aventura con Jean',
  heroWinVan: () => 'Completa una aventura con Juth',
  heroWinsCount: () => 'Completa una aventura con cada héroe',
  heroBoardsLia: (n) => `Resuelve ${n} tableros con Lía`,
  heroBoardsJean: (n) => `Resuelve ${n} tableros con Jean`,
  heroBoardsVan: (n) => `Resuelve ${n} tableros con Juth`,
  perfects: (n) => `Resuelve ${n} tableros en el mínimo de movimientos`,
  iceRock: (n) => `Resuelve ${n} tableros con rocas o hielo`,
  locks: (n) => `Resuelve ${n} tableros con candados`,
  heavyBoards: (n) => `Resuelve ${n} tableros con bloques pesados`,
  cleanCity: (n) => `Supera ${n} tramos sin usar pistas`,
  fateCards: (n) => `Elige ${n} cartas del destino`,
  fateSeenCount: (n) => `Elige alguna vez ${n} cartas del destino distintas`,
  pacts: (n) => `Elige ${n} Pactos del destino`,
  powersUsed: (n) => `Activa ${n} veces el poder de un héroe`,
  bestRunStreak: (n) => `Encadena una racha de ${n} tableros en una partida`,
  bestGrade: (n) =>
    n >= 5
      ? 'Completa una aventura con rango S+'
      : n === 4
        ? 'Completa una aventura con rango S o mejor'
        : 'Completa una aventura con rango A o mejor',
  dailySolved: (n) => (n === 1 ? 'Resuelve un reto diario' : `Resuelve ${n} retos diarios`),
  dailyGold: (n) => `Gana ${n} medallas de oro en retos diarios`,
  bestStreak: (n) => `Juega retos diarios ${n} días seguidos`,
  dailyKinds: (n) => (n >= 5 ? 'Resuelve los 5 tipos de reto diario' : `Resuelve ${n} tipos de reto diario`),
  masterSolved: (n) => `Resuelve ${n} retos diarios Todo junto`,
  challengeBoards: (n) => `Supera ${n} tableros en Desafío`,
  challengeBest: (n) => `Alcanza el nivel ${n} en cualquier ruta de Desafío`,
  challengeWonCount: (n) => (n >= 3 ? 'Completa las 3 rutas de Desafío' : `Completa ${n} rutas de Desafío`),
  maxPactsWin: (n) => `Completa una aventura llevando ${n} Pactos`,
  cleanRun: () => 'Completa una aventura sin usar ninguna pista',
  oathWin: () => 'Completa una aventura con el Pacto Juramento',
  relicsSeenCount: (n) => `Usa ${n} reliquias distintas`,
  challenge250Won: () => 'Completa el Desafío de 250 turnos',
};
export const unlockText = (stat, goal) => UNLOCK_TEXT[stat]?.(goal) || '';

/**
 * Qué hay que hacer en el juego para desbloquear cada objeto (clave `tipo:id`). Sale de PLAN (unlock-plan.js, generado por
 * scripts/plan-unlocks.mjs). Los que no aparecen vienen de serie. Cada uno pide una o varias condiciones (`reqs`), todas a la vez:
 * las legendarias piden tres (una de Aventura, otra de Desafío y otra de Retos diarios). `stat` es una de las STATS.
 */
export const UNLOCKS = Object.fromEntries(
  Object.entries(PLAN).flatMap(([type, items]) =>
    Object.entries(items).map(([id, list]) => {
      const reqs = list.map(([stat, goal]) => ({ stat, goal, text: unlockText(stat, goal) }));
      // `stat`, `goal` y `text` son los de la primera condición (para quien solo necesita una)
      return [rewardKey(type, id), { reqs, ...reqs[0] }];
    }),
  ),
);

export const unlockOf = (type, id) => UNLOCKS[rewardKey(type, id)] || null;

/** Avance hacia el desbloqueo de un objeto: { value, goal, done } (los de serie cuentan como hechos). */
export function unlockProgress(type, id, store = {}) {
  const u = unlockOf(type, id);
  if (!u) return { value: 1, goal: 1, done: true, reqs: [] };
  const reqs = u.reqs.map((r) => {
    const value = Math.min(r.goal, Number(STATS[r.stat]?.(store)) || 0);
    return { text: r.text, value, goal: r.goal, done: value >= r.goal };
  });
  const done = reqs.every((r) => r.done);
  if (reqs.length === 1) return { value: reqs[0].value, goal: reqs[0].goal, done, reqs };
  // Varias condiciones: el avance es la media de todas, en porcentaje
  const ratio = reqs.reduce((sum, r) => sum + r.value / r.goal, 0) / reqs.length;
  return { value: Math.round(ratio * 100), goal: 100, done, reqs };
}

/**
 * Cierra lo que quedó abierto con reglas de desbloqueo anteriores y todavía no se cumple con las actuales: los objetos nuevos de
 * Personalizar y los atuendos. Lo que ya existía antes (LEGACY_REWARDS, comprado con puntos) se conserva siempre.
 * Las estadísticas solo suben, así que lo ganado de verdad nunca se pierde. Devuelve true si cambió algo.
 */
export function revalidateUnlocks(store) {
  let changed = false;
  for (const key of Object.keys(store.shopOwned || {})) {
    const [type, id] = key.split(':');
    if (!CUSTOM_TYPES.includes(type) || LEGACY_REWARDS[type]?.includes(id) || !UNLOCKS[key]) continue;
    if (!unlockProgress(type, id, store).done) {
      delete store.shopOwned[key];
      changed = true;
    }
  }
  for (const key of Object.keys(store.outfitsOwned || {}))
    if (!unlockProgress('outfit', key, store).done) {
      delete store.outfitsOwned[key];
      changed = true;
    }
  return changed;
}

/** Desbloquea (y guarda en `shopOwned`) los objetos cuya acción ya está cumplida. Devuelve los nuevos. */
export function unlockRewards(store, now = Date.now()) {
  const owned = (store.shopOwned ||= {}),
    fresh = [];
  for (const type of CUSTOM_TYPES)
    for (const item of REWARDS[type] || []) {
      const key = rewardKey(type, item.id);
      if (owned[key] || !UNLOCKS[key] || !unlockProgress(type, item.id, store).done) continue;
      owned[key] = now;
      fresh.push({ type, item });
    }
  return [...fresh, ...unlockOutfits(store, now)];
}

/**
 * Atuendos: 10 conjuntos de traje por héroe, 15 en todos (el primero es el de serie). Cada uno cambia al héroe en la aventura
 * (cuerpo entero) y en la selección de personaje (busto y pose). Las imágenes salen de scripts/slice-outfits.mjs.
 * El id interno de Juth sigue siendo `van`.
 */
/** [id, nombre, rareza]; se ordenan de más común a más raro (el de serie primero). La rareza sigue el diseño del traje. */
const outfits = (list) =>
  list
    .map(([id, name, rarity]) => ({ id, name, rarity }))
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
/** Traje de serie de cada héroe (el primero de su primera lámina): no hay que desbloquearlo. */
export const DEFAULT_OUTFIT = { lia: 'capitana', jean: 'vigia', van: 'escriba' };
export const OUTFITS = {
  lia: outfits([
    ['capitana', 'Capitana del alba', 'common'],
    ['aviadora', 'Aviadora de las cumbres', 'common'],
    ['arquera', 'Arquera del bosque', 'common'],
    ['cartografa', 'Cartógrafa', 'common'],
    ['alquimista', 'Alquimista errante', 'rare'],
    ['buscatesoros', 'Buscatesoros', 'rare'],
    ['ingeniera', 'Ingeniera de luz', 'rare'],
    ['mecanica', 'Mecánica de la forja', 'rare'],
    ['piloto', 'Piloto estelar', 'epic'],
    ['neon', 'Hackeadora neón', 'epic'],
    ['violeta', 'Hechicera violeta', 'epic'],
    ['brasas', 'Hechicera de las brasas', 'legendary'],
    ['vampira', 'Dama vampira', 'legendary'],
    ['lunar', 'Maga lunar', 'legendary'],
    ['guerrera', 'Guerrera carmesí', 'legendary'],
  ]),
  jean: outfits([
    ['vigia', 'Vigía del reloj', 'common'],
    ['aviador', 'Aviador de las cumbres', 'common'],
    ['nomada', 'Nómada del polvo', 'common'],
    ['astronomo', 'Astrónomo', 'common'],
    ['relojero', 'Relojero carmesí', 'rare'],
    ['erudito', 'Erudito', 'rare'],
    ['arqueologo', 'Arqueólogo', 'rare'],
    ['principe', 'Príncipe de las arenas', 'rare'],
    ['centurion', 'Centurión del sol', 'epic'],
    ['astrologo', 'Astrólogo estelar', 'epic'],
    ['sakura', 'Ninja de las flores', 'epic'],
    ['cibernetico', 'Sombra cibernética', 'epic'],
    ['oni', 'Máscara oni', 'legendary'],
    ['violeta', 'Hacker violeta', 'legendary'],
    ['shogun', 'Shogun dorado', 'legendary'],
  ]),
  van: outfits([
    ['escriba', 'Escriba astral', 'common'],
    ['navegante', 'Navegante', 'common'],
    ['maga', 'Maga de la pluma', 'common'],
    ['boticaria', 'Boticaria', 'common'],
    ['oraculo', 'Oráculo del laurel', 'rare'],
    ['carmesi', 'Hechicera carmesí', 'rare'],
    ['astral', 'Hechicera del cosmos', 'rare'],
    ['verde', 'Alquimista del veneno', 'rare'],
    ['cuervo', 'Doctora cuervo', 'epic'],
    ['dama', 'Dama carmesí', 'epic'],
    ['cuervera', 'Bruja de plumas', 'epic'],
    ['guardiana', 'Guardiana del tiempo', 'epic'],
    ['necromante', 'Reina necromante', 'legendary'],
    ['espinas', 'Reina de espinas', 'legendary'],
    ['cuervos', 'Señora de los cuervos', 'legendary'],
  ]),
};

const outfitKey = (hero, id) => `${hero}:${id}`;
export const outfitUnlocked = (store, hero, id) =>
  id === DEFAULT_OUTFIT[hero] || !!store?.outfitsOwned?.[outfitKey(hero, id)];

/** Desbloquea los atuendos cuya acción ya está cumplida. Devuelve los nuevos como { type: 'outfit', item }. */
export function unlockOutfits(store, now = Date.now()) {
  const owned = (store.outfitsOwned ||= {}),
    fresh = [];
  for (const [hero, list] of Object.entries(OUTFITS))
    for (const o of list.slice(1)) {
      const key = outfitKey(hero, o.id);
      if (owned[key] || !unlockProgress('outfit', key, store).done) continue;
      owned[key] = now;
      fresh.push({ type: 'outfit', hero, item: o });
    }
  return fresh;
}

/** Atuendo puesto por un héroe (`base` si no hay o aún no está desbloqueado). */
export function outfitOf(store = {}, hero) {
  const id = store.outfit?.[hero];
  return id && OUTFITS[hero]?.some((o) => o.id === id) && outfitUnlocked(store, hero, id) ? id : DEFAULT_OUTFIT[hero];
}

export function setOutfit(store, hero, id) {
  if (!OUTFITS[hero]?.some((o) => o.id === id) || !outfitUnlocked(store, hero, id)) return false;
  store.outfit = { ...store.outfit, [hero]: id };
  return true;
}

/** Imagen de un atuendo: `adv` cuerpo entero (aventura), `sel` busto y `act` pose (selección). */
export const outfitArt = (hero, id, pose) => `heroes/outfits/${hero}-${id}-${pose}.webp?v=3`;

export function rewardUnlocked(type, id, storeOrOwned = {}) {
  if (DEFAULT_LOOK[type] === id) return true;
  const owned = storeOrOwned?.shopOwned || storeOrOwned || {};
  return !!owned[rewardKey(type, id)];
}

export function lookOf(store = {}) {
  const look = { ...DEFAULT_LOOK };
  for (const type of REWARD_TYPES) {
    const id = store.look?.[type];
    if (id && REWARDS[type].some((r) => r.id === id) && rewardUnlocked(type, id, store)) look[type] = id;
  }
  return look;
}

export function setLook(store, type, id) {
  if (!REWARDS[type]?.some((r) => r.id === id) || !rewardUnlocked(type, id, store)) return false;
  store.look = { ...lookOf(store), [type]: id };
  return true;
}
