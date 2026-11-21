# Cartas del destino — propuesta de pool

Al cerrar cada ciudad (niveles 10, 20 … 90) el jugador elige **1 de 3 cartas del destino**. Hay **9 elecciones**
y **27 cartas**:

- Al empezar la partida se **baraja el mazo de 27** con la semilla de la partida (`run.seed`).
- La ciudad *k* muestra las cartas `3k, 3k+1, 3k+2` del mazo barajado. Las 3 que se ven se **descartan para siempre**,
  elijas la que elijas, así que **ninguna carta se repite**. En una partida completa pasan las 27, cada una una vez,
  en un orden distinto cada partida.
- Las cartas elegidas **se acumulan** hasta el final.
- Solo en Aventura. El Diario y la Práctica no llevan cartas, igual que las reliquias (`relicFor`).

Implementación del sorteo: `run.fateDeck` (orden barajado, 27 ids) + `run.fate` (las elegidas). Como el mazo sale de
la semilla, una partida restaurada o transferida por QR ve exactamente las mismas ofertas.

## Reglas de balance

1. **Todo el % de puntos de las cartas se suma** en un único número, que entra al `bonus` de `gainFor`
   junto con el del camino heroico. No se multiplica.
2. **Límites:** ese número queda entre **−30 % y +75 %**. Los turnos extra quedan entre **−2 y +3 por tablero**,
   y el límite nunca baja de `mínimo + 1`.
3. **18 cartas son solo beneficio y 9 son Pactos** (beneficio con costo). En promedio cada oferta trae 1 Pacto,
   pero al ser aleatorio puede tocar ninguno o los tres, y esa es la gracia.
4. Cada efecto es **un número o un interruptor** que ya existe en el código (ver la última columna).

## Las 27 cartas

### Beneficio (18)

| # | Carta | Efecto | Dónde se aplica |
| -- | --- | --- | --- |
| 1 | Brillo | +5 % de puntos | `bonus` de `gainFor` |
| 2 | Fortuna | +8 % de puntos | `bonus` |
| 3 | Constelación | +2 % de puntos por cada carta del destino que tengas (ella incluida) | `bonus` |
| 4 | Destello | El bono de Perfecto sube de +20 % a +35 % | `calcGain` (0,2 → 0,35) |
| 5 | Racha larga | El tope de racha sube de ×1,5 a ×1,7 | `calcGain` (`min(5)` → `min(7)`) |
| 6 | Racha firme | La racha sigue con ≥80 % de eficiencia (antes ≥90 %) | `calcGain` y `applyAdventureWin` |
| 7 | Sello dorado | Los sellos dan +50 % | premio de `seals.js` |
| 8 | Gran tablero | Tableros con mínimo ≥14: +15 % de puntos | `bonus` (si `opt ≥ 14`) |
| 9 | Respiro | +1 turno en cada tablero | `heroLimit` |
| 10 | Holgura | Tableros con pieza pesada o hielo: +2 turnos | `heroLimit` (según `plan.letters`) |
| 11 | Carga | El poder del héroe está listo en +15 % más tableros | `powerReady` (`k + 0,15`, tope 1) |
| 12 | Eco del poder | +1 uso del poder en el último tablero de cada ciudad | `powerUses` |
| 13 | Mercader | Tienda −15 % | `priceOf` |
| 14 | Bolsillo | +3 pistas al tomarla | `run.hints += 3` |
| 15 | Brújula | +1 pista al cerrar cada ciudad | `advanceRun` |
| 16 | Fénix | +1 revivir en la partida | `MAX_REVIVES` + 1 |
| 17 | Ceniza tibia | Revivir cuesta el 20 % de tus puntos (antes 33 %) | `reviveShare` |
| 18 | Cosecha | Al cerrar cada ciudad ganas los puntos base de 1 nivel | `advanceRun` (`baseScore`) |

### Pactos (9) — el costo se muestra en rojo en la carta

| # | Carta | Ganas | Pierdes | Dónde se aplica |
| -- | --- | --- | --- | --- |
| 19 | Juramento | +20 % de puntos | El poder del héroe se apaga | `bonus` · `powerReady` → false |
| 20 | Vidrio | +25 % de puntos | La racha solo sigue con Perfecto | `bonus` · racha |
| 21 | Pacto mercante | +15 % de puntos | Tienda cerrada (revivir sigue) | `bonus` · `availability` |
| 22 | Silencio | +12 % de puntos | No puedes usar pistas | `bonus` · botón de pista |
| 23 | Cuerda floja | +30 % de puntos | −2 turnos en cada tablero | `bonus` · `heroLimit` |
| 24 | Temerario | +15 % de puntos | No puedes revivir | `bonus` · `canPaidRevive` |
| 25 | Ofrenda | +12 % de puntos el resto de la partida | Pierdes el 15 % de tus puntos ahora | `bonus` · `run.score` |
| 26 | Péndulo roto | +3 turnos en cada tablero | −15 % de puntos | `heroLimit` · `bonus` |
| 27 | Botín | Ganas ahora los puntos base de 3 niveles | La tienda cuesta +25 % | `run.score` · `priceOf` |

## Por qué la decisión cambia la partida

- **Orden aleatorio:** Constelación en la ciudad 1 vale +18 % al final. En la ciudad 9 apenas +2 %.
  Ofrenda temprano cuesta poco y rinde 8 ciudades. Tarde cuesta mucho y casi no rinde.
- **Lo que dejas pasar no vuelve:** si en una oferta salen Juramento, Fénix y Racha larga, elegir una es renunciar
  para siempre a las otras dos.
- **Los pactos se combinan:** Juramento + Silencio + Pacto mercante + Temerario hacen una partida «a pelo»
  (sin poder, pistas, tienda ni revivir) que llega al tope de +75 %. Péndulo roto + Respiro + Holgura hacen una partida
  tranquila de pocos puntos.
- **Los pactos chocan con su beneficio opuesto:** Silencio deja sin uso a Bolsillo y Brújula. Juramento deja sin uso
  a Carga y Eco del poder. Pacto mercante deja sin uso a Mercader. Ver que una carta futura ya no te sirve es parte
  de la decisión. Esas cartas se ven grises con el texto «sin efecto por tu Pacto», pero se pueden elegir igual.

## Cambios en el código (todos pequeños)

- Nuevo `src/game/fate.js` con los datos y funciones puras, testeables como `heroes.js`:
  `FATE_CARDS`, `fateDeck(seed)`, `fateOffer(run, city)`, `fatePoints(run, G)`, `fateTurns(run, G)`, `hasFate(run, id)`.
- `run.fateDeck` y `run.fate` en `newAdventureRun`, `restoreRun`, `save-merge` y la transferencia por QR (v4).
- Pantalla de elección en el mismo punto que `needsTravelChoice`: primero la carta y después el viaje.
- Si se quitan los jefes, desaparece `BOSS_POINTS_BONUS` (+30 %). Las cartas de puntos de una partida típica
  (+25/40 %) lo reemplazan, y hay que revisar los umbrales de los logros de puntaje.
- Logros posibles: «Termina con 4 Pactos», «Llega al tope de +75 %», «Gana sin cartas de puntos».
