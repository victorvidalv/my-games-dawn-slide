# Desbloqueos de Personalizar

Todo lo de **Personalizar** (borde, fichas, llave, cartas del destino, estelas, celebración, música, portada de héroes, fondo, clima, tema de interfaz y atuendos) se
desbloquea **jugando**: no hay puntos ni tienda. Este documento explica cómo se reparte el esfuerzo, para que el ritmo
sea justo: lo común llega pronto, lo raro pide constancia, lo épico lleva semanas y lo legendario es una meta de meses.

## Principios

1. **Nada es trivial.** Hasta lo común pide esfuerzo real (decenas de tableros, varios días de retos…).
2. **Cuentan todos los modos.** Aventura, Desafío y Retos diarios (con sus rachas) alimentan los desbloqueos; cada
   categoría mezcla los tres.
3. **Lo complejo es de las legendarias.** Una legendaria pide **tres condiciones a la vez, una de cada modo**, y suelen
   ser hitos: completar Experto, rango S+, las 3 rutas de Desafío, una racha de 30 días…
4. **Escala por rareza**, igual en todas las categorías, para que un épico de fichas cueste lo mismo que uno de bordes.

| Rareza | Condiciones | Ventana (jugador regular) | Ejemplos |
|---|---|---|---|
| Común | 1 | 1–5 días | 20 tableros · 4 retos diarios · nivel 6 · 6 tableros en Desafío |
| Rara | 1 (más exigente) | 6–22 días | 60 tableros con un héroe · completar una aventura · racha de 5 días · nivel 12 en Difícil |
| Épica | 2 (modos distintos) | 28–70 días | Nivel 15 en Difícil + 29 retos diarios · 130 tableros con un héroe + racha de 20 días |
| Legendaria | 3 (Aventura + Desafío + Diario) | 75–220 días | Completar Experto + 2 rutas de Desafío + racha de 30 días |

## Modelo del jugador

El ritmo sale de un jugador **regular** (15-20 minutos al día, casi todos los días). Está en
`scripts/lib/unlock-model.mjs` y es lo único que hay que cambiar si el ritmo real resulta distinto:

- ~9 tableros resueltos al día; un 25 % en el mínimo de movimientos; rocas, hielo, candados y bloques pesados
  aparecen tras los primeros días.
- Llega al nivel 21 de Aventura en ~10 días; Difícil se completa hacia el día 36 y Experto hacia el día 64.
- Una aventura entera dura ~40 minutos: ~0,16 aventuras completadas al día desde el día 5.
- Retos diarios: ~1,2 al día, un 35 % con oro; cada tipo de reto se abre al llegar a un nivel (10, 13, 18 y 21).
- El Desafío está abierto desde el principio; las rutas se completan hacia los días 35, 70 y 120.
- Los otros dos perfiles (casual ≈ 8 min/día, dedicado ≈ 40 min/día) son el mismo modelo a otro ritmo.

## Cuánto tarda cada rareza (días)

Mediana · mínimo–máximo, entre paréntesis cuántos objetos hay. Se calcula con `node scripts/analyze-unlocks.mjs`
(`--items` lista cada objeto con su día y sus condiciones).

```
Días hasta desbloquear (mediana · mín–máx), por rareza y perfil de jugador

▸ Casual (≈ 8 min/día)
  categoría       común                 rara                  épica                 legendaria            
  Borde           8.6 · 4.4–14 (7)      30 · 19–47 (8)        84 · 59–133 (9)       237 · 138–386 (5)     
  Fichas          8.8 · 6.6–14 (5)      28 · 14–47 (10)       86 · 55–137 (9)       237 · 138–386 (5)     
  Llave           8.3 · 4.4–14 (7)      28 · 14–47 (9)        91 · 55–137 (8)       237 · 138–386 (5)     
  Música          9.9 · 4.2–14 (4)      30 · 8.8–47 (8)       88 · 59–140 (3)       282 · 138–386 (4)     
  Héroes          6.6 · 4.4–14 (3)      22 · 12–47 (5)        84 · 55–137 (7)       237 · 138–386 (6)     
  Cartas          8.8 · 6.6–14 (5)      33 · 14–47 (6)        99 · 53–138 (4)       282 · 138–386 (4)     
  Fondo           6.6 · 4.2–14 (3)      29 · 12–39 (4)        96 · 56–137 (4)       282 · 138–386 (4)     
  Atuendos        6.6 · 4.4–14 (9)      30 · 12–43 (12)       85 · 49–138 (11)      282 · 164–296 (10)    

▸ Regular (≈ 17 min/día)
  categoría       común                 rara                  épica                 legendaria            
  Borde           4.3 · 2.2–7.0 (7)     15 · 9.5–24 (8)       43 · 30–68 (9)        120 · 70–196 (5)      
  Fichas          4.4 · 3.3–7.0 (5)     14 · 7.1–24 (10)      43 · 28–69 (9)        120 · 70–196 (5)      
  Llave           4.2 · 2.2–7.0 (7)     14 · 7.0–24 (9)       46 · 28–69 (8)        120 · 70–196 (5)      
  Música          5.0 · 2.1–7.0 (4)     15 · 4.4–24 (8)       44 · 30–71 (3)        143 · 70–196 (4)      
  Héroes          3.3 · 2.2–7.0 (3)     11 · 6.0–24 (5)       43 · 28–70 (7)        120 · 70–196 (6)      
  Cartas          4.4 · 3.3–7.0 (5)     17 · 7.0–24 (6)       50 · 27–70 (4)        143 · 70–196 (4)      
  Fondo           3.3 · 2.1–7.0 (3)     15 · 6.1–20 (4)       49 · 28–69 (4)        143 · 70–196 (4)      
  Atuendos        3.3 · 2.2–7.0 (9)     15 · 6.0–22 (12)      43 · 25–70 (11)       143 · 83–150 (10)     

▸ Dedicado (≈ 40 min/día)
  categoría       común                 rara                  épica                 legendaria            
  Borde           2.1 · 1.1–3.4 (7)     7.4 · 4.7–12 (8)      21 · 15–33 (9)        59 · 34–96 (5)        
  Fichas          2.2 · 1.6–3.4 (5)     7.0 · 3.5–12 (10)     21 · 14–34 (9)        59 · 34–96 (5)        
  Llave           2.1 · 1.1–3.4 (7)     6.9 · 3.4–12 (9)      23 · 14–34 (8)        59 · 34–96 (5)        
  Música          2.5 · 1.0–3.4 (4)     7.4 · 2.2–12 (8)      22 · 15–35 (3)        70 · 34–96 (4)        
  Héroes          1.6 · 1.1–3.4 (3)     5.5 · 3.0–12 (5)      21 · 14–34 (7)        59 · 34–96 (6)        
  Cartas          2.2 · 1.6–3.4 (5)     8.2 · 3.4–12 (6)      25 · 13–34 (4)        70 · 34–96 (4)        
  Fondo           1.6 · 1.0–3.4 (3)     7.2 · 3.0–9.9 (4)     24 · 14–34 (4)        70 · 34–96 (4)        
  Atuendos        1.6 · 1.1–3.4 (9)     7.5 · 3.0–11 (12)     21 · 12–34 (11)       70 · 41–74 (10)       

Condiciones por modo de juego: { aventura: 148, diario: 109, desafio: 87 }
203 objetos analizados · 0 avisos
```

## Cómo se genera y se retoca

- `src/game/unlock-plan.js` lista, para cada objeto, sus condiciones `[estadística, meta]` (todas a la vez). Está
  **generado** por `node scripts/plan-unlocks.mjs` a partir del modelo, de la rareza de cada objeto y del orden de su lista.
- Las rarezas están en `REWARDS` y `OUTFITS` (`src/game/achievements.js`); cada categoría se muestra de lo más común a lo
  más raro (el de serie primero).
- Para cambiar el ritmo: edita `unlock-model.mjs` (curvas) o las ventanas de `plan-unlocks.mjs` (`BAND`), vuelve a generar
  y ejecuta el análisis: avisa de los objetos que se salen de su ventana, de los que llegan antes que uno más común o de
  una legendaria que no pida los tres modos. `tests/achievements.test.js` comprueba lo mismo con el plan real.
- Un objeto nuevo solo necesita su rareza: al volver a generar el plan recibe sus condiciones.

## Detalles a tener en cuenta

- **Tableros con cada héroe**: es un contador nuevo (`stats.heroBoards_<héroe>`), solo desde esta versión: no cuenta lo
  jugado antes y no viaja en el código QR de guardado.
- Todo lo demás se calcula con las estadísticas que ya existían. Los objetos desbloqueados se guardan al conseguirlos.
- Los objetos de Personalizar (salvo los 13 primeros bordes, 12 fichas, 13 llaves, 10 celebraciones, 13 músicas y 6 portadas
  del formato antiguo) no viajan en el QR: se vuelven a desbloquear solos al jugar o al importar el progreso.

## Estelas, celebración, clima y tema de interfaz

Cuatro categorías más, con las mismas rarezas y ventanas (los pools de acciones están en `scripts/plan-unlocks.mjs`, cada
uno pensado para lo que adorna):

| Categoría | Qué es | Qué premia |
|---|---|---|
| Estelas (15) | Partículas que deja la ficha al deslizarse (`src/ui/fx.js → trailPath`) | Juego táctico: tableros, mínimos, rocas y hielo, candados, bloques pesados, poderes |
| Celebración (15) | Festejo cuando la llave sale del tablero | Terminar bien: mínimos de movimientos, tramos sin pistas, rachas, aventuras completas |
| Clima (12) | Capa de CSS animada sobre el fondo de la portada (`49-cover-aura.css`) | Avanzar por el mundo (niveles, caminos, cartas) y volver cada día |
| Tema (8) | Paleta de portada, botones, tarjetas y selector de héroe (`50-ui-themes.css`) | Constancia: aventuras completas, niveles, retos diarios |

Tras cambiar el catálogo: `node scripts/plan-unlocks.mjs` y `node scripts/analyze-unlocks.mjs` (0 avisos).
