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
- Desafío diario (único): suma **un solo punto al día** a «resueltos» al llegar al tablero 13 (casi seguro) y el **oro** exige los 15
  tableros sin gastar un turno de más (la reserva es exactamente 150): un jugador de nivel Experto lo logra ≈ 14 % de los días
  (`node scripts/simulate-challenge.mjs`). El modelo usa 0,85 resueltos y 0,12 oros por día; «Maestro» es el mismo contador que
  «resueltos» y «tipos de reto» nunca pasa de 1.
- El Desafío está abierto desde el principio; las rutas se completan hacia los días 35, 70 y 120.
- Los otros dos perfiles (casual ≈ 8 min/día, dedicado ≈ 40 min/día) son el mismo modelo a otro ritmo.

## Cuánto tarda cada rareza (días)

Mediana · mínimo–máximo, entre paréntesis cuántos objetos hay. Se calcula con `node scripts/analyze-unlocks.mjs`
(`--items` lista cada objeto con su día y sus condiciones).

```
Días hasta desbloquear (mediana · mín–máx), por rareza y perfil de jugador

▸ Casual (≈ 8 min/día)
  categoría       común                 rara                  épica                 legendaria            
  Borde           8.8 · 4.4–14 (7)      30 · 19–49 (8)        84 · 59–133 (9)       237 · 138–386 (5)     
  Fichas          8.8 · 8.6–14 (5)      25 · 14–47 (9)        76 · 43–124 (9)       237 · 138–386 (6)     
  Llave           8.8 · 4.4–14 (7)      28 · 14–47 (9)        83 · 22–120 (8)       237 · 66–386 (5)      
  Celebración     10 · 4.4–14 (4)       22 · 14–47 (5)        86 · 59–137 (3)       386 · 138–386 (2)     
  Música          9.9 · 4.2–14 (4)      30 · 8.8–47 (8)       88 · 59–140 (3)       279 · 138–386 (4)     
  Héroes          9.3 · 4.4–14 (3)      22 · 12–47 (5)        84 · 55–137 (7)       237 · 138–386 (6)     
  Cartas          8.8 · 7.9–14 (5)      32 · 14–47 (6)        99 · 53–138 (4)       279 · 138–386 (4)     
  Fondo           9.3 · 4.2–14 (3)      29 · 12–39 (4)        96 · 56–137 (4)       279 · 138–386 (4)     
  Estelas         10 · 4.4–14 (4)       26 · 14–47 (4)        55 · 9.9–84 (3)       279 · 24–386 (3)      
  Clima           9.3 · 4.2–14 (3)      22 · 12–43 (3)        87 · 55–133 (3)       386 · 138–386 (2)     
  Tema            8.8 · 4.2–8.8 (2)     47 · 47–47 (2)        132 · 55–132 (2)      279 · 279–279 (1)     
  Atuendos        9.9 · 7.9–12 (9)      28 · 12–43 (10)       69 · 12–123 (13)      279 · 71–296 (10)     

▸ Regular (≈ 17 min/día)
  categoría       común                 rara                  épica                 legendaria            
  Borde           4.4 · 2.2–7.0 (7)     15 · 9.4–25 (8)       43 · 30–68 (9)        120 · 70–196 (5)      
  Fichas          4.4 · 4.3–7.0 (5)     12 · 7.1–24 (9)       39 · 22–63 (9)        120 · 70–196 (6)      
  Llave           4.4 · 2.2–7.0 (7)     14 · 7.0–24 (9)       42 · 11–61 (8)        120 · 33–196 (5)      
  Celebración     5.2 · 2.2–7.0 (4)     11 · 7.1–24 (5)       43 · 30–69 (3)        196 · 70–196 (2)      
  Música          5.0 · 2.1–7.0 (4)     15 · 4.4–24 (8)       44 · 30–71 (3)        142 · 70–196 (4)      
  Héroes          4.7 · 2.2–7.0 (3)     11 · 6.0–24 (5)       43 · 28–70 (7)        120 · 70–196 (6)      
  Cartas          4.4 · 4.0–7.0 (5)     16 · 7.0–24 (6)       50 · 27–70 (4)        142 · 70–196 (4)      
  Fondo           4.7 · 2.1–7.0 (3)     15 · 6.1–20 (4)       49 · 28–69 (4)        142 · 70–196 (4)      
  Estelas         5.2 · 2.2–7.0 (4)     13 · 7.1–24 (4)       28 · 5.0–42 (3)       142 · 12–196 (3)      
  Clima           4.7 · 2.1–7.0 (3)     11 · 6.1–22 (3)       44 · 28–68 (3)        196 · 70–196 (2)      
  Tema            4.4 · 2.1–4.4 (2)     24 · 24–24 (2)        67 · 28–67 (2)        142 · 142–142 (1)     
  Atuendos        5.0 · 4.0–6.3 (9)     14 · 6.0–22 (10)      35 · 6.0–63 (13)      142 · 36–150 (10)     

▸ Dedicado (≈ 40 min/día)
  categoría       común                 rara                  épica                 legendaria            
  Borde           2.2 · 1.1–3.4 (7)     7.4 · 4.6–12 (8)      21 · 15–33 (9)        59 · 34–96 (5)        
  Fichas          2.2 · 2.1–3.4 (5)     6.1 · 3.5–12 (9)      19 · 11–31 (9)        59 · 34–96 (6)        
  Llave           2.2 · 1.1–3.4 (7)     6.9 · 3.4–12 (9)      21 · 5.5–30 (8)       59 · 16–96 (5)        
  Celebración     2.6 · 1.1–3.4 (4)     5.5 · 3.5–12 (5)      21 · 15–34 (3)        96 · 34–96 (2)        
  Música          2.5 · 1.0–3.4 (4)     7.5 · 2.2–12 (8)      22 · 15–35 (3)        70 · 34–96 (4)        
  Héroes          2.3 · 1.1–3.4 (3)     5.5 · 3.0–12 (5)      21 · 14–34 (7)        59 · 34–96 (6)        
  Cartas          2.2 · 2.0–3.4 (5)     8.1 · 3.4–12 (6)      25 · 13–34 (4)        70 · 34–96 (4)        
  Fondo           2.3 · 1.0–3.4 (3)     7.2 · 3.0–9.9 (4)     24 · 14–34 (4)        70 · 34–96 (4)        
  Estelas         2.6 · 1.1–3.4 (4)     6.6 · 3.5–12 (4)      14 · 2.5–21 (3)       70 · 5.9–96 (3)       
  Clima           2.3 · 1.0–3.4 (3)     5.5 · 3.0–11 (3)      22 · 14–33 (3)        96 · 34–96 (2)        
  Tema            2.2 · 1.0–2.2 (2)     12 · 12–12 (2)        33 · 14–33 (2)        70 · 70–70 (1)        
  Atuendos        2.5 · 2.0–3.1 (9)     6.9 · 3.0–11 (10)     17 · 3.0–31 (13)      70 · 18–74 (10)       

Condiciones por modo de juego: { aventura: 187, diario: 120, desafio: 96 }
249 objetos analizados · 27 avisos
  ⚠ Fichas:silk (épica) pide 1 condiciones (esperadas 2)
  ⚠ Fichas:lava (legendaria) pide 1 condiciones (esperadas 3)
  ⚠ Fichas:lava legendaria sin los tres modos
  ⚠ Llave:neon (épica) llega el día 11 (ventana 26–75)
  ⚠ Llave:neon (épica) pide 1 condiciones (esperadas 2)
  ⚠ Llave:galaxy (legendaria) llega el día 33 (ventana 70–230)
  ⚠ Llave:galaxy (legendaria) pide 1 condiciones (esperadas 3)
  ⚠ Llave:galaxy legendaria sin los tres modos
  ⚠ Estelas:starlight (épica) llega el día 5.0 (ventana 26–75)
  ⚠ Estelas:starlight (épica) pide 1 condiciones (esperadas 2)
  ⚠ Estelas:comet (legendaria) llega el día 12 (ventana 70–230)
  ⚠ Estelas:comet (legendaria) pide 1 condiciones (esperadas 3)
  ⚠ Estelas:comet legendaria sin los tres modos
  ⚠ Atuendos lia:ingeniera (épica) llega el día 6.0 (ventana 26–75)
  ⚠ Atuendos lia:ingeniera (épica) pide 1 condiciones (esperadas 2)
  ⚠ Atuendos lia:brasas (legendaria) llega el día 36 (ventana 70–230)
  ⚠ Atuendos lia:brasas (legendaria) pide 1 condiciones (esperadas 3)
  ⚠ Atuendos lia:brasas legendaria sin los tres modos
  ⚠ Atuendos jean:oni (épica) llega el día 14 (ventana 26–75)
  ⚠ Atuendos jean:oni (épica) pide 1 condiciones (esperadas 2)
  ⚠ Atuendos jean:sakura (legendaria) pide 1 condiciones (esperadas 3)
  ⚠ Atuendos jean:sakura legendaria sin los tres modos
  ⚠ Atuendos van:carmesi (épica) pide 1 condiciones (esperadas 2)
  ⚠ Atuendos van:cuervos (legendaria) pide 1 condiciones (esperadas 3)
  ⚠ Atuendos van:cuervos legendaria sin los tres modos
  ⚠ Atuendos lia: ingeniera (épica) llega antes que mecanica (rara)
  ⚠ Atuendos lia: brasas (legendaria) llega antes que violeta (épica)
```

Los avisos que quedan son de objetos que se retocaron a mano a propósito con una sola condición (atuendos que piden ganar
Difícil con su héroe, estelas del tablero 14 y 15 del Desafío, etc.): no vienen de las metas de retos diarios.

## Cómo se genera y se retoca

- `src/game/unlock-plan.js` lista, para cada objeto, sus condiciones `[estadística, meta]` (todas a la vez). Salió de
  `node scripts/plan-unlocks.mjs` (modelo + rareza + orden de la lista) y después se retocó a mano: volver a generarlo
  pisa esos retoques, así que conviene editar el plan y pasar `analyze-unlocks.mjs`.
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

Tras cambiar el catálogo: añade las condiciones del objeto nuevo a `unlock-plan.js` (o regenera con `node scripts/plan-unlocks.mjs` y revisa el diff) y pasa `node scripts/analyze-unlocks.mjs`.
