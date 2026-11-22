# Imágenes originales

Aquí viven las **láminas originales** (tal como salieron del generador) de las que se recortan las imágenes del juego.
Nada de esta carpeta se publica con el juego (no está dentro de `public/`): solo sirve de fuente.
Lo que sí se publica son los recortes ya optimizados, que salen en `public/`.

```
img-originales/
├── atuendos/            láminas de trajes: <héroe>-<n>.png|webp   (lia · jean · juth)
│                        → public/heroes/outfits/<héroe>-<conjunto>-<adv|sel|act>.webp
└── portada/
    ├── heroes/          láminas con los héroes recortados (fondo transparente), 4 escenas cada una
    │                    → public/portada/heroes/<id>.webp        (Personalizar → Portada → Héroes)
    └── fondos/          láminas de paisajes, 4 escenas cada una
                         → public/portada/fondos/<id>.webp        (Personalizar → Portada → Fondo)
```

## Cómo se recortan

Hace falta Node y haber ejecutado `npm install` una vez. Desde la raíz del proyecto:

```bash
node scripts/slice-outfits.mjs      # atuendos (5 conjuntos en columnas × 3 filas: aventura, busto y pose)
node scripts/slice-portadas.mjs     # héroes y fondos de la portada
npm run images                      # al terminar: baja el peso de todo public/ (ver más abajo)
```

- **Atuendos**: `src/game/outfit-sheets.js` dice qué lámina contiene qué conjuntos (ids de izquierda a derecha),
  dónde cortar las filas y con qué color de fondo aplanar. El resultado: 3 imágenes por conjunto.
- **Portada → Héroes**: cada lámina se parte en escenas (2×2), se **limpia el halo semitransparente** de color,
  se quitan los fragmentos sueltos de la escena vecina y se ajusta a la silueta. Los ids y el orden están
  en `scripts/slice-portadas.mjs` (lista `HEROES`).
- **Portada → Fondo**: cada lámina de paisajes se parte en 4 (2×2) y se recorta un margen para quitar la
  línea negra que las separa (lista `FONDOS`).

## Cómo añadir imágenes nuevas

1. Deja la lámina nueva en la carpeta que corresponda (con el nombre que quieras).
2. Añádela a la lista de su script (`HEROES`, `FONDOS` o `src/game/outfit-sheets.js`) con los ids de cada escena, en orden de lectura.
3. Registra el objeto en `src/game/achievements.js` (`REWARDS`: nombre, rareza, `src`) y su acción de desbloqueo en `UNLOCKS`;
   añade los textos nuevos a `src/i18n/en-game.js` y `zh-game.js`.
4. Ejecuta el script de corte y `npm run images`.

## Reemplazar una imagen a mano

Basta con sustituir el archivo de `public/` (mismo nombre, formato WebP). No hay que tocar código.

## Peso de las imágenes

`npm run images` vuelve a comprimir todo `public/` y reduce las imágenes que superan el tamaño máximo que
necesita el juego (ver `scripts/optimize-images.mjs`). Es seguro repetirlo: lo ya optimizado no se toca.
