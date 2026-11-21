# DAWNSLIDE

Un puzle de bloques con tres héroes y cien niveles. Abre el camino entre los diez reinos de Thyes (año 4133)
y devuelve la luz al Faro del Amanecer. Funciona en el navegador y se puede instalar como app (PWA, también sin conexión).

- **Objetivo:** desliza los bloques y saca la llave roja por la derecha en el menor número de movimientos.
  Un arrastre largo cuenta como **1** movimiento.
- **Límite:** tienes de margen al principio el doble del mínimo en turnos y se aprieta con el nivel: hasta ×1,3 en el 100 en Normal, ×1,06 en Difícil y ×1,04 en Experto (siempre al menos «mínimo + 2»). Al agotarlos sin sacar la llave **ya no se puede mover** y la aventura termina (ganar en el último turno vale).
- **Tres caminos** de 100 niveles: Normal, Difícil y Experto (cambia dónde empieza la dificultad).
- **Tres héroes**, cada uno con un poder (ver [Héroes](#héroes-y-poderes)).

---

## Empezar

Requiere [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
npm run dev        # servidor local con recarga en caliente
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compila la versión final en `dist/` (incluye el service worker). |
| `npm run preview` | Sirve `dist/` para probar el build (y la instalación PWA). |
| `npm test` | Ejecuta todas las pruebas (motor, banco de niveles, poderes, partidas completas). |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run levels` | Regenera el banco de tableros `src/data/levels.json` (varios minutos). |

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
2. Haz push a `main`. El workflow [`deploy.yml`](.github/workflows/deploy.yml) ejecuta lint, pruebas y build,
   y publica `dist/` en `https://<usuario>.github.io/<repo>/`.

El workflow define `BASE_PATH=/<repo>/` automáticamente. Si usas un dominio propio en la raíz,
compila con `BASE_PATH=/ npm run build`. Sin `BASE_PATH` se usan rutas relativas (`./`), que valen para cualquier carpeta.

**Versiones y actualizaciones:** no hay que subir ningún número a mano. Cada build con cambios genera un
service worker nuevo; los jugadores ven el aviso «Nueva versión disponible». El número visible en el menú
sale de la versión mayor de `package.json`.

---

## Estructura del proyecto

```
index.html              Marcado de todas las pantallas (menú, tablero, modales). Sin lógica.
vite.config.js          Vite + PWA (manifest, service worker, base para GitHub Pages).
public/                 Arte que se copia tal cual: backgrounds/, heroes/, icons/.
scripts/
  generate-levels.mjs   Genera el banco de tableros (src/data/levels.json) en paralelo.
tests/                  Pruebas con Vitest (ver abajo).
src/
  main.js               Punto de entrada: importa estilos y módulos y abre el menú.
  state.js              Estado compartido (S), guardado en localStorage, caminos, puntos de la jugada.
  dom.js                Atajo $(id).
  sw.js                 Service worker (precaché + aviso de actualización).
  pwa.js                Registro del service worker, instalación, aviso de versión nueva.
  engine/               ★ MOTOR PURO: sin DOM, sin estado global, 100 % probado.
    board.js            Tablero 6×6, codificación de estados, tablero aleatorio, mutación.
    solver.js           BFS exacto: distancia mínima de cada estado a la victoria, pistas.
    difficulty.js       Curva de dificultad, dificultad por nivel/camino, límite de movimientos.
    generator.js        Generador de tableros (determinista, por iteraciones).
    levels.js           Elegir tablero del banco y construir el nivel (mínimo exacto, ajuste adaptativo).
    decorate.js         Añade candados y piezas pesadas a un tablero y comprueba que importan y tienen solución.
    scoring.js          Puntos: eficiencia, perfecto, racha, bono de ruta aventurera y de jefe.
    rules.js            Movimientos restantes, aviso/último/eliminado, victoria.
    rng.js              Pseudoaleatorio con semilla.
  game/
    shop.js             Tienda: precios y compras como funciones puras (turnos extra, pista, rehacer, saltar).
    mechanics.js        Piezas especiales por ciudad, calendario de niveles (normales, mecánica, jefe) y jefes.
    minigames.js        Reglas puras de los nueve minijuegos (3 por héroe), nota 0-5 y cobro de premios.
    heroes.js           ★ Héroes y poderes como funciones puras (Lía, Jean, Juth) + recompensas de nivel.
    session.js          Flujo de la aventura: empezar, cargar nivel, ganar, perder, viajar, récord.
  data/
    levels.json         Banco de tableros normales (100 dificultades × 12). Se genera, no se edita.
    special.json        Tableros con muros, candados, piezas pesadas y mixtos (mismas dificultades). Se genera.
    zones.js            Las diez ciudades (colores, nombres).
    story.js            Capítulos, diálogo de los héroes.
  ui/                   Pantallas y efectos (usan el DOM): board, heroes, map, bonus (+ minigames/), finale, menu, controls, story, fx,
                        coach (guía y leyenda de piezas), shop (tienda de Don Dublón), turns, result.
  audio/                sound.js (efectos, recuperación del audio), music.js (secuenciador) y themes.js (las melodías).
  styles/               CSS en orden de cascada (01-… a 33-…); main.js los importa en ese orden.
```

Regla de oro: **`src/engine` y `src/game/heroes.js` no tocan el DOM.** Toda regla del juego que se pueda
romper (dificultad, mínimos, puntos, poderes) vive ahí y está cubierta por pruebas; la interfaz solo las llama.

### Estado compartido

`src/state.js` exporta `S = { run, G, busy, lastCfg }`:

- `S.run` — la aventura en curso (nivel, puntos, héroe, pistas…). Se guarda en `localStorage`.
- `S.G` — el tablero activo (piezas, posiciones, movimientos, mínimo, límite).
- `S.busy` — bloquea la interacción durante animaciones.

---

## Cómo funciona el motor

### Tablero y solver

Tablero 6×6; la pieza 0 es la llave roja (horizontal, largo 2, fila 2). Cada estado se codifica como un
número (base 8, una cifra por pieza). `analyze()` explora **toda** la componente alcanzable y hace un BFS desde
las posiciones ganadoras, de modo que conoce la **distancia exacta** (movimientos mínimos) de cada estado.
Por eso el «Mínimo» que ve el jugador y la pista son siempre exactos.

### Dificultad

`rateAt(camino, nivel)` da una dificultad de 1 a 100 con una curva propia por camino (`PATH_CURVES`): Normal llega a 100 en el nivel 100, Difícil en el 50 y Experto en el 38
(**Normal** empieza en 1 (2 movimientos y ya hay que pensar en el nivel 20), **Difícil** en 27 (~11 movimientos), **Experto** en 44 (~19)). `curve(dificultad)` fija el mínimo de movimientos
objetivo con unos puntos de control (entre ellos se interpola) en `src/engine/difficulty.js`:

| Dificultad | Mínimo objetivo | Qué se siente |
|---|---|---|
| 1–10 | 2–3 movimientos | tutorial |
| 20 | 6 | se aprende a planificar |
| 30 | 11 | **en Normal, aquí hay que pensar** |
| 50 | 19 | Normal en el nivel ~40 |
| 75 | 29 | **donde empieza Experto** |
| 100 | 37 | desafiante de verdad |

`tests/difficulty.test.js` comprueba esa forma (Normal ≥ 11 en el nivel 20, ≥ 35 al final, Difícil y Experto empiezan
donde Normal ya exige pensar y suben mucho más rápido, nunca bajan ni dan saltos de más de 2 movimientos).

### Piezas especiales

Todas conservan lo que hace fiable al solver: **cada movimiento se puede deshacer**, así que nunca hay estados sin
salida ni atascos imposibles (las pruebas lo verifican sobre todos los bancos).

| Pieza | Qué hace | Cómo se ve |
|---|---|---|
| 🪨 **Roca fija** (muro) | Nunca se mueve ni se empuja | Bloque de piedra con remaches, del color de cada ciudad |
| 🔒 **Candado + placa ▣** | La pieza solo se mueve mientras OTRA cubra la placa del suelo | Rayas y un candado (se abre y brilla); la placa se ilumina |
| ⚓ **Pesada** | Avanza solo 1 casilla por movimiento | Remaches de hierro y una insignia «1 ⇄» |

Cada ciudad usa una mecánica (`CITY_FAMILY` en `src/game/mechanics.js`): los niveles 1-2 son normales, la mecánica aparece
en el 3, 5, 6, 8 y 9 (en el Valle desde el 6, para aprender lo básico) y el nivel 10 también lleva pieza especial. **Los jefes de ciudad están desactivados de momento**
(`BOSSES_ENABLED` en `src/game/mechanics.js`; el código se conserva).
La primera vez que aparece cada pieza sale un aviso con una mini animación; después, una leyenda bajo el tablero.
Mover un candado o una pieza pesada suena distinto (clic metálico / golpe grave), y las rocas y la placa también tienen su sonido.

### Generación de tableros

`generateBoard()` hace escalada de colina: parte de un tablero aleatorio y va cambiando una pieza mientras la
distancia máxima a la victoria no empeore. Es **determinista** (el presupuesto son iteraciones, no milisegundos)
y exige alcanzar el mínimo objetivo de la dificultad (`minReach`: igual a la curva, y hasta 3 menos en las
dificultades más altas, donde encontrar tableros tan duros es carísimo).

Para que cada nivel esté garantizado y cargue al instante en cualquier móvil, los tableros **se generan antes**:

| Comando | Genera |
|---|---|
| `npm run levels` | `src/data/levels.json`: tableros normales (formato compacto `"h2.2.0 v3.4.1 …"`) |
| `npm run levels:walls` | Tableros con muros (se generan desde cero con los muros dentro: un tablero normal ya está tan apretado que un muro suelto casi siempre lo deja sin solución) |
| `npm run levels:decorate` | Candados, pesadas y mixtos: se añaden a tableros del banco, y **solo se aceptan si el elemento importa** (la solución cuesta más movimientos que sin él) |
| `npm run levels:all` | Todo lo anterior, en orden (decenas de minutos) |

En el juego, `pickBoard()` elige un tablero de la familia que toque según la ciudad y la semilla de la partida (si
falta una familia usa otra), `varyBoard()` crea una variante propia de cada partida y `buildLevel()` escoge el estado inicial:

- **Normal:** distancia = objetivo de la curva + ajuste adaptativo.
- **Adaptativo:** si juegas con ≥ 90 % de eficiencia el ajuste sube (máx. +1 hasta el nivel 10, +2 después);
  si < 40 %, baja (mín. −2).
- **Camino heroico** (al terminar una ciudad): cada héroe afronta una dificultad distinta y gana más puntos (Lía +35 %, Jean +45 %, Juth +45 %) y una tienda más barata (−20 %, −25 %, −25 %); Lía además recibe una pista gratis cada 4 tableros (`HEROIC_BENEFITS`, calibrado con `npm run simulate`).
- Siempre dentro de ±3 del objetivo, y el límite de movimientos baja de ×2 a ×1,3 del mínimo entre el nivel 1 y el 100 (`limitFactor`).

> Si cambias `curve()` o las reglas de generación, ejecuta `npm run levels:all` y `npm test`
> y haz commit de los nuevos `levels.json` y `special.json`.

## Guía para el jugador

Los primeros niveles enseñan jugando (avisos de una sola vez, guardados en `store.tips`): nivel 1 mueve el brillo hasta que
sales; nivel 2 explica Mínimo/Límite/Premio; nivel 3 las ayudas; nivel 4 el poder del héroe; y cada pieza nueva y cada jefe
traen su aviso. No hay pantalla de «Cómo se juega» en el menú principal.

### Primeros niveles y aviso de pocos movimientos

- **Aviso claro**: cuando quedan 3 movimientos (o el 20 % del límite si es más; en tableros muy cortos, nunca antes de gastar el 60 %: `warnAt` en `src/engine/rules.js`) sale un cartel «Te quedan N movimientos · Piensa bien cada paso: si se acaban, …» y el medidor muestra un contador fijo «Quedan N» hasta que se sale del riesgo. Si se entró en la zona antes, el cartel se repite al llegar a 3 y en el último movimiento.
- **Primera ciudad sin castigo**: en los niveles 1-9 del camino Normal (`FREE_RETRY_UNTIL` en `src/game/shop.js`) quedarse sin movimientos repite el tablero en vez de terminar la partida. No cuesta puntos ni pistas; solo corta la racha. El cartel lo dice («repites el tablero» en vez de «la partida termina»).
- **Tiempo de los jefes**: nivel 20, 3 min. Nivel 40, 5 min. Nivel 50, 6 min. Nivel 70, 8 min. Niveles 90 y 100, 10 min. Los otros jefes solo tienen límite de turnos.
- **Dos reintentos gratis por jefe**: puedes repetir el mismo tablero si se acaban los turnos o el tiempo. Vuelves al inicio con el reloj completo y conservas tus puntos y pistas. Se corta la racha de la aventura y el cupo queda guardado al salir.
- **Una explicación por nivel**: lo imprescindible para jugar el tablero (arrastrar, piezas nuevas, jefe, maleficio) se enseña siempre; las explicaciones generales (puntos, ayudas, héroe, sellos) salen de una en una y esperan a otro nivel si ya hay otra ventana.

### Puntos

`base = 100 + 20·(dificultad−1)` × eficiencia (100 % en el mínimo, 0 % al doble). Mínimo exacto: +20 %.
Racha: ×1.1 por nivel seguido con ≥ 90 % (máx. ×1.5).

---

## Héroes y poderes

Elegir héroe es permanente durante la aventura. Las reglas están en [`src/game/heroes.js`](src/game/heroes.js).

| Héroe | Poder | Función |
|---|---|---|
| **Lía** | Turnos de reserva: +40 % del mínimo del tablero en Normal, +20 % en Difícil y +25 % en Experto (8 → +3 en Normal). La barra distingue el tramo verde y muestra cuántos quedan, antes de los turnos comprados. | `bonusTurns`, `heroLimit`, `reserveState` |
| **Jean** | Rebobinar: una vez por tablero (dos si el mínimo es de 14 o más) devuelve ~33 % de los movimientos hechos (mínimo 3), pieza a pieza, y recupera los turnos. Con menos de tres vuelve al inicio. No devuelve compras ni pistas. | `powerState`, `beginPower` |
| **Juth** | Trazar destino: una vez por tablero ejecuta ~25 % de los pasos que faltan (mínimo 1, nunca el último) de una solución óptima desde la posición actual, consumiendo turnos. Solo se habilita con al menos 4 pasos pendientes y turnos suficientes. | `destinyPlan`, `beginPower` |

Reglas comunes: el botón Poder sustituye Deshacer; Lía tiene poder pasivo y no muestra botón. Todos conservan las pistas de su reserva y ganan **+1 pista cada 5 niveles**. Guardar, recargar, rehacer en tienda o revivir no renueva una carga gastada en el mismo nivel. Los pasos se guardan durante la animación; al recargar se conserva lo ya ejecutado y la carga gastada.

**Equilibrio por camino.** Cada héroe tiene su terreno: Juth guía en Normal (su poder nunca descansa allí), Jean domina Difícil y Lía, Experto. El poder de Jean está listo en ~85 % de los tableros de Normal, ~75 % de Difícil y ~65 % de Experto (con dos rebobinados en los tableros largos); el de Juth en todos los de Normal, ~65 % de Difícil y ~70 % de Experto (`POWER_READY_SHARE`; los demás tableros «descansan», nunca el primero, un jefe ni dos seguidos). La reserva de Lía es el 40 %, 20 % y 25 % del mínimo según el camino. Las pistas ganadas por nivel son más escasas (cada 5, 6 y 8 niveles: `hintEvery`) y los premios de los minijuegos también (×1, ×0,8 y ×0,6: `PRIZE_PATH_SCALE`).

`src/game/balance.js` modela estas reglas (rebobinado del 33 % de Jean, ~25 % de los pasos de Juth, reserva de Lía, camino heroico, sellos, minijuegos, tienda y revivir) y `npm run simulate` imprime las tablas con las que se calibró; `tests/balance.test.js` vigila los rangos. Resumen de lo calibrado (jugador medio / bueno / experto, media de los tres héroes): Normal llega a ~55 / ~84 / ~94 niveles, Difícil a ~33 / ~64 / ~91 y Experto a ~17 / ~44 / ~80. Los tres poderes aportan entre 8 y 32 niveles extra según el camino (en Normal Jean destaca algo más que Lía y Juth).

En **Práctica** todo es gratis y no se gasta nada. Los poderes se leen del objeto `run`, así que sobreviven
a recargar la página y a las partidas guardadas antiguas.

---

## Pruebas

`npm test` (Vitest) comprueba:

- **Solver:** mínimos exactos, la pista siempre acorta 1, simetría de movimientos, tableros sin solución.
- **Generador:** determinismo y que alcanza el mínimo objetivo.
- **Banco de niveles:** las 100 dificultades × 12 tableros son válidos, resolubles y alcanzan su objetivo.
- **Construcción de niveles:** el mínimo anunciado es el real para cada ajuste adaptativo y ruta, y crece a lo largo de cada camino.
- **Partida completa:** 3 caminos × 100 niveles jugados de forma óptima; siempre se gana con el mínimo y puntos perfectos.
- **Poderes:** turnos de reserva de Lía, rebobinado de Jean (33 %) y destino de Juth (25 % de los pasos), una carga guardada por tablero, Práctica sin consumo.
- **Reglas:** movimientos restantes y estados ok / aviso / último / eliminado.

## Mundo e historia

El juego transcurre en **Thyes, año 4133**, un mundo de diez reinos (las diez ciudades). La sombra de **Vhorn** apagó el Faro del Amanecer y **Tri**, guardiana del Faro, selló los reinos: todos creen que fue ella quien los encerró. Cada sello lleva grabada una frase; leídas en orden revelan por qué cerró Tri. Tres luces pueden despertar lo sellado —la Brasa (Lía), la Hora (Jean) y la Palabra (Juth)— y la llave roja abre cada cerrojo. Cuatro pueblos antiguos guardan pedazos de la historia: los **Kogn** (navegantes, en el Puerto), los **Sahrim** (caravaneros, en el Oasis), los **Ennari** (escribas de la corteza, en la Aldea) y los **Aluen** (tejedores de puentes bajo las estrellas, en la Ciudad Celeste).
Los nombres y la trama están en [`src/data/lore.js`](src/data/lore.js) y los textos de cada capítulo y héroe en [`src/data/story.js`](src/data/story.js); `tests/lore.test.js` vigila que todo calce.

## Modos: Aventura, Retos diarios y Logros

El menú principal tiene tres pestañas.

**Aventura** es la historia de 100 niveles de siempre (Normal, Difícil, Experto).

**Retos diarios** ([`src/game/daily.js`](src/game/daily.js), [`src/ui/daily.js`](src/ui/daily.js)): series de tres tableros, iguales para todos, que cambian a la medianoche local del jugador (el panel muestra cuánto falta). El tablero sale de la fecha con el mismo banco y generador que la aventura, sin servidor.

| Reto | Se abre | Tablero |
|---|---|---|
| Clásico | Desde el principio | Sin piezas especiales |
| Rocas y hielo | Nivel 20 en Aventura | Un día rocas, al siguiente hielo |
| Mecanismos | Nivel 30 | Candados y piezas pesadas |
| Todo junto | Nivel 50 | Todas las piezas especiales |
| Maestro | Nivel 100 | Todas las piezas, con el límite ajustado de un jefe |

- El nivel que cuenta es el más alto alcanzado en cualquier camino y no se pierde al terminar una partida.
- Cada reto tiene tres tableros con mínimos de 5, 8 y 12 movimientos. Se puede retomar la partida y repetir cada tablero para mejorar su marca.
- **Medallas**: oro en el mínimo exacto, plata hasta un 15 % más (al menos 2 movimientos), bronce al resolver.
- **Racha**: un día al resolver los tres tableros de cualquier reto. A los 3, 5 o 7 días seguidos, una aventura nueva empieza con 3, 5 u 8 pistas extra, según el tramo más alto (se suman a las del Farol de pistas). Si se rompe la racha, caduca el premio para futuras aventuras. Las pistas ya entregadas quedan en la partida.
- Los retos guardan su partida por separado de la Aventura y se puede compartir el resultado.

**Logros** ([`src/game/achievements.js`](src/game/achievements.js), [`src/ui/achievements.js`](src/ui/achievements.js)): 18 logros de Aventura y de retos diarios, con progreso visible. Cada uno desbloquea una recompensa cosmética que se activa con un toque en la misma pestaña: música del menú (temas de las ciudades y del jefe; al tocarla suena al instante), aspecto de la llave, diseño de las piezas y celebración al resolver. Las bloqueadas se ven con candado y dicen con qué logro se consiguen. Nada cambia las reglas ni la dificultad. Para añadir una recompensa: una entrada en `REWARDS`, un logro que la dé y su estilo en `33-daily.css`.

## Idiomas

El juego está en **inglés, español y chino simplificado**. El español es el idioma de origen (así están escritos el código y los datos); los demás se aplican en el navegador con el traductor de [`src/i18n.js`](src/i18n.js), que busca cada texto visible en el diccionario del idioma activo.

- **Textos centralizados**: todo lo que se lee en cada idioma vive en `src/i18n/<idioma>-ui.js`, `-game.js`, `-story.js` y `-shop.js` (`en`, `zh`), con las mismas claves —el texto en español— y en el mismo orden. Para añadir un idioma: crear sus cuatro archivos, registrarlo en `LANGS`, `DICTS` y `LANG_INFO` y poner su bandera en el selector de `index.html`.
- **Idioma inicial**: el que eligió el jugador la última vez; si no hay elección, el del navegador (`navigator.languages`, p. ej. `es-CL` → español, `zh-TW` → chino); si no es ninguno de los tres, inglés (`detectLang`).
- **Selector**: tres banderas en el menú principal; el cambio es instantáneo y no corta la música.
- **Nombres propios** (Lía, Jean, Juth, Vhorn, Thyes, Tri, los mercaderes y los cuatro pueblos) se dejan en alfabeto latino en todos los idiomas; las ciudades y los sellos sí se traducen.
- **Tipografía**: en chino los rótulos usan serifas CJK del sistema (`32-menus.css`), porque las fuentes de cartel no traen esos signos.
- `tests/i18n.test.js` comprueba que los dos diccionarios tienen exactamente las mismas claves, que ninguna traducción está vacía, que conservan los marcadores `{x}` y los símbolos del juego, y que en chino no queda texto en español ni en inglés.

## Música

Cada ciudad tiene UNA melodía central y, a medida que subes por sus 10 niveles, se le suman capas (nivel 1: melodía, cuerdas y bajo mínimo; 2: bajo completo; 3: percusión ligera; 4: acordes; 5: bombo y caja; 6: arpegio; 7: contramelodía; 8: orquesta; 9: melodía doblada una octava arriba; 10: todo). Al pasar a la ciudad siguiente cambia el tema y vuelve a la capa 1. Los temas y las capas están en [`src/audio/themes.js`](src/audio/themes.js) y el secuenciador en [`src/audio/music.js`](src/audio/music.js).
Para escucharlas: `npm run melodies:html` genera `output/melodias.html` (un solo archivo, se abre con doble clic) con un deslizador de capa y un botón «Recorrer 1→10»; en desarrollo también está en `/melodies.html`.

**Coros y ritmo.** En los estribillos entra un coro de voces sintetizado por formantes (`choir` en `music.js`): sostiene el acorde, canta la melodía y lanza gritos a compás, con palmas de grupo y pandereta. Cada tema define su `choir` en `themes.js` (vocal `ah`/`oh`/`oo`/`eh`, pasos de los gritos y de las palmas); junto con el `hook`, esa firma rítmica es distinta en las diez ciudades, el menú, la elección de héroe y el jefe (lo comprueba `tests/music.test.js`). El menú y la elección de héroe adelantan el coro a la segunda estrofa y el jefe lo usa en quintas graves.

## Voces de los héroes


## Tienda

El botón **🛒 Tienda** (junto a Poder y Pista) vende ayudas que se pagan con los **puntos de la aventura**: lo que gastas
se resta de tu puntaje. Los precios se calculan sobre los puntos base del tablero. El recargo depende del camino: Normal ×1, Difícil ×1,15, Experto ×1,30. Se puede comprar una pista y un paquete de turnos por tablero, además de un salto por ciudad fuera de los jefes.
Los turnos comprados aparecen como cristales de hielo bajo el medidor, y se «derriten» uno a uno al usarlos. Rehacer rebobina el tablero y saltar nivel lo lanza fuera de la pantalla, ambos con efecto:

| Objeto | Precio | Efecto |
|---|---|---|
| 💡 Pista | 0,6 niveles | Una pista extra |
| ↺ Rehacer tablero | 1 nivel | Reinicia el tablero con 0 movimientos (conserva los turnos comprados). Una vez por tablero |
| ⏳ Turnos extra | 1 nivel | +6 % del límite (mínimo 2) para este tablero |
| ⏳ Muchos turnos extra | 1,8 niveles | +15 % del límite (mínimo 4) para este tablero: el paquete grande sale más barato por turno |
| ⏭ Saltar nivel | 4 niveles | Pasa al siguiente sin puntos y sin racha |

Si te pasas del límite de movimientos la aventura termina: **no se ofrece comprar turnos al perder**, hay que comprarlos antes.
Toda compra pide confirmación y la lógica está en [`src/game/shop.js`](src/game/shop.js), con pruebas.

La tienda conserva la misma distribución de productos y botones para todos los héroes, pero cambia de fondo, vendedor y diálogos:

- **Lía:** Maela, la Candilera; taller de faroles y cobre.
- **Jean:** Don Dublón, el Mercader; se conservan el personaje y la tienda originales.
- **Juth:** Azhar, el Tasador de Runas; tienda de mapas, cristales y códices.

Datos y frases propias en `src/game/shop-personas.js`. El descuento heroico de Juth conserva las mismas reglas y se muestra/cobra de forma consistente.

## Minijuegos de descanso

Nueve paradas, en los niveles 15, 25…95. Cada héroe tiene **tres juegos propios**, cada uno una mecánica clásica distinta (nueve en total), y los recorre en ciclo **1 → 2 → 3 → 1**; cada vuelta sube un escalón de dificultad (`bonusTier` 0-2).

| Héroe | Juego 1 | Juego 2 | Juego 3 |
|---|---|---|---|
| Lía (reflejos) | Lluvia de Brasas · atrapar lo que cae (`catch`) | Sombras Fuera · golpear lo que asoma (`whack`) | La Torre de la Forja · apilar a tiempo (`stack`) |
| Jean (tiempo) | La Última Campanada · parar la aguja en la zona (`clock`) | El Compás del Péndulo · tocar al ritmo (`rhythm`) | Las Horas en Orden · tocar 1, 2, 3… contrarreloj (`order`) |
| Juth (memoria) | El Códice de los Nombres · parejas (`pairs`) | El Nombre de las Estrellas · repetir la secuencia (`simon`) | El Sello Errante · seguir el cubilete (`shell`) |

**Cada parada tiene cuatro pasos**: *cómo se juega* (una demostración animada, una sola frase, qué suma y qué resta, y el premio en juego) → cuenta atrás 3·2·1 → el juego → resultado. Todos se juegan con un dedo y también con teclado (flechas, espacio o números).

**Premio: de 0 a 5 estrellas.** Todos los juegos se puntúan con la misma nota: 0 = sin premio, 5 = el premio máximo de la parada. El máximo crece con el nivel (`maxPrize`: 5 pistas en el 15 → 10 en el 95; ×0,8 en Difícil y ×0,6 en Experto) y cada estrella vale su parte proporcional (`bonusPrize`; cualquier nota ≥ 1 da al menos una pista). En el nivel 15 la tabla es 0·1·2·3·4·5 y en el 95 es 0·2·4·6·8·10. No hacer nada da 0 en todos los juegos.

**Código.** Las reglas, la generación determinista de cada partida (por la semilla de la aventura) y la nota son funciones puras en [`src/game/minigames.js`](src/game/minigames.js) (`TUNING` reúne los ajustes por juego y escalón); [`src/ui/bonus.js`](src/ui/bonus.js) es el marco común y cada juego se dibuja en `src/ui/minigames/` (`lia.js`, `jean.js`, `juth.js`; `kit.js` aporta el reloj pausable, los efectos y los sonidos). Si la pestaña se oculta el juego se congela; si se cierra la app la parada vuelve a empezar, y una vez decidida la nota el premio se cobra una sola vez. `tests/minigames.test.js` comprueba que todas las partidas generadas son justas (alcanzables, sin solapes, con margen humano) y que la nota es monótona de 0 a 5.

## Música

Cada ciudad tiene su propia pieza de 8 compases, con melodía, acordes, bajo y timbres distintos (flauta, silbato, oud,
koto, campanas, trompa…), más un tema para el **menú principal** y otro para la **elección de héroe**. Todo está
escrito como datos en [`src/audio/themes.js`](src/audio/themes.js): cada compás de la melodía es un texto como
`"7:3 9:1 11:4 9:2 7:2 4:4"` (grado de la escala : duración en pasos de 1/16; `r` = silencio) y `prog` da el acorde de cada compás.
Para cambiar una melodía basta con editar ese texto; `tests/music.test.js` comprueba que los compases suman 16, que
los tiempos fuertes caen en notas del acorde y que no hay dos temas iguales. El secuenciador acelera el tempo con los
movimientos gastados y entra en «modo pánico» en el último movimiento.

Las piezas son épicas pero distintas: el campo `epic` (1-3) de cada tema añade capas orquestales —cuerdas, timbal suave, trompas que doblan la melodía, caja y platillo—. El menú y la elección de héroe usan el nivel máximo.

## Guardado

Todo vive en `localStorage` (`desbloquea.rogue.v2` con copia `.bak`; se mantiene entre versiones).
Los récords de cada camino se fusionan tomando el máximo, y la partida en curso se guarda tras cada movimiento.

## Caminos heroicos

Tras los niveles 10, 20…90 se elige entre el **Camino normal** y el camino heroico del héroe para los próximos diez niveles.

| Camino | Reto | Puntos extra |
| --- | --- | --- |
| Brasa (Lía) | Menos turnos en el límite base; Lía conserva su reserva. | +35 % |
| Péndulo (Jean) | Una solución más larga cuando hay un tablero compatible en el banco. | +45 % |
| Runas (Juth) | Más mecanismos ya aprendidos si hay una combinación compatible; los jefes y las lecciones conservan su plan. | +45 % |

Se mantienen los descuentos de la tienda. Cada camino tiene además un premio propio: Lía recibe una pista gratis cada cuatro tableros; Jean rebobina la mitad pero tiene un rebobinado extra en el jefe; Juth conserva sus runas a plena potencia. Las partidas guardadas conservan el tablero y el límite de turnos con los que empezaron.

**Reliquias** (se elige una al empezar la aventura; no cuentan en el reto diario ni en Práctica, `src/game/relics.js`): Medallón solar +15 % de puntos (también en sellos) · Bolsa mercante −30 % en la tienda (se multiplica con el descuento heroico) y revivir por el 20 % de los puntos en vez del 33 % · Farol de pistas +7 pistas al empezar, que se suman a las del camino y a las de la racha diaria.

## Sellos opcionales

Desde el nivel 20 hay un sello cada tres o cuatro niveles, en tres tipos (bronce pequeño, plata medio, oro gran premio según el rodeo que cuesta); la primera vez se explica con una ventana de ayuda. Cada pieza especial (roca, pesada, candado, hielo) tiene además un **nivel extra de tutorial** justo antes del nivel donde aparece: no da puntos ni cuenta como nivel, no se puede perder y señala cada movimiento. El calendario evita las primeras lecciones de piezas especiales y se calcula en `src/game/seals.js`. Una pieza concreta y una casilla del suelo llevan el mismo emblema y borde discontinuo dorado. Solo esa pieza recoge el sello al atravesar la casilla, incluido el recorrido intermedio de una pieza de hielo. Se puede salir sin recogerlo.

El sello da puntos al recogerlo. Su valor crece con la dificultad y tiene en cuenta el coste del desvío; el bono heroico (+15 %, +25 % con Jean) se aplica también a esos puntos. No altera el mínimo de movimientos para salir ni el cálculo habitual de puntos del nivel. El premio se guarda en una contabilidad por nivel y no se vuelve a dar al rebobinar, rehacer, revivir o recargar. Los tableros antiguos ya guardados se restauran sin inyectarles un nuevo objetivo.

La colocación recorre movimientos legales antes de salir y añade una ruta de salida exacta. Respeta muros, candados, pesadas y el grafo dirigido del hielo. Cada sello pasa además una reproducción de su ruta completa en tiempo de ejecución. Si no se encuentra una colocación certificada se conserva el tablero original sin añadir un objetivo inválido. El margen extra de turnos está acotado por el mínimo del tablero, hasta seis turnos; solo se añade lo necesario para permitir la ruta comprobada más un turno de margen. El juego y el simulador usan el mismo constructor `src/game/build-adventure.js`.

Verificación reproducible de todos los niveles, tres dificultades, dos rutas y tres héroes:

```sh
TEST_THREADS=2 npm run simulate:seals -- --full --seeds=3
```

La simulación de la versión 46 está en [`seal-simulation-report.json`](seal-simulation-report.json): 1.710 tableros reales, 5.130 comprobaciones de héroe y 1.458 rutas de sello certificadas, sin fallos. En esa muestra 31 rutas necesitaron ampliar el límite, como máximo cinco turnos. El presupuesto determinista de búsqueda puede recortar la exploración de candidatos; todos los objetivos emitidos conservan una ruta completa y validada. El modelo probabilístico antiguo de `npm run simulate` sigue separado de esta comprobación exacta de alcanzabilidad.

## Posicionamiento (SEO)

`index.html` incluye título y descripción, URL canónica, Open Graph y Twitter Card (imagen `public/og-image.jpg`, 1200×630), datos estructurados `VideoGame` (JSON-LD) y un texto de respaldo `<noscript>`. Al compilar se generan `robots.txt` y `sitemap.xml`. La dirección pública se define al construir: `SITE_URL=https://dawnslide.com npm run build` (por defecto `https://dawnslide.com`). Tras publicar: dar de alta el sitio en Google Search Console y enviar `sitemap.xml`.

## Calibrador (programa aparte)

`npm run calibrator` abre http://localhost:5199: una matriz editable nivel × mecánica (roca, pesada, candado, hielo, portón, maleficio y sellos de bronce, plata y oro, con ★ para «tutorial aparte») y los **turnos mínimos de cada camino** (Normal · Difícil · Experto), con el límite y los puntos de un resultado perfecto calculados con las fórmulas reales del juego. Guarda en SQLite (`tools/calibrator/calibration.db`, local) y exporta cada cambio a `tools/calibrator/calibration.json` (este sí se versiona): de ahí se adapta el calendario y la dificultad del juego.

**Las preferencias son una guía, no una ley.** `npm run calibrate` (`scripts/calibrate.mjs`) las convierte en el calendario real (`src/data/calibration.json`): respeta dónde llega cada mecánica (★), cuántos niveles especiales hay y cómo crecen las mezclas, pero **optimiza el reparto** (ninguna mecánica se repite seguida, la recién llegada vuelve enseguida, las mezclas crecen hasta usar todas juntas pasado el 80, maleficio y sellos no caen en jefes ni en tutoriales) y **comprueba que existan tableros** de cada combinación a la dificultad pedida (si no, cambia la mezcla por otra del mismo tamaño). Genera solo los tableros que faltan (`decorate-levels --plan`, familias `combo_<letras>`: w roca, h pesada, g candado, i hielo, d portón). Turnos mínimos: Normal parte de 3 y sube 1 cada 3 niveles (jefes +2); Difícil y Experto siguen las preferencias, siempre ascendentes.

## Salida en cualquier lado

A partir del nivel 17, y luego cada 6 o 7 niveles (irregular, según la partida), el tablero se gira 90°, 180° o 270°, de modo que la llave sale abajo, a la izquierda o arriba; el resto de niveles mantienen la salida a la derecha, así es una sorpresa. Cada giro se anuncia con una introducción de ~2 s («Maleficio», `src/ui/curse.js`; un toque la salta) y el marco del tablero lleva un borde maldito violeta mientras dura el nivel (`src/game/orientation.js`). Es un giro visual: el motor no cambia; el arrastre se traduce al eje del tablero y las marcas (gemas, candados) se contragiran para leerse derechas. Los tutoriales y los jefes no giran.

## Empezar desde un nivel desbloqueado

En la pantalla de héroe, bajo el poder, hay cuatro opciones de inicio: **Inicio (1)**, **21**, **51** y **71** (`src/game/starts.js`). Las tres últimas aparecen bloqueadas hasta alcanzar ese nivel antes **en el mismo camino**; son opcionales. Al empezar más adelante se reciben las pistas que se habrían ganado subiendo, y los tutoriales de mecánicas aún no vistas siguen apareciendo.

## Simuladores de equilibrio

- `npm run simulate` (`src/game/balance.js`): la partida de 100 niveles con poderes de héroe, camino heroico, sellos, tienda, revivir y minijuegos.
- `npm run simulate:bosses` (`src/game/boss-balance.js`): **segundo simulador** de los jefes. Añade un *reloj humano* (cada movimiento cuesta ejecutarlo y pensarlo, según habilidad y largo del tablero), el efecto de las piezas especiales sobre los errores (`FAMILY_HARD`) y el duelo de jefe (se gana dentro del límite de turnos y, si lo hay, del tiempo). Imprime la regla de cada jefe, la tasa de victoria por camino y habilidad, el jugador típico de cada jefe frente a su tasa objetivo y las causas de derrota. `npm run simulate:bosses -- 500 --calibrar` propone los valores de `BOSS_RULES` (`src/game/bosses.js`) para las tasas objetivo (`BOSS_TARGET`).
- Para retocar la dificultad de un jefe: cambia su `cap` (tope del límite de turnos) o su `mult` (holgura de la contrarreloj) en `BOSS_RULES`, mira la tabla y ajusta hasta que el jugador típico quede cerca del objetivo. `tests/boss-balance.test.js` lo vigila.
