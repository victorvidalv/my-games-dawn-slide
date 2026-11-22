/* Textos de la guía integrada en los tres idiomas. Viven aparte (no pasan por el traductor del DOM) para que cada frase,
 * con sus <b>, quede completa y revisada en español, inglés y chino. Los datos del juego (héroes, reliquias, cartas)
 * se leen de sus módulos; aquí solo va la explicación. */

const es = {
  tabs: {
    start: 'Empezar',
    heroes: 'Héroes y reliquias',
    modes: 'Modos',
    fate: 'Cartas del destino',
    custom: 'Personalizar y Lore',
    tips: 'Trucos y ajustes',
  },
  banner: {
    kicker: 'MANUAL DEL VIAJERO',
    title: 'Guía de DAWNSLIDE',
    sub: 'Todo lo que necesitas para abrir camino a la llave roja: reglas, héroes, modos, cartas y secretos.',
  },
  zoom: 'Toca la imagen para ampliarla',
  stepsTitle: 'Tu primera partida en 4 pasos',
  steps: [
    [
      'Elige modo y héroe',
      'Pulsa <b>Aventura</b>, escoge <b>Normal</b> y elige a Lía, Jean o Juth junto con una reliquia.',
      'heroes',
      'Selección de héroe y reliquia al empezar la aventura.',
    ],
    [
      'Desliza los bloques',
      'Arrastra cada bloque por su eje: los horizontales van a los lados y los verticales suben o bajan. Un arrastre largo cuenta como <b>1 solo movimiento</b>.',
      'board',
      'El tablero: llave roja, salida ➜, medidor de movimientos y botón de pista.',
    ],
    [
      'Saca la llave roja',
      'Abre camino hasta la flecha de la derecha. El medidor marca el mínimo (la corona) y tu <b>límite de turnos</b>; resolver en el último turno también vale.',
    ],
    [
      'Elige tu destino',
      'Cada 3 niveles terminas una ciudad y eliges <b>1 de 3 cartas</b> que te acompañan hasta el final de la partida.',
    ],
  ],
  goalTitle: 'Puntaje, Perfectos y rachas',
  goal: 'Igualar el mínimo de movimientos es un <b>Perfecto</b>; con 1 o 2 movimientos de más es <b>Casi</b>, y con 3 o más, <b>Mejorable</b>. Los Perfectos encadenan una <b>racha</b> que multiplica los puntos de los niveles siguientes.',
  goal2:
    'Al terminar la aventura recibes un rango final según tu puntaje, tus Perfectos, tu racha y la dificultad elegida.',
  hintTitle: 'Pistas',
  hint: 'El botón <b>Pista</b> te señala el siguiente movimiento útil. Empiezas con 3 y ganas una nueva cada {n} niveles en Normal ({d} en Difícil, {e} en Experto).',
  mechTitle: 'Piezas y mecanismos',
  mechIntro:
    'Mira primero las piezas especiales: una sola roca o una placa puede cambiar el orden de toda la solución.',
  mech: [
    ['Roca', 'Roca fija', 'No se mueve nunca. Despeja el camino rodeándola por las filas y columnas libres.'],
    [
      'Pesada',
      'Bloque pesado',
      'Solo avanza <b>una casilla</b> por movimiento. Reconócelo por el número 1 que lleva marcado.',
    ],
    ['Hielo', 'Bloque de hielo', 'Resbala sin parar hasta chocar con otra pieza, una roca o el borde del tablero.'],
    [
      'Candado',
      'Candado y placa',
      'Otra pieza debe cubrir la placa luminosa del suelo para poder mover el bloque con candado.',
    ],
    [
      'Maleficio',
      'Maleficio',
      'Desde los tramos avanzados el tablero <b>gira</b>. Sigue la flecha para saber por dónde sale la llave.',
    ],
  ],
  shotRocks: 'Nivel 28 · Oasis Dorado: rocas cuadradas y una pieza pesada marcada con un 1.',
  shotIce: 'Nivel 65 · Villa Sakura: bloque de hielo, candado y su placa luminosa.',
  shotCurse: 'Un maleficio gira el tablero: la flecha indica la nueva salida.',

  heroesIntro:
    'Elige un héroe al empezar la aventura. Cada poder resuelve un problema distinto, y puedes cambiar de héroe en cada partida.',
  heroTips: {
    lia: 'Ideal para aprender los caminos, resistir tableros largos y asegurar victorias consistentes. Si no gastas la reserva, la Brasa intacta te da puntos extra.',
    jean: 'Brilla en tableros con hielo o piezas pesadas, donde un mal paso puede cerrar la salida. Rebobina una vez por tablero (dos en los largos).',
    van: 'Perfecto para buscar Perfectos y superar Difícil o Experto: traza parte de la solución, pero gasta turnos y pide al menos cuatro pasos pendientes.',
  },
  relicsTitle: 'Reliquias de Aventura',
  relicsNote: 'Eliges una al empezar y te acompaña toda la partida.',
  chalTitle: 'Reliquias de Desafío',
  chalNote: 'En Desafío eliges una reliquia con una regla propia (por tablero o por partida).',

  modes: [
    {
      img: 'adv',
      tag: '21 NIVELES · 7 CIUDADES',
      title: 'Aventura',
      text: 'Elige un héroe y una reliquia y recorre las siete ciudades de Thyes. Al cerrar cada ciudad eliges una Carta del Destino. Tu partida se guarda sola y puedes continuarla cuando quieras.',
      lock: '<b>Desbloqueo progresivo:</b> empiezas en <b>Normal</b>; al completar sus 21 niveles se abre <b>Difícil</b>, y al completar Difícil, <b>Experto</b>. Más difícil significa más puntos.',
    },
    {
      img: 'survival',
      tag: 'UNA RESERVA, MUCHOS TABLEROS',
      title: 'Desafío',
      text: 'Supera una serie de tableros compartiendo una única reserva de turnos. Cada paso de más reduce tu margen para los siguientes, así que cada decisión cuenta.',
      lock: '<b>Desbloqueo progresivo:</b> la ruta de <b>150 turnos</b> está abierta; al superarla se abre la de <b>200</b>, y al superar esa, la de <b>250</b>.',
    },
    {
      img: 'daily',
      tag: 'TABLEROS NUEVOS CADA DÍA',
      title: 'Retos diarios',
      text: 'Cada reto trae tres tableros iguales para todos los jugadores, que cambian a medianoche. Gana medallas de Oro, Plata o Bronce y suma días de racha.',
      lock: 'Clásico está abierto desde el inicio. {list} se desbloquean al llegar a los niveles {levels}. Una racha de 3, 5 o 7 días regala +1, +2 o +3 pistas al empezar una Aventura nueva.',
    },
  ],
  reviveTitle: 'Segunda oportunidad',
  revive:
    'Si agotas los turnos, puedes renacer gracias a cartas del destino como <b>Fénix</b> o <b>Reencarnación</b>: repites el tablero a cambio de una parte de tus puntos.',

  fateTitle: 'Bendiciones y Pactos',
  fate: 'Al terminar cada ciudad (niveles 3, 6, 9, 12, 15 y 18) el destino reparte <b>3 cartas</b> y eliges una, que se acumula hasta el final de la partida. Hay {n} cartas distintas.',
  fate2:
    'Las <b>Bendiciones</b> mejoran tus turnos, pistas, rachas o puntos sin desventaja. Los <b>Pactos</b> dan bonificaciones muy fuertes a cambio de una regla estricta, como un coste en turnos.',
  fate3:
    'Una vez por partida puedes pulsar <b>Cambiar cartas</b> si ninguna encaja con tu estrategia. Revisa las cartas activas desde el botón de cartas del tablero.',

  customTitle: 'Personalizar',
  customText:
    'Todo se desbloquea jugando, sin comprar nada. Cada objeto muestra qué te falta para conseguirlo, y lo recién conseguido lleva la marca <b>Nuevo</b>.',
  customList: [
    ['Tablero', 'Bordes, fichas, llaves, tarjetas, estelas al arrastrar y celebraciones al ganar.'],
    ['Atuendos', '15 trajes por héroe que cambian cómo se ve en la aventura y en la selección.'],
    ['Portada', 'Héroes, música, fondo, clima animado y tema de interfaz para la pantalla de inicio.'],
  ],
  customShots: [
    ['custom-board', 'Personalizar · Tablero'],
    ['custom-outfit', 'Personalizar · Atuendos'],
    ['custom-cover', 'Personalizar · Portada'],
  ],
  loreTitle: 'Lore de Thyes',
  loreText:
    'Una historia épica que se abre a medida que juegas: cada entrada pide algo concreto (tableros resueltos, ciudades alcanzadas, victorias con un héroe…). Reúne {n} entradas en cuatro secciones.',
  loreList: [
    ['Personajes', 'La historia de Lía, Jean, Juth, Tri y Vhorn, capítulo a capítulo.'],
    ['Mundo', 'Las 7 ciudades y sus sellos, los pueblos antiguos y la frase que se revela línea a línea.'],
    ['Biblioteca', '15 tomos ilustrados que se leen página a página.'],
    ['Escenas', 'Imágenes del universo que se desbloquean al avanzar.'],
  ],
  loreShots: [
    ['lore-people', 'Lore · Personajes'],
    ['lore-world', 'Lore · Mundo'],
    ['lore-library', 'Lore · Biblioteca'],
  ],
  newsTitle: 'Dónde está cada cosa',
  news: 'Personalizar, Lore, Guía y Ajustes están en el desplegable <b>Otros</b> del inicio. Un número discreto junto a «Otros» avisa cuando hay algo por estrenar.',
  newsShot: 'El desplegable «Otros» del inicio.',

  tipsTitle: 'Consejos rápidos',
  tips: [
    'Libera primero los bloques largos que cruzan la fila de la llave roja.',
    'Antes de arrastrar, mira hasta dónde puede llegar cada bloque: un movimiento largo cuesta lo mismo que uno corto.',
    'Usa el poder de tu héroe en tableros con hielo o piezas pesadas, donde un error cierra la salida.',
    'Guarda las pistas para los tableros difíciles: se ganan con el avance, no se compran.',
    'No temas a los Pactos cuando ya dominas el camino: dan mucho a cambio de una regla clara.',
    'Los Retos diarios son buen entrenamiento: puedes reiniciar el tablero al instante para buscar el oro.',
  ],
  controlsTitle: 'Controles',
  controls:
    '<b>Táctil y ratón:</b> arrastra cualquier bloque en su eje. <b>Teclado:</b> Esc abre la pausa o vuelve atrás en los menús.',
  saveTitle: 'Guardado y otros dispositivos',
  save: 'Tu partida y tu progreso se guardan solos en este dispositivo. Para seguir en otro, usa <b>Otros → Ajustes → Pasar partida</b> (código QR o texto). Desde Ajustes también puedes instalar la app para jugar sin conexión.',
  moreShot: 'Ajustes: sonido, pasar partida, compartir e instalar.',
  faqTitle: 'Preguntas frecuentes',
  faq: [
    [
      '¿Por qué Difícil o Experto están cerrados?',
      'Se desbloquean en orden: completa los 21 niveles de Normal para abrir Difícil, y los de Difícil para abrir Experto. Lo que ya hayas jugado nunca se cierra.',
    ],
    [
      '¿Cómo consigo más objetos de Personalizar?',
      'Jugando. Abre un objeto bloqueado para ver su requisito: tableros resueltos, ciudades, Perfectos, retos diarios, victorias con cada héroe…',
    ],
    [
      '¿Dónde leo el Lore?',
      'En <b>Otros → Lore</b>. Las entradas se abren solas al cumplir su requisito; las nuevas llevan un aviso.',
    ],
    [
      '¿Puedo cambiar de héroe a mitad de partida?',
      'No: el héroe y la reliquia se eligen al empezar. En la siguiente partida puedes escoger otros.',
    ],
    [
      '¿Se pierde mi progreso si cierro el juego?',
      'No. La aventura en curso se guarda tras cada tablero y aparece como «Continuar» en el inicio.',
    ],
  ],
};

const en = {
  tabs: {
    start: 'Getting started',
    heroes: 'Heroes & relics',
    modes: 'Modes',
    fate: 'Fate cards',
    custom: 'Customize & Lore',
    tips: 'Tips & settings',
  },
  banner: {
    kicker: "TRAVELER'S MANUAL",
    title: 'DAWNSLIDE Guide',
    sub: 'Everything you need to clear a path for the red key: rules, heroes, modes, cards and secrets.',
  },
  zoom: 'Tap an image to enlarge it',
  stepsTitle: 'Your first run in 4 steps',
  steps: [
    [
      'Pick a mode and a hero',
      'Tap <b>Adventure</b>, choose <b>Normal</b> and pick Lía, Jean or Juth along with a relic.',
      'heroes',
      'Hero and relic selection at the start of the adventure.',
    ],
    [
      'Slide the blocks',
      'Drag each block along its axis: horizontal blocks move sideways and vertical ones move up or down. A long drag counts as <b>one single move</b>.',
      'board',
      'The board: red key, exit ➜, move meter and hint button.',
    ],
    [
      'Free the red key',
      'Clear a path to the arrow on the right. The meter shows the minimum (the crown) and your <b>turn limit</b>; solving on the last turn still counts.',
    ],
    [
      'Choose your fate',
      'Every 3 levels you finish a city and pick <b>1 of 3 cards</b> that stay with you until the end of the run.',
    ],
  ],
  goalTitle: 'Score, Perfects & streaks',
  goal: 'Matching the minimum number of moves is a <b>Perfect</b>; 1 or 2 extra moves is <b>Almost</b>, and 3 or more is <b>Room to improve</b>. Perfects build a <b>streak</b> that multiplies the points of the following levels.',
  goal2: 'When the adventure ends you get a final rank based on your score, Perfects, streak and chosen difficulty.',
  hintTitle: 'Hints',
  hint: 'The <b>Hint</b> button points to the next useful move. You start with 3 and earn a new one every {n} levels on Normal ({d} on Hard, {e} on Expert).',
  mechTitle: 'Blocks & mechanisms',
  mechIntro:
    'Look at the special pieces first: a single rock or pressure plate can change the order of the whole solution.',
  mech: [
    ['Rock', 'Fixed rock', 'Never moves. Clear a path by going around it through the free rows and columns.'],
    ['Heavy', 'Heavy block', 'Moves only <b>one square</b> per move. Spot it by the number 1 marked on it.'],
    ['Ice', 'Ice block', 'Slides without stopping until it hits another piece, a rock or the edge of the board.'],
    [
      'Lock',
      'Lock and plate',
      'Another block must cover the glowing floor plate before you can move the locked block.',
    ],
    ['Curse', 'Curse', 'In the later legs the board <b>rotates</b>. Follow the arrow to find where the key exits.'],
  ],
  shotRocks: 'Level 28 · Golden Oasis: square rocks and a heavy block marked with a 1.',
  shotIce: 'Level 65 · Sakura Village: an ice block, a lock and its glowing plate.',
  shotCurse: 'A curse rotates the board: the arrow shows the new exit.',

  heroesIntro:
    'Choose a hero at the start of the adventure. Each power solves a different problem, and you can switch heroes every run.',
  heroTips: {
    lia: 'Ideal for learning the paths, enduring long boards and securing consistent wins. If you leave the reserve untouched, the intact Ember gives bonus points.',
    jean: 'Shines on boards with ice or heavy blocks, where one wrong move can seal the exit. Rewinds once per board (twice on long ones).',
    van: 'Perfect for chasing Perfects and clearing Hard or Expert: it plays part of the solution, but spends turns and needs at least four steps left.',
  },
  relicsTitle: 'Adventure Relics',
  relicsNote: 'You pick one at the start and it stays with you for the whole run.',
  chalTitle: 'Challenge Relics',
  chalNote: 'In Challenge you pick a relic with its own rule (per board or per run).',

  modes: [
    {
      img: 'adv',
      tag: '21 LEVELS · 7 CITIES',
      title: 'Adventure',
      text: 'Pick a hero and a relic and travel through the seven cities of Thyes. When you close each city you choose a Fate Card. Your run saves itself and you can continue it any time.',
      lock: '<b>Progressive unlocks:</b> you start on <b>Normal</b>; completing its 21 levels opens <b>Hard</b>, and completing Hard opens <b>Expert</b>. Harder means more points.',
    },
    {
      img: 'survival',
      tag: 'ONE RESERVE, MANY BOARDS',
      title: 'Challenge',
      text: 'Beat a series of boards sharing a single turn reserve. Every extra step shrinks your margin for the next boards, so every decision counts.',
      lock: '<b>Progressive unlocks:</b> the <b>150-turn</b> route is open; beating it opens the <b>200</b> route, and beating that opens <b>250</b>.',
    },
    {
      img: 'daily',
      tag: 'NEW BOARDS EVERY DAY',
      title: 'Daily challenges',
      text: 'Each challenge brings three boards that are the same for every player and change at midnight. Earn Gold, Silver or Bronze medals and build up streak days.',
      lock: 'Classic is open from the start. {list} unlock when you reach levels {levels}. A 3-, 5- or 7-day streak gives +1, +2 or +3 hints when you start a new Adventure.',
    },
  ],
  reviveTitle: 'A second chance',
  revive:
    'If you run out of turns, fate cards such as <b>Phoenix</b> or <b>Rebirth</b> let you be reborn: you retry the board in exchange for part of your points.',

  fateTitle: 'Blessings & Pacts',
  fate: 'When you finish each city (levels 3, 6, 9, 12, 15 and 18) fate deals <b>3 cards</b> and you pick one, which stacks until the end of the run. There are {n} different cards.',
  fate2:
    '<b>Blessings</b> improve your turns, hints, streaks or points with no downside. <b>Pacts</b> give very strong bonuses in exchange for a strict rule, such as a cost in turns.',
  fate3:
    'Once per run you can tap <b>Swap cards</b> if none fits your strategy. Review your active cards from the card button on the board.',

  customTitle: 'Customize',
  customText:
    'Everything unlocks by playing, with nothing to buy. Each item shows what you still need to get it, and fresh unlocks carry a <b>New</b> mark.',
  customList: [
    ['Board', 'Borders, blocks, keys, cards, drag trails and win celebrations.'],
    ['Outfits', '15 outfits per hero that change how they look in the adventure and on the hero screen.'],
    ['Cover', 'Heroes, music, background, animated weather and an interface theme for the start screen.'],
  ],
  customShots: [
    ['custom-board', 'Customize · Board'],
    ['custom-outfit', 'Customize · Outfits'],
    ['custom-cover', 'Customize · Cover'],
  ],
  loreTitle: 'Lore of Thyes',
  loreText:
    'An epic story that opens as you play: each entry asks for something concrete (boards solved, cities reached, wins with a hero…). Collect {n} entries across four sections.',
  loreList: [
    ['Characters', 'The story of Lía, Jean, Juth, Tri and Vhorn, chapter by chapter.'],
    ['World', 'The 7 cities and their seals, the ancient peoples and the verse revealed line by line.'],
    ['Library', '15 illustrated volumes you read page by page.'],
    ['Scenes', 'Images from the universe that unlock as you progress.'],
  ],
  loreShots: [
    ['lore-people', 'Lore · Characters'],
    ['lore-world', 'Lore · World'],
    ['lore-library', 'Lore · Library'],
  ],
  newsTitle: 'Where everything is',
  news: 'Customize, Lore, Guide and Settings live in the <b>Others</b> dropdown on the start screen. A discreet number next to “Others” tells you when something new is waiting.',
  newsShot: 'The “Others” dropdown on the start screen.',

  tipsTitle: 'Quick tips',
  tips: [
    'Free the long blocks that cross the red key’s row first.',
    'Before dragging, check how far each block can go: a long move costs the same as a short one.',
    'Use your hero’s power on boards with ice or heavy blocks, where one mistake seals the exit.',
    'Save your hints for the hard boards: they are earned by progressing, not bought.',
    'Don’t fear Pacts once you know the path: they give a lot for one clear rule.',
    'Daily challenges are great practice: you can restart the board instantly to chase gold.',
  ],
  controlsTitle: 'Controls',
  controls:
    '<b>Touch & mouse:</b> drag any block along its axis. <b>Keyboard:</b> Esc opens the pause menu or goes back in the menus.',
  saveTitle: 'Saving & other devices',
  save: 'Your run and progress save automatically on this device. To continue on another one, use <b>Others → Settings → Transfer save</b> (QR code or text). In Settings you can also install the app to play offline.',
  moreShot: 'Settings: sound, transfer save, share and install.',
  faqTitle: 'Frequently asked questions',
  faq: [
    [
      'Why are Hard or Expert locked?',
      'They unlock in order: complete the 21 levels of Normal to open Hard, and those of Hard to open Expert. Anything you already played never locks again.',
    ],
    [
      'How do I get more Customize items?',
      'By playing. Open a locked item to see its requirement: boards solved, cities, Perfects, daily challenges, wins with each hero…',
    ],
    [
      'Where do I read the Lore?',
      'In <b>Others → Lore</b>. Entries open on their own once you meet their requirement; new ones carry a notice.',
    ],
    [
      'Can I switch heroes mid-run?',
      'No: the hero and relic are chosen at the start. On the next run you can pick different ones.',
    ],
    [
      'Do I lose progress if I close the game?',
      'No. The adventure in progress saves after every board and shows up as “Continue” on the start screen.',
    ],
  ],
};

const zh = {
  tabs: {
    start: '新手入门',
    heroes: '英雄与遗物',
    modes: '游戏模式',
    fate: '命运卡',
    custom: '个性化与传说',
    tips: '技巧与设置',
  },
  banner: {
    kicker: '旅行者手册',
    title: 'DAWNSLIDE 指南',
    sub: '为红钥匙开路所需的一切：规则、英雄、模式、卡牌与秘密。',
  },
  zoom: '点按图片可放大',
  stepsTitle: '四步开始你的第一局',
  steps: [
    [
      '选择模式和英雄',
      '点按<b>冒险</b>，选择<b>普通</b>，再选莉娅、让或尤斯，并带上一件遗物。',
      'heroes',
      '冒险开始时的英雄与遗物选择。',
    ],
    [
      '滑动方块',
      '沿着方块自己的方向拖动：横向方块左右移动，纵向方块上下移动。一次长距离拖动只算<b>一步</b>。',
      'board',
      '棋盘：红钥匙、出口 ➜、步数计量条和提示按钮。',
    ],
    ['取出红钥匙', '为右侧的箭头清出道路。计量条显示最少步数（皇冠）和你的<b>步数上限</b>；最后一步取出钥匙也算过关。'],
    ['选择你的命运', '每通过 3 关就完成一座城市，并从<b>3 张卡</b>中选 1 张，效果会持续到本局结束。'],
  ],
  goalTitle: '得分、完美与连击',
  goal: '用最少步数通关是<b>完美</b>；多走 1 或 2 步是<b>接近完美</b>，多走 3 步或更多是<b>还可提升</b>。完美会累积<b>连击</b>，为之后的关卡成倍加分。',
  goal2: '冒险结束时，你会根据得分、完美次数、连击和所选难度获得最终评级。',
  hintTitle: '提示',
  hint: '<b>提示</b>按钮会指出下一步有用的移动。你开局有 3 次，普通难度每 {n} 关获得 1 次（困难 {d} 关，专家 {e} 关）。',
  mechTitle: '方块与机关',
  mechIntro: '先观察特殊方块：一块岩石或一个压力板，就可能改变整个解法的顺序。',
  mech: [
    ['岩石', '固定岩石', '永远不会移动。从空闲的行和列绕过去，清出道路。'],
    ['重型', '重型方块', '每步只能移动<b>一格</b>。认准上面标着的数字 1。'],
    ['冰块', '冰块', '会一直滑动，直到碰到其他方块、岩石或棋盘边缘。'],
    ['锁', '锁和压力板', '必须用另一个方块盖住地上发光的压力板，才能移动带锁的方块。'],
    ['诅咒', '诅咒', '进入后期旅程后，棋盘会<b>旋转</b>。沿着箭头寻找钥匙的出口。'],
  ],
  shotRocks: '第 28 关 · 金色绿洲：方形岩石和标有数字 1 的重型方块。',
  shotIce: '第 65 关 · 樱花村：冰块、锁和发光的压力板。',
  shotCurse: '诅咒会旋转棋盘：箭头指出新的出口。',

  heroesIntro: '开始冒险时选择一位英雄。每种能力解决不同的难题，而且每一局都可以换英雄。',
  heroTips: {
    lia: '适合熟悉路线、应付长棋盘并稳定取胜。如果不动用备用步数，完好的余烬会给你额外得分。',
    jean: '在有冰块或重型方块的棋盘上表现出色，因为一步走错就可能堵死出口。每块棋盘可回溯一次（长棋盘两次）。',
    van: '最适合追求完美、挑战困难或专家：会替你走一部分解法，但消耗步数，并要求至少还剩四步。',
  },
  relicsTitle: '冒险遗物',
  relicsNote: '开局选择一件，整局都会伴随你。',
  chalTitle: '挑战遗物',
  chalNote: '在挑战模式中，你选择的遗物有各自的规则（每块棋盘或每局）。',

  modes: [
    {
      img: 'adv',
      tag: '21 关 · 7 座城市',
      title: '冒险',
      text: '选择英雄和遗物，穿越提耶斯的七座城市。每完成一座城市，就选择一张命运卡。进度会自动保存，随时可以继续。',
      lock: '<b>逐步解锁：</b>从<b>普通</b>开始；通关其 21 关后开启<b>困难</b>，通关困难后开启<b>专家</b>。难度越高，得分越高。',
    },
    {
      img: 'survival',
      tag: '一份储备，多块棋盘',
      title: '挑战',
      text: '共用同一份步数储备，通过一系列棋盘。每多走一步，后面棋盘的余地就少一分，所以每个决定都很重要。',
      lock: '<b>逐步解锁：</b><b>150 步</b>路线一开始就开放；通过后开启 <b>200 步</b>路线，再通过后开启 <b>250 步</b>路线。',
    },
    {
      img: 'daily',
      tag: '每天全新棋盘',
      title: '每日挑战',
      text: '每项挑战包含三块棋盘，所有玩家相同，并在午夜更新。赢取金、银、铜牌，累积连续天数。',
      lock: '经典挑战一开始就可玩。{list}分别在第 {levels} 关解锁。连续 3、5 或 7 天，开启新冒险时可获得 +1、+2 或 +3 次提示。',
    },
  ],
  reviveTitle: '第二次机会',
  revive: '步数耗尽时，<b>凤凰</b>或<b>转生</b>等命运卡可以让你重生：以一部分得分为代价重试这块棋盘。',

  fateTitle: '祝福与契约',
  fate: '每完成一座城市（第 3、6、9、12、15、18 关），命运会发出<b>3 张卡</b>，你选择一张，效果会叠加到本局结束。共有 {n} 张不同的卡。',
  fate2:
    '<b>祝福</b>可以无代价地提升步数、提示、连击或得分。<b>契约</b>提供非常强力的加成，但要遵守严格的规则，例如消耗步数。',
  fate3: '每局一次，如果没有合适的卡，可以点按<b>换牌</b>。可以通过棋盘上的卡牌按钮查看已生效的卡。',

  customTitle: '个性化',
  customText: '一切都靠游玩解锁，无需购买。每件物品都会显示还差什么条件，刚解锁的会带有<b>新</b>标记。',
  customList: [
    ['棋盘', '边框、方块、钥匙、卡片、拖动拖尾和获胜庆祝特效。'],
    ['服装', '每位英雄 15 套服装，改变其在冒险和选择界面中的外观。'],
    ['封面', '主界面的英雄、音乐、背景、动态天气和界面主题。'],
  ],
  customShots: [
    ['custom-board', '个性化 · 棋盘'],
    ['custom-outfit', '个性化 · 服装'],
    ['custom-cover', '个性化 · 封面'],
  ],
  loreTitle: '提耶斯传说',
  loreText:
    '一段随着游玩逐步展开的史诗：每个条目都有具体要求（解开的棋盘、到达的城市、用某位英雄获胜……）。共 {n} 个条目，分为四个部分。',
  loreList: [
    ['人物', '莉娅、让、尤斯、Tri和Vhorn的故事，逐章展开。'],
    ['世界', '七座城市及其封印、远古民族，以及逐行揭示的那段铭文。'],
    ['藏书', '15 卷插图书籍，可逐页阅读。'],
    ['场景', '随着进度解锁的世界画面。'],
  ],
  loreShots: [
    ['lore-people', '传说 · 人物'],
    ['lore-world', '传说 · 世界'],
    ['lore-library', '传说 · 藏书'],
  ],
  newsTitle: '功能在哪里',
  news: '个性化、传说、指南和设置都在主界面的<b>其他</b>下拉菜单中。有新内容可查看时，“其他”旁会出现一个低调的数字。',
  newsShot: '主界面的“其他”下拉菜单。',

  tipsTitle: '小技巧',
  tips: [
    '先让穿过红钥匙所在行的长方块腾出位置。',
    '拖动之前，先看每个方块能走多远：长距离移动和短距离移动花费相同。',
    '在有冰块或重型方块的棋盘上使用英雄能力，那里一步走错就会堵死出口。',
    '把提示留给困难的棋盘：提示靠进度获得，不能购买。',
    '熟悉路线后不必害怕契约：一条明确的规则换来丰厚的回报。',
    '每日挑战是很好的练习：可以立刻重开棋盘，冲击金牌。',
  ],
  controlsTitle: '操作',
  controls: '<b>触屏与鼠标：</b>沿着方块的方向拖动。<b>键盘：</b>按 Esc 打开暂停菜单，或在菜单中返回。',
  saveTitle: '存档与其他设备',
  save: '你的进度会自动保存在本设备。要在另一台设备上继续，请使用<b>其他 → 设置 → 存档传输</b>（二维码或文本）。在设置中还可以安装应用，离线游玩。',
  moreShot: '设置：声音、存档传输、分享与安装。',
  faqTitle: '常见问题',
  faq: [
    [
      '为什么困难或专家是锁定的？',
      '它们按顺序解锁：通关普通的 21 关后开启困难，通关困难后开启专家。已经玩过的内容不会再被锁上。',
    ],
    [
      '如何获得更多个性化物品？',
      '靠游玩。打开锁定的物品可以查看条件：解开的棋盘、城市、完美、每日挑战、用各位英雄获胜……',
    ],
    ['在哪里阅读传说？', '在<b>其他 → 传说</b>。条目满足条件后会自动开启，新条目会有提示。'],
    ['可以在局中换英雄吗？', '不行：英雄和遗物在开局时选择。下一局可以选别的。'],
    ['关闭游戏会丢失进度吗？', '不会。进行中的冒险会在每块棋盘后保存，并在主界面显示为“继续”。'],
  ],
};

export const GUIDE_TEXT = { es, en, zh };
