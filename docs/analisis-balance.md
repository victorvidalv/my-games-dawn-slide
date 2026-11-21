# Análisis de balance — Aventura roguelite (21 niveles)

Fuente: el modelo determinista de `src/game/balance.js`, que corre con `node scripts/analyze-balance.mjs [partidas]
[heroes|relics|cards|pick|raw] [nivel]`. Las habilidades son 0,4 (casual), 0,6 (media), 0,8 (buena) y 0,92
(experta). El modelo sirve para **comparar opciones**, no para predecir puntajes exactos: el jugador simulado hace
Perfecto más a menudo que una persona, así que sus puntajes salen algo inflados.

El simulador ahora modela las reliquias, todas las cartas con sus reglas reales (`fateTurns`, `fatePoints`,
`nextStreak`, Maestría…), la Brasa intacta de Lía, el revivir de Fénix/Reencarnación al caer y tres formas de elegir
cartas: `survival` (llegar lejos), `score` (puntos primero) y `random`.

## 1. Lo que se encontró

| Problema | Medida antes | Arreglo |
| --- | --- | --- |
| **Cosecha** daba +25 % de puntaje sin ningún costo (la mejor carta del juego, por mucho) | +24,8 % | 1,5 → 0,8 tableros base por tramo: +13 % |
| **Juramento** y **Temerario** eran trampas: perdían niveles **y** puntos | −1,8 niv / −1,6 % · −1,1 niv / −0,8 % | Juramento +50 % y +1 pista por tramo; Temerario +50 %: ahora ≈ +18 % de puntos por su riesgo |
| **Gran tablero** y **Frenesí** valían siempre en Difícil/Experto (todos los tableros tienen 14+ movimientos) y poco en Normal | — | Cuentan desde el **nivel 12** en los tres caminos |
| **Respiro** (+1 turno) apenas ayudaba; Holgura era siempre mejor | +0,28 niv | Respiro +2 turnos; Holgura +3; tope de turnos −2/+4 |
| **Eco del poder** solo valía en 1 de cada 3 tableros | +0,10 niv | +1 uso de poder en **cada** tablero |
| **Carga** no hacía nada a Juth en Normal (su poder ya nunca descansa) | 0 niv | Además da +1 turno (Lía: +2) |
| **Abismo** tomado tarde costaba más de lo que daba | +2 % | +60 % en 19–21, pierde 10 % al tomarlo |
| **Constelación**, **Racha firme** y **Ceniza tibia** casi no se notaban | +2–3 % | +4 %/carta; la racha conserva la mitad; +35 % y +1 turno en maleficios |
| **Lía** sacaba muchos menos puntos: su reserva alarga el tablero y baja la eficiencia | −20 a −40 % frente a Jean/Juth | **Brasa intacta**: +12 % si termina sin tocar la reserva; reserva 23 % en Difícil y 21 % en Experto |
| **Reloj de arena** era la reliquia más floja; el **Farol** dominaba Experto | +0,3–0,6 niv vs +1,3 niv | Reloj +2 turnos; Farol +3 pistas |
| Rango final: con puntajes más altos, S+ se volvía fácil | — | Umbrales nuevos (abajo) |

## 2. Héroes (con cartas, eligiendo para sobrevivir; niveles alcanzados de 21)

| Camino | hab. | Lía | Jean | Juth |
| --- | --- | --- | --- | --- |
| Normal | 0,60 | 18,0 | 17,8 | 17,8 |
| Normal | 0,92 | 20,5 | 20,5 | 20,5 |
| Difícil | 0,60 | 16,8 | 16,9 | 16,1 |
| Difícil | 0,80 | 19,5 | 19,7 | 19,1 |
| Experto | 0,60 | 11,2 | 11,7 | 11,0 |
| Experto | 0,80 | 18,0 | 17,4 | 17,6 |

Los tres quedan a menos de un nivel entre sí en cada camino. En puntos, Lía queda algo por debajo con poca habilidad
(su reserva perdona errores, y eso se paga en eficiencia) y por encima con mucha (la Brasa intacta premia no usarla).
Jean y Juth puntúan parecido.

## 3. Reliquias (media de héroes, hab. 0,6–0,92)

| Camino | Medallón solar | Reloj de arena | Farol de pistas |
| --- | --- | --- | --- |
| Normal | +15 % pts, +0 niv | +0,7 niv, +4 % pts | +0,1 niv |
| Difícil | +15 % pts | +0,7 niv, +4 % pts | +0,4 niv, +4 % pts |
| Experto | +15 % pts | +1,3 niv, +7 % pts | +1,1 niv, +9 % pts |

Es un triángulo: el Medallón es para el récord; el Reloj da margen en todos los caminos; el Farol rinde en los caminos
difíciles y combina con Lucidez y Maestría.

## 4. Estrategia de cartas (media de héroes, hab. 0,6–0,92)

| Elección | Normal | Difícil | Experto |
| --- | --- | --- | --- |
| Sobrevivir | 19,4 niv · 31,9 mil pts · 88 % gana | 18,8 · 41,5 mil · 73 % | 16,3 · 43,1 mil · 54 % |
| Puntos primero | 18,0 · 36,8 mil · 66 % | 16,5 · 43,9 mil · 41 % | 13,6 · 42,3 mil · 26 % |
| Al azar | 19,2 · 37,5 mil · 84 % | 18,2 · 45,3 mil · 63 % | 15,4 · 45,2 mil · 43 % |

Codiciar puntos da más puntaje por tablero pero termina muchas menos partidas: los Pactos pesan de verdad. La mejor
partida mezcla las dos cosas según el tramo y la mano, que es lo que se busca.

## 5. Rango final (victorias)

| Camino | S+ | S | A |
| --- | --- | --- | --- |
| Normal | 48.000 | 32.000 | 20.000 |
| Difícil | 62.000 | 43.000 | 27.000 |
| Experto | 80.000 | 55.000 | 36.000 |

(Se mantiene el atajo por Perfectos: S+ con 75 % de Perfectos y puntaje de S; S con 55 %; A con 35 %.)

## Pendiente

- El modelo infravalora los usos extra de poder (Eco del poder): en el juego real un tercer rebobinado vale más.
  Conviene mirarlo con partidas reales.
- Tres tests de `engine.test.js`/`generator.test.js` ya fallaban antes de este cambio (curva de Normal ×2,0 vs ×2,2).
