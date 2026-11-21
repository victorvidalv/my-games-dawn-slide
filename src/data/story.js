/* Thyes, año 4133: la Noche Larga de Vhorn y el viaje de tres luces para encender de nuevo el Faro del Amanecer. Nombres y trama: src/data/lore.js */
import { INSCRIPTIONS } from './lore.js';

/**
 * Cada capítulo = una ciudad = un sello que romper. Todos siguen la misma lógica:
 *   opening   → qué le pasa a la ciudad y qué hay que hacer (romper su sello)
 *   cityLines → tres líneas cortas: lugar, peligro, pista de juego
 *   vhorn     → lo que dice el Apagador (aparece desde Villa Sakura; revela quién es en Ciudad Celeste)
 *   end       → el sello se rompe y cómo cambia el ánimo del viaje
 */
export const CHAPTERS = [
  {
    seal: 'Corazón',
    title: 'La brasa sale del valle',
    opening:
      'Thyes, año 4133. Vhorn, la sombra que se alimenta del olvido, apagó el Faro del Amanecer y llegó la Noche Larga. Tri selló los diez reinos para protegerlos. Tu misión: romper los diez sellos y encender de nuevo el Faro.',
    cityLines: [
      'El Valle Esmeralda duerme bajo una niebla que nunca se va.',
      'Cada tablero se gana sacando la llave roja y cada sello se rompe al terminar el reino.',
      'Diez reinos, diez sellos: al final te espera el Faro del Amanecer.',
    ],
    end: 'El sello del Corazón se rompe. La niebla se abre y la brasa late más fuerte: el viaje ha empezado.',
  },
  {
    seal: 'Marea',
    title: 'Las velas de los Kogn',
    opening:
      'Los Kogn, navegantes de las mareas, dejaron una vela encendida en cada muelle para que nadie se pierda. Pero el mar no se mueve y las naves no zarpan. Rompe el sello de la Marea.',
    cityLines: [
      'Los Kogn encendían una vela por cada marinero al que esperaban.',
      'Las velas arden, pero el mar sigue quieto.',
      'Despeja el camino de la llave roja y la marea volverá.',
    ],
    end: 'El sello de la Marea se rompe. El mar respira otra vez y los Kogn cantan en su lengua vieja.',
  },
  {
    seal: 'Memoria',
    title: 'Los nombres de la corteza',
    opening:
      'Los Ennari escribían los nombres de sus muertos en la corteza de los árboles. Vhorn los borró, porque se alimenta de lo que se olvida. Rompe el sello de la Memoria y devuélveselos.',
    cityLines: [
      'Las hojas cubren los altares donde escribían los Ennari.',
      'Un nombre olvidado es un nombre que Vhorn ya devoró.',
      'Avanza despacio: aquí la senda cambia con la tarde.',
    ],
    end: 'El sello de la Memoria se rompe. La aldea dice sus nombres en voz alta y los Ennari vuelven a escribirlos.',
  },
  {
    seal: 'Valor',
    title: 'El filo del hielo',
    opening:
      'En la cumbre, el hielo sepultó la campana que los Aluen oían desde el cielo. Hace frío y da miedo seguir, pero el sello del Valor solo cede ante quien se atreve.',
    cityLines: [
      'El hielo hace resbalar todo lo que toca.',
      'El refugio calla bajo un manto de nieve.',
      'Una pieza de hielo, una vez empujada, patina hasta el tope.',
    ],
    end: 'El sello del Valor se rompe. La campana suena entre las montañas y el miedo se queda atrás.',
  },
  {
    seal: 'Chispa',
    title: 'La hora detenida',
    opening:
      'El reloj mayor se paró la noche en que Vhorn apagó el Faro, y con él se detuvo el tiempo de la ciudad. Rompe el sello de la Chispa para que las agujas vuelvan a girar.',
    cityLines: [
      'Los relojeros kogn y ennari firmaron juntos cada engranaje.',
      'Un movimiento torpe puede atascar toda la calle.',
      'Aquí gana quien piensa antes de mover.',
    ],
    end: 'El sello de la Chispa se rompe. Las agujas se mueven y el tiempo de la ciudad vuelve a correr.',
  },
  {
    seal: 'Fuego',
    title: 'La fragua bajo la ceniza',
    opening:
      'Aquí la brasa duerme bajo la piedra negra. Vhorn susurra que descansar es más fácil que luchar; romper el sello del Fuego es decirle que no.',
    cityLines: [
      'La ceniza cubre el puerto y las rejas guardan el calor.',
      'La fragua marca el ritmo: un golpe, un paso.',
      'Mide cada ruta antes de cruzar el acero.',
    ],
    vhorn: 'Descansad. Nadie recordará vuestra luz cuando acabe la noche.',
    end: 'El sello del Fuego se rompe. La fragua arde limpia y la tentación de rendirse se apaga.',
  },
  {
    seal: 'Amanecer',
    title: 'El trono vacío',
    opening:
      'Aquí espera el Faro del Amanecer y, en el trono vacío, la sombra de Vhorn. Para vencerlo no basta la fuerza: hay que encender el Faro y pronunciar su nombre.',
    cityLines: [
      'Murallas de oro guardan la última cámara.',
      'La brasa, la hora y la palabra deben actuar juntas.',
      'Abre el último sello y devuelve el amanecer a Thyes.',
    ],
    vhorn: 'Si me nombráis… ¿dejaréis de olvidarme?',
    end: 'El último sello se rompe. Las tres luces encienden el Faro, nombran a Vhorn y su sombra se calma. Tri abre los ojos: amanece.',
  },
].map((c, i) => ({ ...c, inscription: INSCRIPTIONS[i] }));

/**
 * Cada héroe tiene un objetivo propio, además del común (encender el Faro):
 *   Lía  → prometió volver a su valle con el amanecer (valentía contra el miedo).
 *   Jean → estaba de guardia la noche de Vhorn y se siente culpable (aprende a corregir el próximo paso, no a deshacer el pasado).
 *   Juth → falta una página en su códice, la del nombre olvidado (al final lo pronuncia: el de Vhorn).
 * `chapterLines` es lo que dice el héroe al llegar a cada ciudad .
 */
export const HERO_LORE = {
  lia: {
    chapterLines: [
      'Prometí volver con el amanecer. Primer sello: la niebla no me va a frenar.',
      'Los Kogn dejaron velas para guiarnos. No estoy sola; seguiré.',
      'Sed y arena. Pero mi brasa no se apaga, y yo tampoco.',
      'Tantos nombres perdidos… prometo recordar el de cada uno.',
      'Qué silencio. Si el tiempo se paró, lo empujaremos entre todos.',
      'Tengo miedo, lo admito. Pero la llama tiembla y aun así avanza.',
      'Siento unos ojos fríos entre las flores. Vhorn nos mira. Que mire.',
      'Me ofrece descanso. Qué tentador… pero aún me queda fuego.',
      'Vhorn fue guardián y lo olvidaron. Duele, pero no justifica apagar el mundo.',
      'Llegamos. Hoy encendemos el Faro, por mi valle y por todos los reinos.',
    ],
    quote: '«Incluso la ceniza recuerda el calor.»',
    endingLore:
      'Lía enciende el Faro del Amanecer con su última brasa. Vhorn, por fin nombrado, se calma, y Thyes ve amanecer: cumplió su promesa al Valle.',
    thanksWin: '«Mi llama resistió porque no me soltaste. Prometí volver con el amanecer, y aquí está.»',
    thanksLoss: '«La brasa se apaga por hoy, viajero. Cuando vuelvas a llamarla, volverá a arder.»',
  },
  jean: {
    chapterLines: [
      'Estaba de guardia cuando la luz murió. Hoy cada paso cuenta, y yo los cuento.',
      'Las mareas vuelven; las horas perdidas, casi nunca. Casi.',
      'Los Sahrim cuentan pozos, yo segundos. Hoy ninguno se equivoca.',
      'Otoño: el mismo instante cayendo una y otra vez. No repetiré mi error.',
      'Mi torre, mi culpa. No puedo deshacer aquella noche, pero sí corregir el próximo paso.',
      'El hielo guarda el segundo antes de la caída. Pisemos justo después.',
      'Cada pétalo suspendido es un mañana pendiente. Vamos a saldarlo.',
      'La fragua cuenta golpes. Marcaré el nuestro con calma; Vhorn no me apura.',
      'Vhorn fue vigía, como yo. Su soledad me pesa, pero no lo disculpa.',
      'Es la hora final. Esta vez llego a tiempo: el Faro volverá a marcar el amanecer.',
    ],
    quote: '«Todo error deja una grieta por donde volver.»',
    endingLore:
      'Jean ajusta la última aguja del Faro del Amanecer. La hora detenida desde el año 4133 vuelve a correr y, por fin, se perdona su guardia.',
    thanksWin: '«Cada paso atrás valió la pena. Hoy llegamos a tiempo: el mañana vuelve a empezar.»',
    thanksLoss: '«El péndulo se detiene aquí. Descansa; otra hora nos espera.»',
  },
  van: {
    chapterLines: [
      'Falta una página en mi códice: la de la noche en que cayó el Faro. Hoy empiezo a escribirla.',
      'Cada vela es una señal; los Kogn la leen, yo aprendo. Nadie escribe solo.',
      'Bajo esta arena hay una palabra que ni los Sahrim osan decir. La buscaré.',
      'Los Ennari escribían a sus muertos. Vhorn borró los nombres; yo los devolveré.',
      'Engranajes sin pulso, una historia sin final. Démosle uno con pulso.',
      'El hielo guarda cicatrices más claras que la tinta. Leámoslas sin miedo.',
      'Entre cerezos mudos, una runa anuncia la salida. Ahí está. ¿La ves?',
      'Vhorn promete descanso. Mi códice sabe que el olvido nunca descansa.',
      'Vhorn tuvo un nombre que el mundo olvidó. Esa es la página que faltaba.',
      'La última hoja está en blanco. Hoy digo el nombre que falta y cierro el libro.',
    ],
    quote: '«Lo que no se nombra sigue buscando salida.»',
    endingLore:
      'Juth traza el último signo sobre el Faro del Amanecer y pronuncia el nombre que faltaba. Thyes recuerda, y Vhorn ya no tiene nada que apagar.',
    thanksWin: '«Cerramos el códice con luz limpia. Ya nadie olvidará esos nombres.»',
    thanksLoss: '«Faltó una línea en esta página, compañero. Volveremos a abrir el libro.»',
  },
};

export const HERO_TALK = {
  lia: {
    win: ['Una puerta menos.', 'La brasa sigue viva.', 'Todavía queda senda.'],
    bonus: {
      cards: '«Alza los sellos. Veamos qué esconden.»',
      wheel: '«Deja que gire el hierro. Seguimos.»',
      slots: '«Tres ascuas alineadas abren paso.»',
      catch: '«¡No dejes que se apaguen esas chispas!»',
      runes: '«Que las runas recuerden por nosotros.»',
      pendulum: '«Pulso firme. Que la llama no tiemble.»',
      sprint: '«Tres deslizamientos al rojo vivo. ¡Rápido!»',
      bestmove: '«Veo la brecha. Un solo golpe limpio.»',
    },
    prize: '«Nos guardará del próximo umbral.»',
    empty: '«La ceniza nada regala hoy.»',
  },
  jean: {
    win: ['Justo a tiempo.', 'El pulso no falló.', 'Un error menos en la cuenta.'],
    bonus: {
      cards: '«Cada marca vuelve a su sitio.»',
      wheel: '«Un péndulo sin agujas. Probemos.»',
      slots: '«Tres relojes buscando la misma hora.»',
      catch: '«Duran un suspiro. Mide el segundo.»',
      runes: '«La memoria es un reloj: repite el tic.»',
      pendulum: '«Mi viejo péndulo. Este sí sé pararlo.»',
      sprint: '«Tres tableros antes de que caiga la aguja.»',
      bestmove: '«Calcula el segundo exacto y mueve.»',
    },
    prize: '«Tiempo ganado para lo que viene.»',
    empty: '«El reloj cobró su peaje.»',
  },
  van: {
    win: ['Queda escrito.', 'El signo cedió.', 'Había una salida oculta.'],
    bonus: {
      cards: '«Las runas se repiten. Observa.»',
      wheel: '«Cada giro traza una línea nueva.»',
      slots: '«Tres ecos antiguos. Escucha.»',
      catch: '«Lee el trazo antes de atrapar.»',
      runes: '«Las runas se escriben una a una. Léelas.»',
      pendulum: '«El signo exacto está en el centro.»',
      sprint: '«Lee las tres líneas y abre el paso al vuelo.»',
      bestmove: '«Una sola jugada acorta todo el códice.»',
    },
    prize: '«Lo guardo entre las páginas.»',
    empty: '«Conviene anotar también este vacío.»',
  },
};

/** Frases de cada héroe en los tutoriales de cada pieza: se quejan o desafían a Vhorn por poner ese obstáculo. */
export const HERO_TUTORIAL_TALK = {
  lia: {
    wall: 'Rocas, Vhorn. ¿Crees que una roca apaga mi brasa? Rodearé cada una.',
    heavy: '¿Piezas pesadas? Qué poco imaginativo, Vhorn. Las moveré paso a paso.',
    gate: '¿Candados, Vhorn? Mi llama abre lo que tu sombra cierra.',
    ice: '¡Hielo! Tu frío no me detiene, Vhorn: mi brasa lo derrite.',
  },
  jean: {
    wall: 'Otra roca, Vhorn. Qué predecible: ya conté el camino para rodearla.',
    heavy: 'Pesada, un paso por turno. Vhorn, yo sé esperar mejor que tú.',
    gate: 'Candados, Vhorn. Todo cerrojo tiene su hora, y la mía es esta.',
    ice: 'Hielo. Tu truco patina, Vhorn, pero yo calculé dónde se detiene.',
  },
  van: {
    wall: 'Una roca. Vhorn, pones piedras porque ya no te quedan palabras.',
    heavy: 'Pesadas como tu olvido, Vhorn. Aun así leeré cada paso.',
    gate: 'Un candado es solo una frase cerrada, Vhorn. Sé leerla.',
    ice: 'Hielo, Vhorn: tinta que corre. No me confundes; la leo hasta el final.',
  },
};
