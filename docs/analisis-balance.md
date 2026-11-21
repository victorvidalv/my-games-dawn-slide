# Análisis de balance — modo Aventura

Fuente: el simulador determinista de `src/game/balance.js` (`npm run simulate`), 300–400 partidas por combinación de
héroe, camino y habilidad (0,4 casual · 0,6 media · 0,8 buena · 0,92 experta). Es un modelo para **comparar opciones**,
no una predicción exacta. No simula los reintentos gratis de los niveles 1–9, así que el jugador casual queda algo
peor de lo que le va en el juego real.

## 1. Curva de Normal

Se aplicó la curva propuesta (`src/data/calibration.json`, columna Normal, y `scripts/optimize-calibration.mjs`):

| Tramo | Mínimo de movimientos |
| --- | --- |
| 1–20 | 2 → 6 |
| 21–50 | 6 → 15 |
| 51–80 | 15 → 22 |
| 81–100 | 22 → 25 (meseta) |

Antes iba de 3 a 37, con +2 en los cierres de ciudad (lo que quedaba de los jefes). Ese pico también se quitó.

### Hallazgo: con tableros más cortos, ×1,3 hace Normal **más difícil**

Un error cuesta un número fijo de movimientos (equivocarse y deshacer, unos 2–5), pero el margen de turnos es un
porcentaje del tablero. Con 25 movimientos y ×1,3 quedan 8 turnos de sobra; con 37 quedaban 11.

| Normal, sin poder | antes (3→37, ×2→×1,3) | curva nueva con ×1,3 | **curva nueva con ×2,2→×1,5 y margen mínimo 4** |
| --- | --- | --- | --- |
| hab. 0,40 | 14,7 | 12,2 | **18,3** |
| hab. 0,60 | 27,9 | 19,8 | **30,4** |
| hab. 0,80 | 53,6 | 41,7 | **56,6** |
| hab. 0,92 | 77,1 | 69,2 | **80,1** |

Por eso el límite de Normal pasa a ser **×2,2 al principio y ×1,5 en el nivel 100, con al menos 4 turnos de sobra**
(Difícil y Experto no cambian). El nivel 100 de Normal queda en 25 movimientos con 38 turnos.

Con héroe y cartas, Normal queda así (niveles alcanzados):

| hab. | Lía | Jean | Juth |
| --- | --- | --- | --- |
| 0,60 | ≈57 | ≈57 | ≈63 |
| 0,80 | ≈79 | ≈80 | ≈81 |
| 0,92 | ≈90 | ≈91 | ≈91 |

Un jugador bueno llega cerca del final y uno experto lo termina con frecuencia, sobre todo usando la tienda y los
revivir (la tienda suma unos 20 niveles a la habilidad 0,8 sin héroe).

## 2. Héroes

Niveles extra que da cada poder frente a no tener ninguno (media de las cuatro habilidades):

| Camino | Lía | Jean | Juth |
| --- | --- | --- | --- |
| Normal | 19,8 | 18,4 | 21,9 |
| Difícil | 14,8 | 12,1 | 10,0 |
| Experto | 19,8 | 9,9 | 11,7 |
| **Total** | **18,1** | **13,5** | **14,5** |

**Lía era la más fuerte, no la más débil**, sobre todo en Experto, donde duplicaba a los otros. Sus turnos de reserva
son seguros (no dependen de cuándo te equivoques), mientras que rebobinar y trazar destino se gastan una vez por
tablero.

### Cuánto vale elegir entre 3 cartas en vez de 2

Con las cartas modeladas (el jugador elige la que más le ayuda a sobrevivir: turnos, revivir, poder, pistas):

| | solo poder | poder + 1 de 2 | poder + 1 de 3 |
| --- | --- | --- | --- |
| Lía | 18,3 | 20,4 | 21,4 |
| Jean | 13,7 | 16,5 | 17,6 |
| Juth | 14,6 | 17,3 | 18,5 |

Elegir entre 3 en vez de 2 vale **~1 nivel**: no alcanza por sí solo para cerrar una diferencia de 4–5 niveles.

### Ajuste aplicado

- **Lía elige 1 de 2 cartas; Jean y Juth, 1 de 3** (`FATE_OFFER_BY_HERO` en `src/game/fate.js`).
- **Reserva de Lía**: 40 % del mínimo en Normal (igual), **17 % en Difícil** (antes 20 %) y **18 % en Experto** (antes 25 %).

Resultado (niveles extra con poder y cartas, media de habilidades):

| Camino | Lía (1 de 2) | Jean (1 de 3) | Juth (1 de 3) |
| --- | --- | --- | --- |
| Normal | 21,7 | 22,1 | **24,1** |
| Difícil | 15,3 | **16,9** | 15,0 |
| Experto | **16,7** | 13,9 | 16,5 |
| **Total** | **17,9** | **17,6** | **18,5** |

Los tres quedan a menos de ±3 % de la media, y cada uno sigue siendo el mejor en su camino (Juth en Normal, Jean en
Difícil, Lía en Experto), como dice la selección de héroe.

## 3. Economía

- **Tienda**: con la curva nueva, en Normal casi no hace falta comprar (gasto medio ~500 pts a la habilidad 0,8); en
  Difícil y Experto sigue siendo clave (12–30 mil pts y 5–16 pistas compradas por partida).
- **Revivir**: suma 6–12 niveles a los jugadores medios y buenos, y casi nada al casual. Bien como red de seguridad.
- **Sellos**: aportan ~24–25 % del puntaje del jugador hábil y cuestan unos 5–6 niveles de riesgo. Es el tope de lo
  razonable: si se quiere que pesen menos, bajar el multiplicador del sello de oro (2,1).

## 4. Cartas del destino

- Las que más ayudan a sobrevivir son las de turnos (Respiro, Péndulo roto, Holgura), Fénix y Carga.
- Los Pactos que apagan ayudas (Juramento, Pacto mercante, Temerario) son un riesgo real: el jugador simulado los
  evita salvo que no haya otra opción, que es lo que se busca.
- El tope de +75 % de puntos y de −2/+3 turnos evita que una mano de pactos rompa los logros de puntaje.

## Pendiente / ideas

- Volver a calibrar Difícil y Experto con el mismo criterio de margen mínimo (hoy ×1,06 y ×1,04 al final dejan muy
  poco margen absoluto; el modelo dice que Experto 0,8 se queda en el nivel ~33 sin héroe).
- Modelar los reintentos gratis de los niveles 1–9 en el simulador.
