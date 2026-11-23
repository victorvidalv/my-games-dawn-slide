# Cartas del destino

Al cerrar cada tramo (niveles 3, 6, 9, 12, 15 y 18) se elige **1 carta de 3**. Hay **31 cartas** (21 Bendiciones y
10 Pactos) y 6 elecciones por partida:

- Al empezar se **baraja el mazo** con la semilla de la partida (`run.fateDeck`). Cada tramo muestra las 3 siguientes:
  se descartan elijas la que elijas, así que ninguna carta se repite (pasan 18 de las 31) y cada partida es distinta.
- Una vez por partida se pueden cambiar las 3 cartas ofrecidas (sacan 3 de la reserva del final del mazo).
- Las elegidas se acumulan hasta el final. Solo en Aventura (ni Diario, ni Práctica, ni Desafío).
- Las cartas nuevas van **siempre al final** de `FATE_CARDS`: el código de guardado (QR) guarda la posición de cada una.

## Reglas de la suma

1. Todo el % de puntos de las cartas se **suma** (no se multiplica) y queda entre **−30 % y +90 %**.
2. Los turnos de las cartas quedan entre **−2 y +4 por tablero**; el Reloj de arena se suma fuera de ese tope y el
   límite nunca baja de `mínimo + 1`.
3. La Brasa intacta de Lía (+12 %) y la reliquia se aplican aparte del tope.

## Las 31 cartas

Valor medido con `node scripts/analyze-balance.mjs 250 raw 7`: la carta sola desde el nivel 7, frente a no tener
ninguna (media de héroes, caminos y habilidades 0,6–0,92). «Niv» = niveles extra alcanzados; «Pts» = % de puntaje.

### Bendiciones (21)

| Carta | Efecto | Niv | Pts | Combina con |
| --- | --- | --- | --- | --- |
| Brillo | +15 % de puntos si no usas pistas en el tablero | — | +9 % | Temerario, Ascetismo |
| Fortuna | +12 % de puntos en cada tablero | — | +9 % | todo |
| Constelación | +4 % de puntos por cada carta que tengas | — | +3 %→+24 % | elegirla pronto |
| Destello | Bono de Perfecto de +20 % a +40 % | — | +12 % | Vidrio, Maestría |
| Racha larga | La racha llega hasta ×1,8 | — | +10 % | Racha firme, Impulso |
| Racha firme | Racha con 75 % de eficiencia; si se rompe, conservas la mitad | — | +5 % | Racha larga, Impulso |
| Gran tablero | +22 % de puntos del nivel 12 al 21 | — | +12 % | Abismo, Frenesí |
| Ceniza tibia | +35 % de puntos y +1 turno en tableros con maleficio | +0,1 | +10 % | — |
| Respiro | +2 turnos en cada tablero | +0,5 | +3 % | Cuerda floja, Frenesí, Codicia |
| Holgura | +3 turnos si hay pieza pesada o hielo | +0,6 | +4 % | — |
| Carga | Tu poder está listo en todos los tableros y +1 turno (Lía: +2 turnos) | +0,8 | +8 % | Eco del poder |
| Eco del poder | +1 uso de poder y +1 turno en cada tablero (Lía: +2 turnos) | +0,9 | +7 % | Carga |
| Bolsillo | +3 pistas al elegirla | +0,5 | +6 % | Lucidez |
| Brújula | +1 pista ahora y +1 al cerrar cada tramo | +0,6 | +7 % | Lucidez |
| Fénix | Desbloquea 1 revivir (cuesta 33 % de los puntos) | +1,3 | — | Reencarnación |
| Cosecha | Al cerrar cada tramo, +80 % de los puntos base de un tablero | — | +13 % | elegirla pronto |
| Vínculo | +10 % de puntos por cada Pacto | — | 0→+50 % | los Pactos |
| Lucidez | +5 % de puntos por pista guardada (máx. +30 %) | — | +8 % | Farol, Bolsillo, Brújula, Maestría |
| **Impulso** (nueva) | +1 turno por cada 2 de racha al empezar el tablero (máx. +3) | +0,4 | +3 % | Racha firme, Racha larga |
| **Maestría** (nueva) | +1 pista por cada Perfecto en tableros de 15+ mov. mínimos | +0,8 | +10 % | Lucidez, Destello |
| **Ascetismo** (nueva) | +20 % en tableros sin pista ni poder (Lía: sin tocar la reserva) | — | +10 % | Juramento, Temerario, Brillo |

### Pactos (10)

| Carta | Gana | Paga | Niv | Pts |
| --- | --- | --- | --- | --- |
| Juramento | +50 % de puntos y +1 pista por tramo | Apaga el poder del héroe | −1,3 | +18 % |
| Vidrio | +22 % de puntos | La racha solo sigue con Perfecto | — | +14 % |
| Cuerda floja | +30 % de puntos | −2 turnos en cada tablero | −0,7 | +17 % |
| Temerario | +50 % de puntos | No puedes usar pistas | −1,1 | +18 % |
| Ofrenda | +18 % de puntos el resto de la partida | Pierdes 15 % de tus puntos ahora | — | +11 % pronto, −3 % tarde |
| Péndulo roto | +3 turnos en cada tablero | −15 % de puntos | +0,8 | −7 % |
| Abismo | +60 % en los tableros 19–21 | Pierdes 10 % de tus puntos ahora | — | +7 % |
| Frenesí | +32 % de puntos del nivel 12 al 21 | −1 turno en cada tablero | −0,3 | +14 % |
| **Reencarnación** | 1 revivir | −2 turnos en cada tablero | +1,4 | — |
| **Codicia** (nueva) | +28 % de puntos | Pierdes 1 pista al cerrar cada tramo | −0,4 | +14 % |

### Choques (la carta se ve gris)

- Juramento deja sin efecto a Carga y Eco del poder; Temerario, a las cartas de pistas. Si ya las tienes, el Pacto lo avisa antes de elegirlo («Anula tu carta: …»).
- Temerario deja sin efecto a Bolsillo, Brújula, Lucidez y Maestría.
- Brújula + Codicia se anulan entre sí en las pistas por tramo.

## Builds que el diseño busca

- **Sin ayudas**: Juramento + Temerario + Ascetismo + Brillo + Vínculo. Puntaje enorme (llega al tope de +90 %), sin
  poder ni pistas.
- **Racha**: Racha firme + Racha larga + Impulso (+ Destello). La racha no se pierde entera y da turnos.
- **Biblioteca**: Farol + Bolsillo/Brújula + Maestría + Lucidez. Muchas pistas que además suman puntos si no las gastas.
- **Colchón**: Reloj de arena + Respiro/Holgura, que cubren el costo de Cuerda floja, Frenesí o Codicia.
- **Final fuerte**: Gran tablero + Frenesí + Abismo, que pagan desde el nivel 12 y sobre todo en el 19–21.
- **Segunda vida**: Fénix + Reencarnación, para 2 revivir en los caminos difíciles.
