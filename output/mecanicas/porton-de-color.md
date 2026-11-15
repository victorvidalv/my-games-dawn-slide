# Portón de color · diseño de la nueva mecánica

## 1. La regla (una sola, fácil de decir)
> Un **portón** es una casilla del tablero con un **tinte**. Solo lo cruzan (o se paran en él) las piezas de **ese tinte**; para todas las demás es como una roca.

- Tintes: **◆ azul (Kogn)**, **● ámbar (Sahrim)**, **▲ verde (Ennari)**. La llave roja es siempre roja y **no** cruza portones de color (solo roca para ella), salvo que el nivel lo diga con un portón rojo (opcional, ver §6).
- Una pieza «con tinte» lleva una gema del mismo color y símbolo. Los portones llevan el mismo símbolo grabado, para que se entienda sin depender solo del color (daltonismo).
- Un portón no ocupa la casilla: la pieza del tinte puede quedarse encima. Dos piezas nunca se solapan.

## 2. Por qué encaja con el solver (sin tocar lo que ya funciona)
- **No añade estado.** El estado sigue siendo las posiciones de las piezas. Es una restricción **fija por pieza**: al calcular hasta dónde desliza una pieza, una casilla-portón de otro tinte cuenta como bloqueada.
- Todo lo que ya existe sigue valiendo: distancias exactas, pistas (`hintMove`), poder de Jean (rebobinar), poder de Juth (3 movimientos óptimos), sellos opcionales (certificados con el solver) y la simulación del balance.
- **Solo quita movimientos**: el mínimo con portones es siempre ≥ el mínimo sin ellos. Así el generador puede **exigir** que el portón importe (`minGain`), como ya hace con candados, pesadas y hielo.
- Los movimientos siguen siendo reversibles (igual que roca/pesada/candado). Con **hielo** el grafo es dirigido, y el hielo se detiene ante un portón ajeno: se mantiene la regla «cero callejones sin salida» ya usada para el hielo.
- Cambios técnicos: el texto del tablero gana un token (`d<fila>.<col>.<tinte>`), las piezas con tinte llevan `tone`, y `expand`/`slideRange`/`isValidState`/arrastre usan la misma comprobación. Los muros ya viajan por todas esas funciones, así que el portón entra por el mismo camino (muro + tinte).

## 3. Qué lo hace divertido (y qué lo estropearía)
Bien diseñado, el portón cambia la pregunta de «¿quién se mueve primero?» a **«¿qué pieza puede ir a dónde?»**:
- Una pieza se convierte en **llave de paso**: hay que traer la azul al portón azul para abrirle camino al resto.
- Hace de **muro selectivo**: bloquea a unas piezas y deja a otras, así que un tablero se puede resolver de una sola manera clara.
- Crea **rutas obligadas** que el jugador deduce mirando el tablero, sin leer texto.

Reglas de calidad para el generador (si no se cumplen, se descarta el tablero):
1. El portón está en el carril de **al menos una pieza ajena** que lo necesitaría (si nadie lo estorba, es adorno).
2. La pieza del tinte **debe cruzarlo en la solución óptima** (si no, no hay «llave de paso»).
3. `minGain ≥ 2` movimientos más que el mismo tablero sin portones (≥ 3 desde el nivel 71).
4. **Máximo 3 casillas-portón** por tablero y como mucho **una pieza con tinte por color** hasta el nivel 80, dos después.
5. Nunca sobre la salida de la llave ni sobre una placa de candado ni sobre una casilla de sello.
6. Con hielo: cero callejones sin salida, como hoy.
7. Un solo tinte hasta el nivel 60; dos tintes de 61 a 80; tres desde el 81.

## 4. Cómo se ve y cómo se siente
- **Pieza con tinte:** color fijo (esas gemas usan sus tres colores; el resto de piezas usan la paleta aleatoria sin esos tonos) + símbolo ◆ ● ▲ en el centro.
- **Portón:** arco con barrotes en la casilla, del color y símbolo del tinte; cuando una pieza del tinte lo cruza, los barrotes «se abren» con un destello.
- **Intento inválido:** al arrastrar otra pieza contra un portón, el arrastre se detiene en el borde, el portón vibra y suena un «tuc» corto (sin quitar turnos, igual que hoy con las rocas).
- **No choca con lo existente:** los candados llevan candado 🔒 y placa ▣; los sellos opcionales, borde discontinuo y las rocas son piedra gris. El portón es el único con **arco de color + símbolo**.

## 5. Historia (para que cuadre con lo que ya escribimos)
Los portones son las **marcas de los pueblos antiguos**: los Kogn, los Sahrim y los Ennari cerraban sus caminos con portones que solo abre quien lleva su marca (azul ◆, ámbar ●, verde ▲). Vhorn los cerró para dejar a la gente fuera de su propio hogar. Los Aluen, con sus puentes de luz, ya no necesitan portón: de ahí que el tutorial llegue al final de **Ciudad del Reloj** (nivel 50), donde las marcas se cruzan.
- Frase de Lía: «¿Un portón, Vhorn? Mi brasa ya sabe de qué color es la llave.»
- Frase de Jean: «Cada portón tiene su hora y su dueño. Hoy el dueño soy yo.»
- Frase de Juth: «Un portón es una palabra con dueño, Vhorn. Yo conozco el nombre.»

## 6. Tutorial (nivel extra antes del 50, como los otros cuatro)
Tablero de 3 movimientos hecho a mano, con la guía señalando cada paso:
1. «Este portón ◆ solo deja pasar al bloque azul. Los demás no pueden cruzarlo.» (brilla el bloque azul)
2. «Lleva el bloque azul hasta la casilla del portón.» (el portón se abre con destello)
3. «¡Ya hay camino! Saca la llave roja.»

Hay que **verificarlo con el solver** al implementarlo (3 movimientos exactos, sin trampas).
- **Aviso breve (sin nivel extra)** al estrenar el 2.º tinte en el nivel 61 y el 3.º en el 81: una ventana de ayuda con la regla y el símbolo nuevo.

## 7. Dónde aparece (resumen)
| Tramo | Ciudad | Qué pasa |
|---|---|---|
| 50 | Ciudad del Reloj | **Tutorial extra** + primer nivel con portón (◆) |
| 51–60 | Refugio Glacial | Portón ◆ solo en 53, 56 y 58; el resto como hoy |
| 61–70 | Villa Sakura | Entra el tinte ● (aviso en el 61); portón solo en 61 y 67; en 63 portón + otra pieza; desde el 65 las mezclas lo incluyen |
| 71–80 | Puerto del Volcán | Portones en 71 y 79 (con otra pieza), 74 (solo); mezclas con portón |
| 81–90 | Ciudad Celeste | Entra el tinte ▲ (aviso en el 81); portones en 83 y 89 (con otra pieza), 86 (solo) |
| 91–100 | Castillo Dorado | Todos los tintes; portones en 92 y 98 (con otra pieza), 95 (solo); mezclas finales con todo |

Totales propuestos: **9 niveles solo-portón**, **7 portón + otra pieza** y **las 14 mezclas** desde el 65 incluyen portón. El resto del calendario no cambia.

La tabla nivel a nivel está en `calendario-100-niveles.md`.

## 8. Qué habría que tocar (si se aprueba)
Motor: `board.js` (token del portón y `tone`), `solver.js` (`expand`), `rules.js`/arrastre, `decorate.js` (familias `door` y `doorduo`), `mechanics.js` (calendario, tutorial, aviso), bancos `special.json` regenerados con el simulador. UI: dibujo del portón y de la gema, avisos del coach. Balance: recalibrar `TARGET_KNOTS` en los niveles con portón y repasar el simulador de héroes y de sellos.
