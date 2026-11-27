/**
 * Datos de cada banco de pruebas de canciones (Jean, Juth y Lía): textos de la página, repertorio base y valores por defecto.
 * Los usan `scripts/build-song-preview.mjs` (que genera el HTML) y `viewer.js` (el reproductor, vía `__PREVIEW__`).
 */
export const PREVIEWS = {
  jean: {
    name: 'Jean',
    prefix: 'JEAN', // prefijo de JEAN_IMPROVED_DATA / JEAN_HAPPY_DATA en themes-jean-preview.js
    repertoire: 'jean', // clave de CITY_REPERTOIRES
    global: 'JeanPreview',
    leadV: 0.042,
    groove: 'pop',
    labels: { impr: 'Mejorada (estilo Corazón al sol)', happy: 'Más alegre (MIDI)' },
    title: 'Jean · Pruebas de canciones y MIDI',
    h1: 'Repertorio de Jean · Banco de pruebas',
    lead: 'Comparativa previa sin reemplazar <code>JEAN_THEME_DATA</code> en <code>src/audio/themes.js</code>. Elige en cada ciudad entre <b>Original</b>, <b>Mejorada (estilo Corazón al sol)</b> y <b>Más alegre (MIDI)</b>. Puedes oírlas con el motor del juego, con el reproductor MIDI multipista o descargar el <code>.mid</code>.',
  },
  juth: {
    name: 'Juth',
    prefix: 'JUTH', // prefijo de JEAN_IMPROVED_DATA / JEAN_HAPPY_DATA en themes-juth-preview.js
    repertoire: 'van', // clave de CITY_REPERTOIRES
    global: 'JuthPreview',
    leadV: 0.034,
    groove: 'soft',
    labels: { impr: 'Mejorada (calmada)', happy: 'Stardew Alegre (Piano)' },
    title: 'Juth · Pruebas de canciones (Stardew Alegre y MIDI)',
    h1: 'Repertorio de Juth · Banco de pruebas',
    lead: 'Comparativa previa sin reemplazar <code>src/audio/themes-juth.js</code>. Elige en cada ciudad entre <b>Original</b>, <b>Mejorada (calmada)</b> y <b>Stardew Alegre (Piano)</b>. Puedes oírlas con el motor del juego, con el reproductor MIDI multipista o descargar el <code>.mid</code>.',
  },
  lia: {
    name: 'Lía',
    prefix: 'LIA', // prefijo de JEAN_IMPROVED_DATA / JEAN_HAPPY_DATA en themes-lia-preview.js
    repertoire: 'lia', // clave de CITY_REPERTOIRES
    global: 'LiaPreview',
    leadV: 0.036,
    groove: 'pop',
    labels: { impr: 'Mejorada (estilo Brasa)', happy: 'Más alegre (MIDI)' },
    title: 'Lía · Pruebas de canciones y MIDI',
    h1: 'Repertorio de Lía · Banco de pruebas',
    lead: 'Comparativa previa sin reemplazar <code>src/audio/themes-lia.js</code>. Elige en cada ciudad entre <b>Original</b>, <b>Mejorada (estilo Brasa entre tréboles)</b> y <b>Más alegre (MIDI)</b>. Puedes oírlas con el motor del juego, con el reproductor MIDI multipista o descargar el <code>.mid</code>.',
  },
};
