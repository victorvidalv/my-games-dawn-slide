# DAWNSLIDE

Un puzle de bloques roguelite con tres héroes y 21 niveles. Abre el camino por los siete reinos de Thyes (año 4133) y
devuelve la luz al Faro del Amanecer. Funciona en el navegador y se puede instalar como app (PWA, también sin conexión).

- **Objetivo:** desliza los bloques y saca la llave roja por la derecha en el menor número de movimientos. Un arrastre
  largo cuenta como **1** movimiento.
- **Límite:** cada tablero da un margen de turnos sobre el mínimo que se aprieta con el nivel (Normal ×2,0 → ×1,3,
  Difícil ×1,65 → ×1,15, Experto ×1,5 → ×1,12, con un margen mínimo absoluto). Sin turnos, la aventura termina.
- **Tres caminos** de 21 niveles (Normal, Difícil y Experto), **tres héroes** con poderes distintos, **tres reliquias**
  y **cartas del destino** cada 3 niveles: cada partida se arma distinta.
- Además: **Retos diarios**, el modo **Desafío** (reserva exacta de turnos) y **Logros** con una tienda cosmética.

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
| `npm test` | Todas las pruebas (con caché de los tests pesados, ver [Pruebas](#pruebas)). |
| `npm run test:fresh` | Igual, sin la caché. `npm run test:full` revisa además todo el banco con más detalle. |
| `npm run lint` · `npm run format` | ESLint · Prettier. |
| `npm run balance` | Análisis de balance: héroes, reliquias y cartas (`scripts/analyze-balance.mjs`). |
| `npm run simulate` | Niveles extra que aporta cada poder frente a no tener ninguno. |
| `npm run levels` · `levels:walls` · `levels:decorate` · `levels:all` | Regeneran los bancos de tableros. |
| `npm run calibrator` | Calibrador de niveles y mecánicas (programa aparte). |

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
2. Haz push a `main`. El workflow [`deploy.yml`](.github/workflows/deploy.yml) ejecuta lint, pruebas y build, y
   publica `dist/`.

`BASE_PATH` fija la carpeta (el workflow la pone sola; con dominio propio en la raíz, `BASE_PATH=/`).

**Versiones y actualizaciones:** cada build con cambios genera un service worker nuevo y los jugadores ven el aviso
«Nueva versión disponible» (se busca al volver a la app y cada 30 minutos). El número visible sale de `package.json`.

---

## Estructura del proyecto

```
index.html              Marcado de todas las pantallas (menú, tablero, modales). Sin lógica.
guia/                   Guía para el jugador (es / en / zh), páginas estáticas.
public/                 Arte que se copia tal cual: backgrounds/, heroes/, historia/, guia/, icons/.
scripts/                Generación de bancos (con cola de hilos en lib/work-queue.mjs), calibración y análisis.
tools/calibrator/       Calibrador de niveles (servidor local aparte).
tests/                  Pruebas con Vitest; tests/parallel reparte los pesados entre hilos.
src/
  main.js               Punto de entrada: estilos y módulos.
  state.js              Estado compartido (S), guardado en localStorage.
  engine/               ★ MOTOR PURO (sin DOM): tablero, solver exacto, dificultad, generador, puntos.
  game/                 ★ REGLAS PURAS (sin DOM): héroes y poderes, cartas del destino, reliquias, partida,
                        retos diarios, Desafío, logros y Canjear, guardado por enlace/QR, simulador de balance.
  data/                 Bancos de tableros (levels.json, special.json, survival.json), calendario, historia.
  ui/                   Pantallas y efectos (usan el DOM).
  audio/                Efectos, secuenciador y melodías.
  i18n/                 Diccionarios de inglés y chino (el español es el idioma del código).
  styles/               CSS en orden de cascada; main.js los importa en ese orden.
```

Regla de oro: **`src/engine` y `src/game` no tocan el DOM.** Toda regla que se pueda romper (dificultad, mínimos,
puntos, poderes, cartas) vive ahí y está cubierta por pruebas; la interfaz solo las llama.

---

## Cómo funciona el motor

**Tablero y solver.** Tablero 6×6; la pieza 0 es la llave roja. `analyze()` explora toda la componente alcanzable y hace
un BFS desde las posiciones ganadoras, así conoce la **distancia exacta** de cada estado: el «Mínimo» y la pista son
siempre exactos.

**Dificultad.** `src/data/calibration.json` fija el mínimo de movimientos de cada uno de los 21 niveles en cada camino
(Normal 3 → 22, Difícil 10 → 28, Experto 16 → 32) y qué mecánicas trae cada nivel. `rateAt(camino, nivel)` lo traduce a
la dificultad del banco y `buildLevel()` elige el estado inicial con el mínimo exacto (con un ajuste adaptativo de ±2
según cómo juegues).

**Piezas especiales.** Rocas fijas, candados con placa, piezas pesadas (1 casilla por movimiento) y hielo (se desliza
hasta chocar). Todas conservan que cada movimiento se puede deshacer, así nunca hay atascos imposibles. Cada pieza nueva
trae un tablero de tutorial que no se puede perder. Los niveles con **maleficio** giran el tablero 90°, 180° o 270° (la
salida queda abajo, a la izquierda o arriba).

**Bancos de tableros.** `generateBoard()` hace escalada de colina determinista. Para que cada nivel cargue al instante,
los tableros se generan antes con `npm run levels:all` (y se versionan `levels.json` y `special.json`). En cada partida,
`varyBoard()` crea una variante propia del tablero elegido.

---

## La aventura

**Puntos.** `base = 50 + 55·mínimo` × eficiencia (100 % en el mínimo, 0 % al doble). Perfecto: +20 %. Racha: ×1,1 por
tablero seguido con ≥ 90 % de eficiencia (máx. ×1,5). Al final se da un **rango** (C a S+).

**Ayudas.** Pistas al empezar (3 / 2 / 1 según el camino) y una cada 4 / 5 / 6 niveles. En Normal, los niveles 1-3 se
pueden repetir gratis al perder.

### Héroes y poderes

| Héroe | Poder |
|---|---|
| **Lía** | Turnos de reserva: +34 % del mínimo en Normal, +23 % en Difícil, +21 % en Experto. **Brasa intacta:** +12 % de puntos si termina el tablero sin tocarla. |
| **Jean** | Rebobinar: vuelve ~⅓ de los movimientos (mín. 3) y recupera sus turnos. 1 uso por tablero (2 si el mínimo es 16+). |
| **Juth** | Trazar destino: ejecuta ~¼ de los pasos óptimos que faltan (nunca el último). 1 uso por tablero. |

El poder de Jean y Juth «descansa» en algunos tableros según el camino (`POWER_READY_SHARE`). Las reglas están en
[`src/game/heroes.js`](src/game/heroes.js) y [`src/game/powers.js`](src/game/powers.js).

### Reliquias

Se elige una al empezar: **Medallón solar** (+15 % de puntos), **Reloj de arena** (+2 turnos en cada tablero) o
**Farol de pistas** (+3 pistas). [`src/game/relics.js`](src/game/relics.js).

### Cartas del destino

Al cerrar cada tramo (niveles 3, 6, 9, 12, 15 y 18) se elige 1 carta de 3 de un mazo de **31** (21 Bendiciones y 10
Pactos con costo), barajado por partida: ninguna se repite y se puede cambiar la oferta una vez. Las cartas se suman
(puntos entre −30 % y +90 %, turnos entre −2 y +4) y se combinan en estrategias. Detalle y valor de cada una en
[`docs/cartas-de-efecto.md`](docs/cartas-de-efecto.md); el análisis de balance en
[`docs/analisis-balance.md`](docs/analisis-balance.md).

---

## Otros modos

**Retos diarios** ([`src/game/daily.js`](src/game/daily.js)): tres tableros iguales para todos, que cambian a la
medianoche local. Medalla de oro en el mínimo, plata hasta un 15 % más, bronce al resolver. La racha de días da pistas
extra al empezar una aventura (3 / 5 / 7 días → +1 / +2 / +3).

| Reto | Se abre | Mínimos |
|---|---|---|
| Clásico | Desde el principio | 5 · 9 · 12 |
| Rocas | Nivel 10 en Aventura | 6 · 10 · 13 |
| Hielo | Nivel 13 | 7 · 11 · 14 |
| Mecanismos | Nivel 18 | 8 · 12 · 15 |
| Todo junto | Nivel 21 | 9 · 13 · 16 |

**Desafío** ([`src/game/survival.js`](src/game/survival.js)): una senda de 15, 16 o 20 tableros con una reserva exacta
de turnos (150, 200 o 250: la suma de los mínimos). Reliquias: **Brújula** (1 pista por tablero), **Reloj de Arena**
(+2 turnos y rehacer 1 tablero) o **Hilo del Retorno** (2 deshacer por tablero).

**Logros y Canjear** ([`src/game/achievements.js`](src/game/achievements.js)): 113 logros en cinco grupos y cofres
de colección; sus puntos se canjean por tableros, fichas, llaves, celebraciones, melodías y portadas. Los diseños épicos y
legendarios están animados (en el tablero se paran en modo ligero; en la tienda se ven siempre).

---

## Guardado y transferencia

Todo vive en `localStorage` (con copia de seguridad y fusión entre pestañas). El avance se puede pasar a otro dispositivo
con un enlace o un código QR (formato v5 en [`src/game/save-transfer.js`](src/game/save-transfer.js); los enlaces v1-v4
se siguen leyendo). El generador de QR propio llega a la versión 12 (287 bytes).

**Modo ligero** ([`src/ui/perf.js`](src/ui/perf.js)): si un móvil va justo durante una partida, se quitan filtros y
animaciones caras durante 3 días; después se vuelve a medir. `?lite=1`, `?lite=0` y `?lite=auto` lo fuerzan.

---

## Pruebas

`npm test` (Vitest) cubre el motor (solver, generador, bancos completos), los 21 niveles de cada camino, los poderes,
las cartas, el balance (simulación), los retos diarios, el Desafío, los logros, el guardado, los idiomas y flujos de
interfaz con happy-dom.

Los tests pesados (banco completo, generador, variantes y los 21 niveles) reparten su trabajo entre hilos
(`tests/parallel`) y guardan el resultado en `node_modules/.cache/dawnslide-tests` con una huella de `src/engine`,
`src/game`, `src/data` y el worker: si nada cambió, se reutiliza y la suite tarda segundos; si cambió, se revisa todo.
`FULL=1`, `CI` o `TEST_CACHE=0` desactivan la caché. Los scripts de generación usan una cola compartida entre núcleos
(`GEN_THREADS` fija los hilos) y dan exactamente el mismo banco.

## Idiomas

Inglés, español y chino. El texto del código está en español y se traduce en el navegador con los diccionarios de
`src/i18n/`; `tests/i18n.test.js` comprueba que no falte ninguna clave ni quede texto sin traducir.

## Mundo e historia

Thyes, año 4133: la sombra de **Vhorn** apagó el Faro del Amanecer y **Tri** selló los reinos. Tres luces pueden
despertar lo sellado —la Brasa (Lía), la Hora (Jean) y la Palabra (Juth)— y la llave roja abre cada cerrojo. Los
pueblos antiguos (Kogn, Sahrim, Ennari y Aluen) aparecen en los viajes entre tramos. Trama en
[`src/data/lore.js`](src/data/lore.js) y [`src/data/story.js`](src/data/story.js).

## Música

Cada reino, el menú, la elección de héroe y el Desafío tienen su pieza, escrita como datos en `src/audio/themes*.js`
(grado de la escala : duración); `tests/music.test.js` y `tests/sequencer.test.js` vigilan compases, acordes y rangos.

## Posicionamiento (SEO)

`index.html` incluye título, descripción, Open Graph, datos estructurados `VideoGame` y `<noscript>`; al compilar se
generan `robots.txt` y `sitemap.xml` (`SITE_URL`, por defecto `https://dawnslide.com`).

## Calibrador

`npm run calibrator` abre http://localhost:5199: matriz nivel × mecánica y mínimos de cada camino. Guarda en SQLite
local y exporta a `tools/calibrator/calibration.json`; `npm run calibrate` lo convierte en el calendario real
(`src/data/calibration.json`) y genera los tableros que falten.
