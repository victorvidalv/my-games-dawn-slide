# Evaluación de mecánicas y progresión de los 100 niveles

## 1. Qué tan simple o difícil es cada mecánica
Puntuación 1 (muy fácil) a 5 (muy difícil). Los criterios miran al jugador, no al solver.

| Mecánica | Qué hay que entender | Visible a simple vista | Planificar hacia delante | Riesgo de error | **Dificultad** |
|---|---|---|---|---|---|
| **Roca** | «No se mueve» | Sí, todo | Mínima | Casi nulo (reversible) | **1** |
| **Pesada** | «Una casilla por jugada» | Sí (marca «1») | Poca: cuesta turnos, no espacio | Bajo: gasta turnos | **2** |
| **Portón, 1 tinte** | «Solo pasa la pieza del mismo color» | Sí (símbolo y color) | Media: qué pieza va a dónde | Bajo (reversible) | **2,5** |
| **Candado** | «Se abre si OTRA pieza cubre la placa lejana» | Parcial (placa ▣ lejos del candado) | Alta: dos fases (primero cubrir, luego mover) | Medio | **3,5** |
| **Hielo** | «Patina hasta el tope» | Parcial (no se ve el final del trayecto) | Muy alta: pierdes el control del frenado | Alto (no se puede parar a medias) | **4,5** |
| **Portón, 2–3 tintes** | Recordar qué pieza es de cada tinte | Sí, pero hay que cruzar datos | Alta | Medio | **3,5 – 4** (solo en mezclas) |

Orden de aprendizaje resultante: **Roca → Pesada → Portón → Candado → Hielo**. El hielo es lo último porque es la única mecánica que quita el control de dónde se frena; los tintes extra del portón solo llegan cuando ya se dominan los demás.

## 2. Reglas de la progresión (todo va de a poco)
1. **Una sola novedad a la vez**, siempre con un **nivel extra de tutorial** antes. Las novedades llegan cada **14 niveles**: 8, 24, 38, 52 y 66, más el tutorial del poder del héroe en el 11.
2. **Cuando una mecánica está aprendida, aparece la siguiente.** Cada bloque: tutorial → 4–5 niveles solo con la novedad → 2–3 combinándola con lo ya aprendido → respiros normales.
3. **Una mecánica nueva no se combina en sus 3 primeros niveles**, y su peso en la dificultad se estrena poco a poco durante los 8 niveles siguientes.
4. **Respiros normales** (sin piezas especiales) cada 2 o 3 niveles en Normal, para que la curva sea una sierra suave y no una pared.
5. **Del 80 al 100 se mezclan todas**: tríos (80–85), cuartetos (86–95) y solo en los **últimos 5 niveles (96–100)** las cinco a la vez. La mezcla total llega cuando la última mecánica (hielo) lleva 30 niveles aprendida.
6. **Los tintes del portón crecen despacio:** ◆ del 38 al 69, ◆● del 70 al 87 y ◆●▲ del 88 al 100, cada uno con un aviso breve sin nivel extra.
7. **Más alternativas en los caminos difíciles sin saturar:** en Difícil, la mitad de los respiros se convierten en niveles con 1 mecánica ya aprendida (desde el 30); en Experto, casi todos (desde el 20), y 1 de cada 3 con dos. Las mecánicas nuevas siguen llegando en los mismos niveles en los tres caminos.

## 3. Los 100 niveles de un vistazo
| Tramo | Ciudad(es) | Tutorial | Qué se juega |
|---|---|---|---|
| 1–7 | Valle Esmeralda | — | Solo tableros normales (deslizar, puntos, héroe) |
| 8–23 | Valle → Oasis Dorado | **Roca** (nivel 8) y **poder del héroe** (nivel 11) | Rocas solas, con muchos respiros |
| 24–37 | Oasis Dorado → Aldea de Otoño | **Pesada** (24) | Pesadas solas (24–29) y luego con rocas (31, 36) |
| 38–51 | Aldea de Otoño → Ciudad del Reloj | **Portón ◆** (38) | Portón solo (38–43) y con roca (45) y pesada (48) |
| 52–65 | Ciudad del Reloj → Refugio Glacial | **Candado** (52) | Candado solo (52–57), con roca (59), pesada (62) y portón (64) |
| 66–79 | Refugio Glacial → Villa Sakura → Volcán | **Hielo** (66) | Hielo solo (66–71), con roca (73), pesada (76), portón (78) y candado (79) |
| 80–95 | Puerto del Volcán, Ciudad Celeste, Castillo | — | Tríos (80–85) y cuartetos (86–95) |
| 96–100 | Castillo Dorado | — | **Las cinco mecánicas a la vez** |

Reparto en Normal: **44 sin mecánicas** (7 iniciales y 37 respiros), **31 con una**, **11 con dos**, **5 con tres**, **5 con cuatro** y **4 con las cinco**.

## 4. Tutoriales: dónde caen
| Nivel | Qué enseña | Ciudad | Por qué ahí |
|---|---|---|---|
| 8 | Roca | Valle Esmeralda | Después de 7 niveles para aprender a deslizar |
| 11 | **Poder del héroe** | Puerto de las Velas | Un nivel extra donde se usa el poder de verdad: Jean rebobina, Juth traza el destino y Lía agota los turnos hasta entrar en su reserva (aparece el aviso «Brasa de Lía activada») |
| 24 | Pesada | Oasis Dorado | Caravanas cargadas: todo pesa |
| 38 | Portón de color | Aldea de Otoño | Las marcas de los Ennari |
| 52 | Candado | Ciudad del Reloj | Cerraduras de relojería |
| 66 | Hielo | Refugio Glacial | El hielo, en su sitio natural |

Ningún tutorial cae junto a otro, y el del poder (11) queda a 3 niveles del de la roca (8) para no apilar explicaciones. Los sellos se recalculan para esquivar los tutoriales, como hoy.

## 5. Verificación simulada de la curva
Índice de dificultad = movimientos objetivo del nivel (la curva real de cada camino) × √(estrechez del límite de turnos) × (1 + carga mental de las mecánicas). Pesos de carga: Roca .05 · Pesada .08 · Portón .10 · Candado .14 · Hielo .18, con un recargo del 15 % por cada mecánica extra del tablero.

Media por tramo de 10 niveles:

| Camino | 1–10 | 11–20 | 21–30 | 31–40 | 41–50 | 51–60 | 61–70 | 71–80 | 81–90 | 91–100 |
|---|---|---|---|---|---|---|---|---|---|---|
| Normal | 3,2 | 8,2 | 14,3 | 19,3 | 24,9 | 29,5 | 35,9 | 43,4 | 52,5 | 70,7 |
| Difícil | 13,0 | 19,6 | 26,7 | 35,8 | 44,2 | 48,2 | 52,5 | 56,1 | 64,4 | 80,7 |
| Experto | 21,5 | 29,6 | 38,6 | 45,6 | 49,2 | 51,1 | 55,3 | 58,7 | 68,4 | 81,6 |

- **Sube en los tres caminos, tramo a tramo, sin ninguna bajada entre tramos.**
- Crecimiento entre tramos: Normal ×1,18 a ×1,35 (a partir del 21), Difícil ×1,07 a ×1,36 y Experto ×1,04 a ×1,38.
- **Ritmo suave en el medio:** en Difícil y Experto el tramo 41–70 crece menos (×1,04 a ×1,09), porque sus curvas de movimientos ya llegaron al máximo y ahí el aumento viene de las mecánicas y del límite de turnos. Si quieres más pendiente ahí, se baja el número de respiros.
- **Último tramo (91–100):** sube ×1,19 a ×1,35. Es el más empinado porque entran las cinco mecánicas a la vez; si lo quieres más suave, se retrasa el nivel 96 o se pone un cuarteto más.
- **Sierra:** dentro de cada tramo hay pequeñas bajadas en los respiros, de como máximo el 4 % del valor (media móvil de 9 niveles).
- Aviso: esta comprobación mide la curva planeada, no los tableros con portón reales (aún no existen). Al implementar, hay que repetirla con el simulador de héroes y el de sellos.

## 5. Qué habría que tocar para implementarlo
- **Generador:** hoy hay familias fijas (`walls`, `gates`, `heavy`, `ice`, `duo`, `mixed`). Habría que pasar a **conjuntos de mecánicas** por nivel (`R`, `RP`, `PDC`…) y regenerar los bancos con el simulador exigiendo que cada mecánica importe (`minGain`).
- **Calendario:** `LEVEL_FAMILIES` y `TUTORIALS` en `mechanics.js` pasan a leer este plan.
- **Portón:** lo descrito en `porton-de-color.md`.
- **Balance:** recalibrar la curva de dificultad (`PATH_CURVES`) y repasar con el simulador de héroes y el de sellos.

La tabla completa, nivel a nivel, está en `calendario-100-niveles.md`.
