/**
 * Tablas de Personalizar en formato compacto: una línea por objeto, campos separados por «|».
 *   id | Nombre | precio | rareza [*] | extra
 * Rareza: C común · R rara · E épica · L legendaria; un «*» detrás = diseño animado (se apaga en modo ligero y con
 * «reducir movimiento»). El extra depende de la categoría:
 *   fx     n:velocidad:colores de las partículas (hex sin «#», separados por coma)
 *   trail  colores de la estela (hex sin «#»)
 *   bg     color del brillo del fondo (el fondo es portada/fondos/<id>.webp)
 *   cover  vacío = portada/heroes/<id>.webp recortada; con ruta = esa imagen, sin recorte
 * IMPORTANTE: los id y su orden dentro de cada lista forman parte del formato de transferencia QR (v3+): no reordenar ni
 * quitar (tests/compat.test.js lo comprueba contra una captura). Cada lista se ordena después por rareza (el de serie primero).
 */

export const RARITY = {
  common: { id: 'common', name: 'Común', note: 'Un cambio sencillo y elegante.' },
  rare: { id: 'rare', name: 'Rara', note: 'Materiales con más detalle y relieve.' },
  epic: { id: 'epic', name: 'Épica', note: 'Diseño animado con brillo propio.' },
  legendary: { id: 'legendary', name: 'Legendaria', note: 'La pieza más espectacular de su colección.' },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

const RARITY_OF = { C: 'common', R: 'rare', E: 'epic', L: 'legendary' };
const colors = (s) => s.split(',').map((c) => '#' + c);
/** Convierte una tabla de texto en objetos; `extra(item, campo)` completa los de cada categoría. */
const parse = (text, extra) =>
  text
    .trim()
    .split('\n')
    .map((line) => {
      const [id, name, price, rar, more = ''] = line.split('|');
      const item = { id, name, price: Number(price), rarity: RARITY_OF[rar[0]] };
      if (rar.endsWith('*')) item.anim = true;
      extra?.(item, more);
      return item;
    });
const byRarity = (list) => list.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

const TABLES = {
  board: `
wood|Madera tallada|0|C
slate|Pizarra nocturna|30|C
amber|Ámbar solar|35|C
jade|Jade imperial|45|C
moss|Musgo y piedra|30|C
sand|Arena del desierto|30|C
rose|Cuarzo rosa|35|C
steel|Acero pulido|40|C
marble|Mármol real|65|R
sapphire|Zafiro real|75|R
ivory|Pergamino dorado|90|R
copper|Cobre y verdín|70|R
reef|Arrecife|75|R
lavender|Lavanda nocturna|80|R
forest|Bosque encantado|85|R
bronze|Bronce antiguo|90|R
crimson|Forja carmesí|150|E*
obsidian|Obsidiana real|190|E*
tide|Marea de luna|160|E*
sakura|Jardín de cerezos|200|E*
storm|Tormenta eléctrica|170|E*
lava|Cráter de lava|180|E*
glacier|Glaciar|190|E*
neon|Ciudad neón|200|E*
toxic|Pantano tóxico|210|E*
celestial|Observatorio astral|280|L*
dawnfire|Corona del alba|320|L*
nebula|Nebulosa|300|L*
eclipse|Eclipse total|330|L*
prism|Cristal prismático|350|L*
`,
  pieces: `
paint|Madera pintada|0|C
stone|Piedra tallada|30|C
glass|Vidrio de colores|40|C
clay|Arcilla cocida|30|C
candy|Caramelo|30|C
bamboo|Bambú|35|C
night|Tinta nocturna|75|R
ceramic|Porcelana celeste|65|R
brass|Latón bruñido|90|R
marble|Mármol pulido|70|R
jelly|Gelatina|70|R
copper|Cobre patinado|75|R
pearl|Nácar|85|R
tide|Marea|200|R
volt|Voltaje|210|R
runic|Pergamino rúnico|150|E*
lacquer|Lacado imperial|180|E*
oldgold|Oro viejo|280|E*
frostedge|Escarcha viva|160|E*
neon|Filo de neón|200|E*
silk|Marquetería|80|E*
aurora|Aurora boreal|160|E*
plasma|Plasma|170|E*
holo|Holograma|180|E*
ember|Brasas vivas|320|L*
lava|Esmalte y oro|190|L*
galaxia|Galaxia|300|L*
solar|Corona solar|320|L*
prisma|Prisma|340|L*
abismo|Abismo|360|L*
`,
  key: `
red|Llave roja|0|C
amber|Llave de ámbar|25|C
iron|Llave de hierro antiguo|30|C
rose|Llave de coral|40|C
jade|Llave de jade|30|C
copper|Llave de cobre|30|C
lilac|Llave de lavanda|35|C
bone|Llave de hueso|35|C
emerald|Llave de esmeralda|65|R
sapphire|Llave de zafiro|70|R
crystal|Llave de cristal|90|R
moon|Llave lunar|110|R
ocean|Llave del océano|70|R
topaz|Llave de topacio|75|R
ruby|Llave de rubí|80|R
frost|Llave de escarcha|85|R
forest|Llave del bosque|70|R
obsidian|Llave de obsidiana|150|E*
star|Llave de estrellas|190|E*
phoenix|Llave del fénix|220|E*
storm|Llave de tormenta|160|E*
toxic|Llave tóxica|170|E*
aurora|Llave de aurora|180|E*
magma|Llave de magma|190|E*
neon|Llave de esmalte|200|E*
gold|Llave dorada|280|L*
eclipse|Llave del eclipse|340|L*
galaxy|Llave del alba|300|L*
dragon|Llave del dragón|320|L*
chrono|Llave del tiempo|340|L*
`,
  fx: `
none|Sin adornos|0|C
embers|Brasas|25|C|26:7:ff9a3d,ffd24a,ff6a3d,fff0b8
sparks|Chispas doradas|30|C|34:9:ffd24a,fff6c9,e0b04f,ffffff
petals|Pétalos|40|C|30:5:ffb7d0,ff8fb8,ffe3ee,f7c6d9
leaves|Hojas de otoño|45|C|30:5:d9772b,e8a23a,b5481f,f2c76b
ink|Salpicadura de tinta|65|R|36:8:150e0c,3a2a44,e0b04f,f3e5c8
frost|Destello glaciar|75|R|40:7:b8f2ff,5fd6ff,ffffff,8ab8ff
stars|Lluvia de estrellas|90|R|44:8:d7c3ff,8fd8ff,ffffff,ffe9ad
confetti|Confeti de fiesta|80|R|52:9:ff5f8f,ffd24a,58d8c8,6cb6ff,b08cff
coins|Lluvia de monedas|95|R|34:7:ffd24a,f2b632,fff1b0,c98d1a
aurora|Aurora|150|E|44:6:58f0c8,8fd8ff,b08cff,e6fff6
prism|Prisma solar|190|E|48:9:ff8a65,ffd54f,4dd0e1,ce93d8,fff8e1
lightning|Relámpago|170|E|40:10:e6f2ff,8fc6ff,b9a6ff,ffffff
phoenix|Vuelo del fénix|300|L|56:8:ff7a2e,ffc23d,ff4a3d,fff0b8
fireworks|Fuegos artificiales|280|L|60:11:ff5f8f,ffd24a,58d8c8,6cb6ff,ffffff
`,
  music: `
menu|Crónicas de la llave roja|0|C
z0|Un corazón al sol|20|C
z1|Vals de las pequeñas velas|20|C
z2|Las hojas recuerdan|25|C
z4|Las horas prestadas|30|C
z3|Campanas de cristal|40|R
heroes|Llamada de los héroes|40|R
z5|La fragua de los sueños|45|R
s0|Contrarreloj|50|R
l0|Brasa entre tréboles|60|R
l2|Té con hojas doradas|65|R
l3|Un abrigo de nieve|70|R
v0|El mapa de las raíces|60|R
s1|Amanecer de acero|80|E
fate|Marcha del destino|85|E
v1|La marea al revés|100|E
z6|El regreso del amanecer|95|L
s2|Cumbre astral|110|L
l6|El baile de las llaves|95|L
v6|La llave olvidada|105|L
`,
  cover: `
alba-arcana|Alba arcana|0|C|
vapor-dorado|Vapor dorado|55|C|
descanso|Descanso en ruta|50|C|
mapa|Rumbo al mapa|50|C|
lia|Lía en solitario|60|R|backgrounds/cover-heroes-lia.webp
van|Van en solitario|60|R|backgrounds/cover-heroes-van.webp
jean|Jean en solitario|60|R|backgrounds/cover-heroes-jean.webp
magia-tiempo|Magia del tiempo|95|R|
magia-engranajes|Magia de engranajes|95|R|
battle|En guardia|140|E|backgrounds/cover-heroes-battle.webp
neon-cibernetico|Neón cibernético|90|E|
magia-digital|Magia digital|175|E|
combate-arcano|Combate arcano|180|E|
combate-vapor|Combate de vapor|185|E|
pelea|Hora de pelear|195|E|
combate-neon|Combate neón|300|E|
victory|Amanecer victorioso|250|L|backgrounds/cover-heroes-victory.webp
noche-carmesi|Noche carmesí|90|L|
magia-sangre|Magia de sangre|170|L|
combate-sombras|Combate de sombras|190|L|
oro|La llave dorada|320|L|
tormenta|Tormenta arcana|340|L|
`,
  card: `
mision|Placa de misión|0|C
pergamino|Pergamino|30|C
pizarra|Pizarra de tiza|30|C
bosque|Madera del bosque|35|C
cuaderno|Cuaderno|35|C
piedra|Muro de piedra|40|C
bronce|Placa de bronce|70|R
cristal|Cristal|75|R
zafiro|Zafiro|80|R
lacre|Lacre carmesí|85|R
jade|Jade imperial|90|R
ticket|Entrada dorada|185|R
neon|Neón|170|E*
forja|Forja|175|E*
hielo|Hielo|180|E*
circuito|Circuito|190|E*
aurora|Aurora|300|L*
galaxia|Galaxia|320|L*
dragon|Escamas de dragón|340|L*
eclipse|Eclipse|360|L*
`,
  bg: `
bosque-cascada|Cascada del bosque|0|C|bfffd8
mirador|Mirador de la montaña|40|C|cfe8ff
muralla|Muralla del estandarte|45|C|ffe8b0
puente-otono|Puente y cascada otoñal|45|C|ffb36a
ciudad-blanca|Ciudad blanca|90|R|fff0c0
ciudad-linternas|Ciudad de linternas|90|R|ffb36a
fortaleza-lunar|Fortaleza lunar|95|R|ff9ad0
ciudad-flotante|Ciudad flotante|95|R|9ad8ff
castillo-rojo|Castillo de luna roja|180|E|ff4a5a
calle-cerezos|Calle bajo los cerezos|180|E|ffb0d8
torii-gigante|Torii y gigante|185|E|ff6a4a
puente-dragon|Puente del dragón|190|E|ff5a5a
neon-luna|Neón y luna|300|L|6ae0ff
plaza-neon|Plaza neón|320|L|c07aff
coloso-neon|Coloso neón|330|L|ff6ad8
santuario-carmesi|Santuario carmesí|340|L|ff3a6a
`,
  trail: `
none|Sin estela|0|C
dust|Polvo de luz|30|C|fff6d6,ffe9ad,f1ce82
embers|Rastro de brasas|35|C|ff9a3d,ffd24a,ff6a3d
leaves|Hojas al viento|40|C|8fcf5a,5fae3d,d9a93a
petals|Pétalos de cerezo|45|C|ffb7d0,ff8fb8,ffe3ee
bubbles|Burbujas|70|R|bdeeff,7fd6ff,ffffff
ink|Tinta china|75|R|1a1220,3a2a44,e0b04f
frost|Copos de nieve|80|R|d6f6ff,8fe0ff,ffffff
sparks|Chispas doradas|90|R|ffd24a,fff6c9,e0b04f
lightning|Rastro eléctrico|170|E|e6f2ff,8fc6ff,b9a6ff
rainbow|Arcoíris|185|E|ff6b6b,ffd24a,58e0a0,6cb6ff,b08cff
starlight|Polvo de estrellas|200|E|d7c3ff,8fd8ff,ffffff,ffe9ad
comet|Cometa|300|L|bfe6ff,6cb6ff,ffffff,ffe9ad
phoenix|Plumas de fénix|320|L|ff7a2e,ffc23d,ff4a3d,fff0b8
eclipse|Sombra del eclipse|340|L|3a1f5c,8a5cd6,ff8ad8,ffffff
`,
  aura: `
none|Cielo despejado|0|C
fireflies|Luciérnagas|35|C
mist|Neblina|40|C
sunmotes|Motas de sol|45|C
drizzle|Lluvia fina|75|R
leaves|Hojas de otoño|80|R
petals|Pétalos cayendo|85|R
snow|Nevada|170|E*
ash|Cenizas ascendentes|180|E*
meteors|Estrellas fugaces|190|E*
storm|Tormenta eléctrica|310|L*
aurora|Aurora boreal|340|L*
`,
  ui: `
ink|Tinta clásica|0|C
thyes|Pergamino de Thyes|40|C
jade|Bosque de jade|45|C
crimson|Noche carmesí|90|R
glacier|Marea glacial|95|R
faro|Oro del Faro|190|E*
neon|Neón|200|E*
eclipse|Eclipse violeta|330|L*
`,
};

const EXTRA = {
  fx: (item, more) => {
    if (!more) return;
    const [n, speed, cols] = more.split(':');
    item.burst = { n: Number(n), colors: colors(cols), speed: Number(speed) };
  },
  trail: (item, more) => more && (item.colors = colors(more)),
  bg: (item, more) => Object.assign(item, { src: `portada/fondos/${item.id}.webp`, full: true, fx: '#' + more }),
  cover: (item, more) =>
    Object.assign(item, more ? { src: more } : { src: `portada/heroes/${item.id}.webp`, cutout: true }),
};

/**
 * Recompensas de Personalizar: la primera de cada tipo es la de serie. Cada categoría se ordena de lo más común a lo más
 * raro; dentro de una misma rareza se conserva el orden en que están escritas.
 */
export const REWARDS = Object.fromEntries(
  Object.entries(TABLES).map(([type, text]) => [type, byRarity(parse(text, EXTRA[type]))]),
);

/** Conjuntos de traje de cada héroe: id | nombre | rareza (el de serie primero dentro de su rareza). */
const OUTFIT_TABLES = {
  lia: `
capitana|Capitana del alba|C
aviadora|Aviadora de las cumbres|C
arquera|Arquera del bosque|C
cartografa|Cartógrafa|C
alquimista|Alquimista errante|R
buscatesoros|Buscatesoros|R
mecanica|Mecánica de la forja|R
ingeniera|Ingeniera de luz|E
piloto|Piloto estelar|E
neon|Hackeadora neón|E
violeta|Hechicera violeta|E
brasas|Hechicera de las brasas|L
vampira|Dama vampira|L
lunar|Maga lunar|L
guerrera|Guerrera carmesí|L
`,
  jean: `
vigia|Vigía del reloj|C
aviador|Aviador de las cumbres|C
nomada|Nómada del polvo|C
astronomo|Astrónomo|C
relojero|Relojero carmesí|R
erudito|Erudito|R
arqueologo|Arqueólogo|R
principe|Príncipe de las arenas|R
centurion|Centurión del sol|E
astrologo|Astrólogo estelar|E
cibernetico|Sombra cibernética|E
oni|Máscara oni|E
sakura|Ninja de las flores|L
violeta|Hacker violeta|L
shogun|Shogun dorado|L
`,
  van: `
escriba|Escriba astral|C
navegante|Navegante|C
maga|Maga de la pluma|C
boticaria|Boticaria|C
oraculo|Oráculo del laurel|R
astral|Hechicera del cosmos|R
verde|Alquimista del veneno|R
carmesi|Hechicera carmesí|E
cuervo|Doctora cuervo|E
dama|Dama carmesí|E
cuervera|Bruja de plumas|E
guardiana|Guardiana del tiempo|E
necromante|Reina necromante|L
espinas|Reina de espinas|L
cuervos|Señora de los cuervos|L
`,
};
export const OUTFITS = Object.fromEntries(
  Object.entries(OUTFIT_TABLES).map(([hero, text]) => [
    hero,
    byRarity(
      text
        .trim()
        .split('\n')
        .map((l) => {
          const [id, name, rar] = l.split('|');
          return { id, name, rarity: RARITY_OF[rar] };
        }),
    ),
  ]),
);
