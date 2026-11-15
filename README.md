# SLIDE & SLAY

Un puzle de bloques con tres héroes y cien niveles. Abre el camino entre los diez reinos de Thyes (año 4133)
y devuelve la luz al Faro del Alba. Funciona en el navegador y se puede instalar como app (PWA, también sin conexión).

- **Objetivo:** desliza los bloques y saca la llave roja por la derecha en el menor número de movimientos.
  Un arrastre largo cuenta como **1** movimiento.
- **Límite:** tienes de margen al principio el doble del mínimo en turnos y se aprieta hasta ×1,3 en el nivel 100 (Difícil y Experto, aún menos). Al agotarlos sin sacar la llave **ya no se puede mover** y la aventura termina (ganar en el último turno vale).
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
    minigames.js        Reglas puras de los tres retos, ciclo por héroe, progreso y cobro de premios.
    heroes.js           ★ Héroes y poderes como funciones puras (Lía, Jean, Juth) + recompensas de nivel.
    session.js          Flujo de la aventura: empezar, cargar nivel, ganar, perder, viajar, récord.
  data/
    levels.json         Banco de tableros normales (100 dificultades × 12). Se genera, no se edita.
    special.json        Tableros con muros, candados, piezas pesadas y mixtos (mismas dificultades). Se genera.
    zones.js            Las diez ciudades (colores, nombres).
    story.js            Capítulos, diálogo de los héroes.
  ui/                   Pantallas y efectos (usan el DOM): board, heroes, map, bonus, finale, menu, controls, story, fx,
                        coach (guía y leyenda de piezas), shop (tienda de Don Dublón), turns, result.
  audio/                sound.js (efectos, recuperación del audio), music.js (secuenciador) y themes.js (las melodías).
  styles/               CSS en orden de cascada (01-… a 19-…); main.js los importa en ese orden.
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

`rateAt(camino, nivel)` da una dificultad de 1 a 100 con una curva propia por camino (`PATH_CURVES`): Normal llega a 100 en el nivel 100, Difícil en el 55 y Experto en el 40
(**Normal** empieza en 1 (2 movimientos y ya hay que pensar en el nivel 20), **Difícil** en 35 (~13 movimientos), **Experto** en 55 (~21)). `curve(dificultad)` fija el mínimo de movimientos
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
- **Camino heroico** (al terminar una ciudad): conserva el reto de la antigua ruta aventurera —más movimientos mínimos y un límite algo más estricto— para los tres héroes. El beneficio depende del héroe: Jean +10 % de puntos; Lía dos pistas gratis por tablero; Juth −33 % en tienda. El modelo histórico de `npm run simulate` no calibra estos nuevos beneficios.
- Siempre dentro de ±3 del objetivo, y el límite de movimientos baja de ×2 a ×1,3 del mínimo entre el nivel 1 y el 100 (`limitFactor`).

> Si cambias `curve()` o las reglas de generación, ejecuta `npm run levels:all` y `npm test`
> y haz commit de los nuevos `levels.json` y `special.json`.

## Guía para el jugador

Los primeros niveles enseñan jugando (avisos de una sola vez, guardados en `store.tips`): nivel 1 mueve el brillo hasta que
sales; nivel 2 explica Mínimo/Límite/Premio; nivel 3 las ayudas; nivel 4 el poder del héroe; y cada pieza nueva y cada jefe
traen su aviso. No hay pantalla de «Cómo se juega» en el menú principal.

### Puntos

`base = 100 + 20·(dificultad−1)` × eficiencia (100 % en el mínimo, 0 % al doble). Mínimo exacto: +20 %.
Racha: ×1.1 por nivel seguido con ≥ 90 % (máx. ×1.5).

---

## Héroes y poderes

Elegir héroe es permanente durante la aventura. Las reglas están en [`src/game/heroes.js`](src/game/heroes.js).

| Héroe | Poder | Función |
|---|---|---|
| **Lía** | Conserva su proporción actual de turnos de reserva. La barra distingue el tramo verde y muestra cuántos quedan, antes de los turnos comprados. | `bonusTurns`, `heroLimit`, `reserveState` |
| **Jean** | Rebobinar: una vez por tablero devuelve hasta cinco movimientos reales, pieza a pieza, y recupera los turnos. Con menos de cinco vuelve al inicio. No devuelve compras ni pistas. | `powerState`, `beginPower` |
| **Juth** | Trazar destino: una vez por tablero ejecuta tres movimientos de una solución óptima desde la posición actual, consumiendo turnos. Solo se habilita con más de tres pasos pendientes y al menos tres turnos disponibles. | `destinyPlan`, `beginPower` |

Reglas comunes: el botón Poder sustituye Deshacer; Lía tiene poder pasivo y no muestra botón. Todos conservan las pistas de su reserva y ganan **+1 pista cada 5 niveles**. Guardar, recargar, rehacer en tienda o revivir no renueva una carga gastada en el mismo nivel. Los pasos se guardan durante la animación; al recargar se conserva lo ya ejecutado y la carga gastada.

`src/game/balance.js` y sus funciones auxiliares proporcionales conservan el modelo histórico anterior a estos poderes. `npm run simulate` aún no representa el rebobinado de cinco pasos ni la ejecución de tres movimientos; no usar sus resultados como calibración de estos nuevos poderes.

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
- **Poderes:** turnos de reserva de Lía, rebobinado de Jean y tres movimientos óptimos de Juth, una carga guardada por tablero, Práctica sin consumo.
- **Reglas:** movimientos restantes y estados ok / aviso / último / eliminado.

## Mundo e historia

El juego transcurre en **Thyes, año 4133**, un mundo de diez reinos (las diez ciudades). La sombra de **Vhorn** apagó el Faro del Alba y **Tri**, guardiana del Faro, selló los reinos: todos creen que fue ella quien los encerró. Cada sello lleva grabada una frase; leídas en orden revelan por qué cerró Tri. Tres luces pueden despertar lo sellado —la Brasa (Lía), la Hora (Jean) y la Palabra (Juth)— y la llave roja abre cada cerrojo. Cuatro pueblos antiguos guardan pedazos de la historia: los **Kogn** (navegantes, en el Puerto), los **Sahrim** (caravaneros, en el Oasis), los **Ennari** (escribas de la corteza, en la Aldea) y los **Aluen** (tejedores de puentes bajo las estrellas, en la Ciudad Celeste).
Los nombres y la trama están en [`src/data/lore.js`](src/data/lore.js) y los textos de cada capítulo y héroe en [`src/data/story.js`](src/data/story.js); `tests/lore.test.js` vigila que todo calce.

## Música

Cada ciudad tiene UNA melodía central y, a medida que subes por sus 10 niveles, se le suman capas (nivel 1: melodía, cuerdas y bajo mínimo; 2: bajo completo; 3: percusión ligera; 4: acordes; 5: bombo y caja; 6: arpegio; 7: contramelodía; 8: orquesta; 9: melodía doblada una octava arriba; 10: todo). Al pasar a la ciudad siguiente cambia el tema y vuelve a la capa 1. Los temas y las capas están en [`src/audio/themes.js`](src/audio/themes.js) y el secuenciador en [`src/audio/music.js`](src/audio/music.js).
Para escucharlas: `npm run melodies:html` genera `output/melodias.html` (un solo archivo, se abre con doble clic) con un deslizador de capa y un botón «Recorrer 1→10»; en desarrollo también está en `/melodies.html`.

## Voces de los héroes

Cada héroe saluda con su voz cada ciudad: la primera (el Valle) al empezar la aventura y las demás **al elegir el camino** (Avanzar o Tomar camino heroico) al terminar la ciudad anterior, sin texto en pantalla y con la música más baja. Una frase por ciudad y héroe, una sola vez; respeta el botón de sonido. Los audios están en `public/voces/` (`lia-NN.m4a`, `jean-NN.m4a`, `juth-NN.m4a`, con NN = ciudad 01-10) y el guion en `output/voces/guion-voces.md`; el código en [`src/audio/voice.js`](src/audio/voice.js) y [`src/data/voices.js`](src/data/voices.js).

## Minijuegos de descanso

En los niveles 15, 25…95 se entra directamente a un reto: **parejas**, **secuencias** o **precisión**. Cada héroe tiene tres nombres y diseños propios, que se repiten en orden **1 → 2 → 3 → 1**. No hay sorteo de juego, ruleta introductoria ni tragaperras. Solo varían las cartas y las secuencias, de forma determinista por semilla. Los premios dependen del desempeño: al menos una pista al participar, y un máximo que crece de tres a diez. El progreso y los premios se guardan; el cobro es atómico y no se duplica al recargar. Reglas en [`src/game/minigames.js`](src/game/minigames.js) e interfaz en [`src/ui/bonus.js`](src/ui/bonus.js).

## Tienda

El botón **🛒 Tienda** (junto a Poder y Pista) vende ayudas que se pagan con los **puntos de la aventura**: lo que gastas
se resta de tu puntaje, así que cada compra duele. Los precios son **proporcionales**: se miden en «niveles» (los puntos base de un nivel a la dificultad actual), así que suben a medida que avanzas, y además el camino los encarece (Normal ×1, Difícil ×1,25, Experto ×1,5). No suben al comprar ni dependen de cómo juegues. Están calibrados con el simulador (`npm run simulate`, sección Tienda): un jugador que compra a fondo gana unos 20 niveles en Normal y unos 8 en Experto, pero su puntaje se hunde: ayuda y duele.
Los turnos comprados aparecen como cristales de hielo bajo el medidor, y se «derriten» uno a uno al usarlos. Rehacer rebobina el tablero y saltar nivel lo lanza fuera de la pantalla, ambos con efecto:

| Objeto | Precio | Efecto |
|---|---|---|
| 💡 Pista | 3 niveles | Una pista extra |
| ↺ Rehacer tablero | 4 niveles | Reinicia el tablero con 0 movimientos (conserva los turnos comprados) |
| ⏳ Turnos extra | 6 niveles | Unos turnos más para este tablero (la tienda muestra cuántos) |
| ⏳ Muchos turnos extra | 10 niveles | Bastantes turnos más para este tablero |
| ⏭ Saltar nivel | 16 niveles | Pasa al siguiente sin puntos y sin racha |

Si te pasas del límite de movimientos la aventura termina: **no se ofrece comprar turnos al perder**, hay que comprarlos antes.
Toda compra pide confirmación y la lógica está en [`src/game/shop.js`](src/game/shop.js), con pruebas.

La tienda conserva la misma distribución de productos y botones para todos los héroes, pero cambia de fondo, vendedor y diálogos:

- **Lía:** Maela, la Candilera; taller de faroles y cobre.
- **Jean:** Don Dublón, el Mercader; se conservan el personaje y la tienda originales.
- **Juth:** Azhar, el Tasador de Runas; tienda de mapas, cristales y códices.

Datos y frases propias en `src/game/shop-personas.js`. El descuento heroico de Juth conserva las mismas reglas y se muestra/cobra de forma consistente.

## Minijuegos de descanso

Se mantienen nueve paradas, en los niveles 15, 25…95. No aparecen en el selector de héroe.

| Héroe | Juego 1 | Juego 2 | Juego 3 |
|---|---|---|---|
| Lía | Brasas del Juramento (parejas) | El Canto del Alba (secuencia) | El Latido de la Forja (precisión) |
| Jean | La Última Campanada (precisión) | Fragmentos de la Hora (parejas) | El Eco del Péndulo (secuencia) |
| Juth | El Nombre de las Estrellas (secuencia) | El Sello del Firmamento (precisión) | El Códice de los Nombres (parejas) |

Parejas: cuatro parejas y hasta seis errores, sin cronómetro. Secuencias: repetir dos, tres y cuatro símbolos, con dos oportunidades de error. Precisión: tres intentos, recorrido predecible y zona amplia; los puntos se calculan en el instante real del toque. Los controles principales miden al menos 44 px. Reducir movimiento elimina transiciones decorativas sin acelerar las secuencias. Al poner la app en segundo plano se pausa el reto activo sin gastar un intento. Se puede terminar un reto y recoger el premio parcial. Las cartas, las rondas y el premio pendiente sobreviven a una recarga; la continuación añade las pistas una sola vez. Las antiguas partidas pendientes migran conservando un premio ya decidido.

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

Tras los niveles 10, 20…90 solo se elige **Avanzar** (dificultad habitual) o **Tomar camino heroico** (más difícil durante los próximos diez niveles). Los tres caminos heroicos usan la misma progresión de dificultad; solo cambia el beneficio:

- Lía: dos pistas gratis por tablero, antes de gastar la reserva. No se acumulan ni se recargan al rehacer o revivir. Símbolo de brasa y acompañante forjadora.
- Jean: diez por ciento adicional de puntos. Símbolo de reloj y la acompañante elfa original.
- Juth: treinta y tres por ciento de descuento en los productos de la tienda, redondeado al punto. No afecta a revivir fuera de la tienda. Símbolo de runas y acompañante erudito.

Los poderes de botón y la reserva de turnos de Lía se conservan. La selección de héroe muestra por separado Poder y Camino heroico. El identificador guardado del camino heroico sigue siendo `brave` para conservar las aventuras existentes. Reglas y textos comunes en `src/game/routes.js`.
