import { AC, audioPageHidden, clearAudioRecoveryHint, ctx, muted, setSfxKey } from './sound.js';
import { zoneIdx } from '../data/zones.js';
import {
  ALT_VOICE,
  FORM,
  HEROES_THEME,
  LAYERS_PER_CITY,
  MENU_THEME,
  SCALES,
  ZONE_THEMES,
  bossThemeFor,
  cityThemeFor,
  chordMidi,
  entryAt,
  layerOfLevel,
  layersFor,
  sectionAt,
  shiftEntry,
} from './themes.js';
import { isBossLevel } from '../game/mechanics.js';
import { SURVIVAL_TRACK_BARS, shuffleSurvivalTracks } from './themes-survival.js';

/* ============================ Música procedural ============================
   Secuenciador por pasos de 1/16 que toca los temas de themes.js como CANCIONES con forma (intro, estrofas, coro, puente,
   coro final modulado; ver FORM en themes.js): melodía, acordes con séptima, bajo caminante,
   «comping» de guitarra/piano/acordeón, escobillas suaves y, según `epic`, cuerdas, timbal y metales.
   En los estribillos entra un CORO de voces (síntesis por formantes), gritos a compás y palmas con el ritmo propio de cada tema.
   El swing retrasa las corcheas de contratiempo. El tempo sube con los movimientos gastados y entra en
   «modo pánico» en el último movimiento. */
export const Music = (() => {
  const SC = SCALES;

  let bus = null,
    flt = null,
    noiseBuf = null,
    timer = 0,
    playing = false,
    step = 0,
    next = 0,
    duckLv = 1,
    audioOwner = null,
    muffled = false;
  let menuTheme = MENU_THEME; // tema del menú principal: el de serie u otro que el jugador haya ganado (logros)
  let survivalQueue = null;
  let theme = ZONE_THEMES[0],
    baseBpm = 96,
    tempoNow = 96,
    layerNow = LAYERS_PER_CITY,
    layerNext = LAYERS_PER_CITY; // capa que suena / capa que entra en el próximo compás
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    ctx();
    if (bus && audioOwner === AC) return;
    if (bus) {
      try {
        bus.disconnect();
      } catch (_) {}
    }
    audioOwner = AC;
    bus = AC.createGain();
    flt = AC.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = muffled ? 900 : 9000;
    bus.gain.value = 0;
    bus.connect(flt);
    flt.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const vol = () => (muted ? 0 : (theme.boss ? 0.35 : 0.28) * duckLv);
  function osc(type, f, t, dur, v, a = 0.006, filt = 0, det = 0) {
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    let n = o;
    if (filt) {
      const q = AC.createBiquadFilter();
      q.type = 'lowpass';
      q.frequency.value = filt;
      o.connect(q);
      n = q;
    }
    n.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + a + dur + 0.05);
  }

  /** Un timbre por instrumento; todos salen de osciladores y filtros (sin muestras). */
  function voice(kind, midi, t, duration, volume) {
    const f = hz(midi);
    switch (kind) {
      case 'bell':
      case 'celesta':
      case 'glass':
        osc('sine', f, t, duration * 1.3, volume, 0.008, 3800);
        osc('sine', f * (kind === 'glass' ? 2.01 : 2), t, duration * 0.55, volume * 0.13, 0.006, 4200);
        break;
      case 'vibes': // vibráfono: cuerpo sinusoidal con brillo que se apaga
        osc('sine', f, t, duration * 1.5, volume, 0.006, 3500);
        osc('sine', f * 4, t, duration * 0.4, volume * 0.12, 0.004, 5000);
        break;
      case 'flute':
      case 'whistle':
        osc('sine', f, t, duration, volume, 0.05, 2600);
        osc('sine', f * 2, t, duration * 0.8, volume * 0.08, 0.06, 2600);
        break;
      case 'clarinet': // armónicos impares: cálido y «madera»
        osc('square', f, t, duration, volume * 0.32, 0.03, 1500);
        osc('sine', f, t, duration, volume * 0.5, 0.03, 2400);
        break;
      case 'accordion': // dos voces ligeramente desafinadas
        osc('sawtooth', f, t, duration, volume * 0.22, 0.04, 1500, -8);
        osc('sawtooth', f, t, duration, volume * 0.22, 0.04, 1500, 8);
        osc('sine', f, t, duration, volume * 0.25, 0.04, 2200);
        break;
      case 'horn':
        osc('triangle', f, t, duration, volume, 0.055, 1100);
        osc('sine', f * 2, t, duration * 0.8, volume * 0.08, 0.06, 2600);
        break;
      case 'brass':
        osc('sawtooth', f, t, duration, volume * 0.55, 0.035, 1700);
        osc('triangle', f / 2, t, duration, volume * 0.45, 0.04, 900);
        break;
      case 'fiddle': // violín folk: sierra suave con ataque de arco
        osc('sawtooth', f, t, duration, volume * 0.5, 0.05, 2300, -5);
        osc('sawtooth', f, t, duration, volume * 0.3, 0.05, 2300, 7);
        break;
      case 'synth':
        osc('triangle', f, t, duration, volume * 0.7, 0.02, 2400);
        osc('square', f, t, duration * 0.7, volume * 0.18, 0.02, 1800, 3);
        break;
      case 'strings':
        osc('sawtooth', f, t, duration * 0.9, volume * 0.55, 0.045, 1500, -6);
        osc('sawtooth', f, t, duration * 0.9, volume * 0.55, 0.045, 1500, 6);
        break;
      case 'guitar': // cuerda de nailon: ataque rápido, caída corta
        osc('sawtooth', f, t, Math.max(0.15, duration * 0.45), volume * 0.45, 0.004, 1900);
        osc('triangle', f * 2, t, duration * 0.18, volume * 0.14, 0.003, 2600);
        break;
      case 'pizz': // pizzicato / marimba seca
        osc('triangle', f, t, 0.16, volume, 0.003, 2400);
        osc('sine', f * 2, t, 0.08, volume * 0.2, 0.002, 3000);
        break;
      case 'upright': // contrabajo: redondo y corto
        osc('triangle', f, t, 0.3, volume, 0.01, 520);
        osc('sine', f, t, 0.3, volume * 0.8, 0.01, 420);
        break;
      default: {
        // piano, koto…
        const decay = kind === 'piano' ? 0.8 : kind === 'koto' ? 0.7 : 0.42;
        osc('sine', f, t, Math.max(0.12, duration * decay), volume, 0.006, 2800);
        osc('triangle', f * 2, t, duration * 0.25, volume * 0.13, 0.004, 2400);
      }
    }
  }

  /* Formantes de cada vocal (Hz): el coro canta «aah», «ooh», «uuh» o un «¡eh!» corto según el tema. */
  const VOWELS = { ah: [800, 1150], oh: [450, 800], oo: [325, 700], eh: [530, 1840] };
  /**
   * Coro: dos voces de sierra ligeramente desafinadas que pasan por los dos formantes de la vocal, con ataque lento y cola.
   * Suena a grupo de voces, no a un instrumento; se usa en los estribillos (acordes largos + la melodía) y en los gritos a compás.
   */
  function choir(midi, t, dur, v, vowel = 'ah') {
    const f = hz(midi),
      g = AC.createGain(),
      F = VOWELS[vowel] || VOWELS.ah,
      a = Math.min(0.11, dur * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, t + Math.max(a, dur * 0.72));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
    const bands = F.map((fq, i) => {
      const q = AC.createBiquadFilter();
      q.type = 'bandpass';
      q.frequency.value = fq;
      if (q.Q) q.Q.value = i ? 6 : 4.5;
      q.connect(g);
      return q;
    });
    for (const det of [-9, 8]) {
      const o = AC.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      bands.forEach((b) => o.connect(b));
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    g.connect(bus);
  }
  /** Registro de coro mixto: las voces cantan entre Sol3 y Re5 (se oye lleno, nunca chilla). */
  const choirReg = (m) => {
    while (m < 55) m += 12;
    while (m > 74) m -= 12;
    return m;
  };

  function noise(t, dur, v, f, type = 'highpass') {
    const s = AC.createBufferSource(),
      g = AC.createGain(),
      q = AC.createBiquadFilter();
    s.buffer = noiseBuf;
    q.type = type;
    q.frequency.value = f;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(q);
    q.connect(g);
    g.connect(bus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }
  /** Timbal suave: golpe grave con caída de tono, sin chasquido. */
  function timpani(t, midi, v) {
    const o = AC.createOscillator(),
      g = AC.createGain(),
      q = AC.createBiquadFilter(),
      f = hz(midi);
    q.type = 'lowpass';
    q.frequency.value = 380;
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(q);
    q.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.45);
  }

  const targetBpm = () => baseBpm; // la música NUNCA cambia de tempo ni de capas: el aviso de pocos turnos es visual
  const bpm = () => tempoNow;
  const noteOf = (th, deg) => {
    const s = SC[th.sc],
      n = s.length;
    return th.root + s[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
  };

  /* ---------- Batería: cada «groove» es una lista de pasos (0-15) por instrumento ---------- */
  const kick = (t, v) => {
    const o = AC.createOscillator(),
      g = AC.createGain(),
      q = AC.createBiquadFilter();
    q.type = 'lowpass';
    q.frequency.value = 240;
    o.frequency.setValueAtTime(135, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(q);
    q.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.22);
  };
  const snare = (t, v) => {
    noise(t, 0.13, v, 1900, 'bandpass');
    osc('triangle', 190, t, 0.07, v * 0.7, 0.002);
  };
  const rim = (t, v) => {
    noise(t, 0.03, v, 2600, 'bandpass');
    osc('triangle', 950, t, 0.02, v * 0.5, 0.001);
  };
  const conga = (t, v, f = 330) => osc('sine', f, t, 0.1, v, 0.002, 1200);
  /** Palmas de grupo: tres ráfagas muy juntas de ruido medio (varias manos que no caen a la vez). */
  const clap = (t, v) => {
    noise(t, 0.012, v, 1500, 'bandpass');
    noise(t + 0.011, 0.014, v * 0.9, 1700, 'bandpass');
    noise(t + 0.024, 0.1, v, 1350, 'bandpass');
  };
  const GROOVES = {
    pop: { k: [0, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    polka: { k: [0, 8], s: [4, 12], tm: [2, 6, 10, 14], h: [0, 4, 8, 12] },
    latin: { k: [0, 6, 8, 14], rim: [0, 3, 6, 10, 12], cg: [2, 4, 10, 14], sh: [0, 2, 4, 6, 8, 10, 12, 14] },
    shuffle: { k: [0, 8], s: [4, 12], tm: [0, 2, 4, 6, 8, 10, 12, 14] },
    disco: { k: [0, 4, 8, 12], s: [4, 12], oh: [2, 6, 10, 14], h: [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15] },
    soft: { k: [0, 10], rim: [4, 12], sh: [0, 2, 4, 6, 8, 10, 12, 14] },
    bossa: { k: [0, 6, 8, 14], rim: [0, 3, 6, 10, 12], sh: [0, 2, 4, 6, 8, 10, 12, 14] },
    march: { k: [0, 3, 8, 11], s: [4, 12, 14], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    chill: { k: [0, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], rd: [0, 6] },
    bigband: { k: [0, 4, 8, 12], s: [10], rd: [0, 4, 6, 8, 12, 14] },
    drive: { k: [0, 4, 8, 12], s: [4, 12], h: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15] },
  };
  const KV = { k: 0.085, s: 0.055, rim: 0.03, h: 0.013, oh: 0.022, sh: 0.01, tm: 0.02, rd: 0.013, cg: 0.05 };
  function drums(th, st, t, bar, E, mode = 'full', tutti = true) {
    if (mode === 'none') return;
    const g = GROOVES[th.groove] || GROOVES.pop,
      has = (a) => a && a.includes(st),
      full = mode === 'full';
    const fill = full && bar % 4 === 3 && st >= 13; // redoble al final de cada frase
    if (full && has(g.k) && !(fill && st >= 14)) {
      kick(t, KV.k);
      noise(t, 0.012, 0.02, 3200, 'bandpass');
    } // bombo con «clic»: se oye en altavoces pequeños
    if (full && has(g.s) && !(fill && st >= 13)) {
      snare(t, KV.s);
      noise(t + 0.011, 0.05, KV.s * 0.45, 1400, 'bandpass');
    } // caja + palmada en el contratiempo
    if (full && g.s && !fill && bar % 2 === 1 && (st === 7 || st === 15)) snare(t, 0.013); // notas fantasma: el ritmo «camina»
    if (fill) snare(t, 0.03 + 0.012 * (st - 13));
    if (has(g.rim)) rim(t, KV.rim);
    if (has(g.h)) noise(t, 0.035, st % 4 === 2 ? KV.h * 1.45 : st % 4 === 0 ? KV.h * 1.1 : KV.h * 0.8, 7000);
    if (has(g.oh)) noise(t, 0.16, KV.oh, 6000);
    if (has(g.sh)) noise(t, 0.05, st % 4 === 2 ? KV.sh * 1.5 : KV.sh, 5200);
    if (has(g.tm)) {
      noise(t, 0.09, KV.tm, 8000);
      noise(t, 0.07, KV.tm * 0.6, 5500, 'bandpass');
    }
    if (has(g.rd) || (g.rd && st % 2 === 0 && false)) noise(t, 0.25, KV.rd, 5200);
    if (has(g.cg)) conga(t, KV.cg, st % 4 === 2 ? 260 : 330);
    if (tutti && st === 0 && bar % 8 === 0 && bar > 0) noise(t, 1.2, 0.02 + 0.004 * E, 3800); // platillo al empezar cada sección
  }

  /* Riffs de bajo: [paso, intervalo]. r=fundamental, 3, 5, 7, 8=octava. El bajo siempre suena en 40-52 (se oye hasta en el móvil). */
  const RIFFS = {
    pop: [
      [0, 'r'],
      [3, 'r'],
      [6, '5'],
      [8, 'r'],
      [11, 'r'],
      [14, '3'],
    ],
    funk: [
      [0, 'r'],
      [3, '8'],
      [6, 'r'],
      [8, '5'],
      [10, '7'],
      [11, '8'],
      [14, '5'],
    ],
    tumbao: [
      [0, '5'],
      [3, 'r'],
      [6, 'r'],
      [8, '5'],
      [11, 'r'],
      [14, '3'],
    ],
    bossa: [
      [0, 'r'],
      [6, '5'],
      [8, 'r'],
      [14, '5'],
    ],
    gallop: [
      [0, 'r'],
      [2, 'r'],
      [3, 'r'],
      [4, '5'],
      [6, 'r'],
      [8, 'r'],
      [10, 'r'],
      [11, 'r'],
      [12, '5'],
      [14, 'r'],
    ],
    oompah: [
      [0, 'r'],
      [8, '5'],
    ],
  };
  const bassReg = (m) => {
    while (m > 52) m -= 12;
    while (m < 40) m += 12;
    return m;
  };
  const IV = { r: 0, 3: 1, 5: 2, 7: 3 };

  /* Pasos del acompañamiento (acordes cortos) según el estilo */
  const COMP = {
    charleston: [0, 6],
    offbeat: [4, 12],
    oompah: [4, 12],
    strum: [0, 6, 10],
    chop16: [0, 3, 6, 8, 11, 14],
    skank: [2, 6, 10, 14],
    montuno: [3, 6, 10, 12, 14],
    pump: [0, 2, 4, 6, 8, 10, 12, 14],
    arp: [],
    none: [],
  };

  /**
   * Producción «épica» de los jefes (tema con `boss: true`): coro y cuerdas sostenidas con un bordón grave, timbales y bombo de taiko
   * en cada tiempo, metales en acordes de poder, trémolo de cuerdas, platillos en cada frase y, antes de cada sección, un
   * crescendo de redobles y ruido ascendente. Se oye claramente distinta del resto de la música del juego.
   */
  function bossLayer(th, st, t, bar, sd, chord, firstOfBar) {
    const root = chord[0],
      fifth = chord[2],
      low = Math.max(root - 12, 26);
    if (st === 0) {
      firstOfBar.slice(0, 3).forEach((m) => {
        voice('horn', m, t, sd * 15.5, 0.016);
        voice('strings', m + 12, t, sd * 15.5, 0.011);
      }); // coro de metales suaves + cuerdas
      voice('upright', bassReg(firstOfBar[0]) - 12, t, sd * 15, 0.11); // bordón grave
      timpani(t, low, 0.12);
      [root, fifth].forEach((m) => choir(choirReg(m) - 12, t, sd * 15, 0.042, 'oh')); // coro de voces graves: quinta vacía
      if (bar % 4 === 0) noise(t, 1.9, 0.04, 3200); // platillo al empezar cada frase
    }
    if (st === 8) {
      timpani(t, fifth > root ? fifth - 12 : fifth, 0.09);
    }
    if (st === 4 || st === 12) timpani(t, low, 0.05); // pulso de taiko
    // metales en acordes de poder (fundamental, quinta y octava) sobre los tiempos fuertes
    if (st === 0 || st === 8 || (bar % 2 === 1 && st === 10) || (st === 6 && bar % 4 === 3)) {
      [root + 12, fifth + 12, root + 24].forEach((m, i) =>
        voice('brass', m, t + i * 0.006, sd * (st === 0 ? 3.2 : 2), st === 8 ? 0.032 : 0.04),
      );
    }
    if (st === 4 || st === 12) voice('brass', root + 12, t, sd * 1.6, 0.022); // semicorcheas de metal entre los golpes
    // trémolo de cuerdas altas: tensión constante (dos voces, una por semicorchea)
    voice('strings', fifth + 24, t, sd * 1.1, 0.005);
    if (st % 2 === 0) voice('strings', chord[1] + 24, t, sd * 1.8, 0.004);
    // redoble y subida antes de cada sección (último compás de cada 8)
    if (bar % 8 === 7 && st >= 8) {
      if (st % 2 === 0) noise(t, 0.12, 0.012 + 0.0035 * (st - 8), 2200 + (st - 8) * 520, 'highpass');
      snare(t, 0.018 + 0.006 * (st - 8));
      if (st >= 12) timpani(t, low, 0.06 + 0.01 * (st - 12));
    }
    if (bar % 4 === 3 && st >= 12 && st % 2 === 0)
      timpani(t, fifth > root ? fifth - 12 : fifth, 0.04 + 0.005 * (st - 12));
  }

  /* ---------- Forma de canción: ver FORM en themes.js ---------- */
  const rootDeg = (e) => {
    const x = Array.isArray(e) ? e[0] : e;
    return typeof x === 'string' ? Number(x.split(':')[0]) : x;
  };
  const modCache = new WeakMap();
  /** El mismo tema `semi` semitonos arriba (la modulación del coro final). */
  const modulated = (th, semi) => {
    if (!semi) return th;
    let m = modCache.get(th);
    if (!m || m.root !== th.root + semi) {
      m = { ...th, root: th.root + semi };
      modCache.set(th, m);
    }
    return m;
  };
  /** Compás (absoluto) en el que empieza una sección de la forma: la música entra por ahí al cambiar de tema. */
  let songBar = 0;

  function playSurvival(s, t) {
    const bar = Math.floor(s / 16);
    const st = s % 16;
    const sd = 60 / bpm() / 4;
    const chord = theme.prog[bar % theme.prog.length];
    const full = bar >= 8 && bar < SURVIVAL_TRACK_BARS - 2;
    songBar = bar;
    if (theme.kicks.includes(st)) kick(t, full ? 0.095 : 0.065);
    if (theme.snares.includes(st)) snare(t, full ? 0.052 : 0.027);
    if (st % 2 === 0 || (full && st % 4 === 3)) noise(t, 0.035, st % 4 ? 0.012 : 0.021, 7200);
    if (st === 0) voice('strings', noteOf(theme, chord), t, sd * 13, 0.024);
    if (st === 0 || st === 8 || (full && (st === 3 || st === 11))) {
      const degree = st === 11 ? chord + 4 : chord;
      voice('synth', noteOf(theme, degree) - 12, t, sd * 1.7, 0.084);
    }
    const phrase = theme.tune[Math.floor(bar / 2) % theme.tune.length];
    for (const [at, degree, len] of phrase) {
      if (at !== st) continue;
      const pitch = noteOf(theme, degree + (bar % 2 ? chord : 0));
      voice(theme.lead, pitch, t, sd * len * 0.8, 0.075);
      if (bar >= 16 && full) voice('synth', pitch - 12, t, sd * len * 0.65, 0.033);
    }
  }

  function play(s, t) {
    if (s % 16 === 0) layerNow = layerNext; // las capas entran siempre al empezar un compás
    const bar = Math.floor(s / 16),
      st = s % 16,
      sd = 60 / bpm() / 4,
      E = theme.epic || 0;
    const { sec, k } = sectionAt(bar);
    songBar = bar;
    const th = modulated(theme, sec.mod || 0),
      n = SC[th.sc].length;
    // compás de origen: A = 0-7, B = 8-15 (el coro final recorre B y luego A)
    const half = sec.src === 'BA' ? (k < 8 ? 8 : 0) : sec.src === 'B' ? 8 : 0,
      src = half + (k % 8),
      nextSrc = half + ((k + 1) % 8),
      sh = sec.shift || 0;
    const ent = (b, step) => {
      const e = entryAt(th, b, step);
      return sh ? shiftEntry(e, sh, n) : e;
    };
    const chord = chordMidi(th, ent(src, st)); // [fundamental, 3ª, 5ª, 7ª, …]
    const firstOfBar = chordMidi(th, ent(src, 0));
    const nextRoot = chordMidi(th, ent(nextSrc, 0))[0];
    const L = layersFor(Math.max(1, Math.min(th.boss ? LAYERS_PER_CITY : sec.cap, layerNow + sec.lift))); // el jefe nunca se aligera: orquesta completa en todas las secciones
    const last = k === sec.bars - 1,
      building = sec.drums === 'build' || (!!sec.build && last);
    const rise = building ? (sec.drums === 'build' ? (k * 16 + st) / (sec.bars * 16) : st / 16) : 0; // 0→1 a lo largo del redoble
    const hasLead = sec.lead !== false && !(sec.leadBars && k >= sec.leadBars);

    // colchón suave de acordes (cuerdas largas)
    if (st === 0) firstOfBar.slice(0, 3).forEach((m) => voice('strings', m + 12, t, sd * 15, 0.0085));

    // bajo: caminante (jazz) o riff sincopado según el estilo; en los redobles, pedal de corcheas que crece
    let bn = null;
    if (sec.bassFrom > k) {
      /* aún no entra */
    } else if (building) {
      if (st % 2 === 0) bn = firstOfBar[0];
    } else if (L.bass === 'lite' || sec.drums === 'half') {
      // bajo mínimo: solo la fundamental en los tiempos 1 y 3
      if (st === 0 || st === 8) bn = chord[0];
    } else if (th.bassPat === 'walk') {
      if (st === 0) bn = firstOfBar[0];
      else if (st === 4) bn = firstOfBar[2];
      else if (st === 8) bn = chord[0];
      else if (st === 12) bn = nextRoot + (nextRoot % 2 ? -1 : 1); // medio tono hacia la siguiente fundamental
    } else {
      const hit = (RIFFS[th.bassPat] || RIFFS.pop).find((r) => r[0] === st);
      if (hit) bn = hit[1] === '8' ? chord[0] + 12 : chord[IV[hit[1]]];
    }
    if (bn !== null) voice('upright', bassReg(bn), t, 0.26, th.bassV * (building ? 0.6 + 0.5 * rise : 1));

    // acompañamiento
    if (L.comp && !building && (COMP[th.comp] || []).includes(st)) {
      const notes = th.comp === 'strum' ? chord.slice(0, 4) : chord.slice(1, 4);
      notes.forEach((m, i) => voice(th.compVoice, m + 12, t + i * 0.01, 0.13, th.compV));
    }
    // arpegio suave (también en la intro, el puente y el cierre: da aire cuando no hay batería completa)
    if (L.arp || sec.id === 'intro' || sec.id === 'bridge' || sec.id === 'outro') {
      const every = th.arpEvery || 2,
        pat = th.arpPat || [0, 1, 2, 1];
      if (st % every === 0)
        voice(
          th.arpVoice || 'celesta',
          chord[pat[(st / every) % pat.length] % chord.length] + 12,
          t,
          Math.max(0.2, sd * 2),
          th.arpV,
        );
    }

    // gancho rítmico: un ostinato sincopado propio de cada tema sobre las notas del acorde (se repite y se pega)
    const hk = th.hook;
    if (hk && sec.hook !== false && !building && (L.bass === 'full' || !hasLead)) {
      const j = hk.s.indexOf(st);
      if (j >= 0)
        voice(
          hk.voice || 'pizz',
          chord[hk.n[j % hk.n.length] % chord.length] + (hk.oct ?? 12),
          t,
          sd * 1.5,
          (hk.v || 0.017) * (st % 8 === 0 ? 1.3 : 1) * (hasLead ? 1 : 1.25) * (sec.chorus ? 1.35 : 1),
        );
    }
    // base épica: timbal grave en cada compás y trompas largas al empezar cada frase
    if (!th.boss && L.drums === 'full' && !sec.drums) {
      if (st === 0) timpani(t, bassReg(firstOfBar[0]) - 12, k % 4 === 0 ? 0.06 : 0.038);
      if (st === 0 && k % 4 === 0) [0, 2].forEach((i) => voice('horn', firstOfBar[i], t, sd * 14, 0.011));
      if (k % 4 === 3 && st >= 12 && st % 2 === 0) timpani(t, bassReg(chord[2]) - 12, 0.03 + 0.006 * (st - 12));
    }
    // entrada del coro: platillo, timbal y bombo a la vez
    if (sec.crash && k === 0 && st === 0) {
      noise(t, 1.9, 0.05, 3600);
      timpani(t, bassReg(firstOfBar[0]) - 12, 0.1);
      kick(t, 0.1);
    }

    // CORO ÉPICO Y PALMAS (estribillos): voces sosteniendo el acorde, un bajo coral, gritos a compás con el ritmo propio del tema
    // y palmas de grupo; en el coro final todo canta más fuerte. En el puente, un colchón de voces suaves («uuh»).
    const cho = th.choir;
    if (cho && sec.chorus && !building) {
      const big = sec.id === 'final' ? 1.25 : 1,
        cv = (th.boss ? 0.048 : 0.042) * big;
      if (st === 0) {
        firstOfBar.slice(0, 3).forEach((m, i) => choir(choirReg(m), t + i * 0.012, sd * 15, cv, cho.vowel));
        choir(bassReg(firstOfBar[0]) + 12, t, sd * 15, cv * 0.9, 'oh');
      }
      if (st === 8 && chord[0] !== firstOfBar[0])
        chord.slice(0, 3).forEach((m, i) => choir(choirReg(m), t + i * 0.012, sd * 7, cv, cho.vowel));
      if (cho.chant.includes(st)) {
        choir(choirReg(chord[2]) + 12, t, sd * 1.5, cv * 1.5, 'eh');
        choir(choirReg(chord[0]), t, sd * 1.5, cv * 1.3, 'eh');
      }
      if (cho.clap.includes(st)) clap(t, 0.03 * big);
      if (st % 4 === 2) noise(t, 0.06, 0.011, 6800); // pandereta en los contratiempos: el estribillo «salta»
    } else if (cho && sec.id === 'bridge' && st === 0) {
      firstOfBar.slice(0, 3).forEach((m, i) => choir(choirReg(m), t + i * 0.02, sd * 15, 0.028, 'oo'));
    } else if (cho && th.epic >= 3 && sec.id === 'verse2' && st === 0 && !th.boss) {
      [0, 2].forEach((i) => choir(choirReg(firstOfBar[i]), t, sd * 15, 0.024, 'oo')); // menú y héroes: el coro ya asoma en la 2.ª estrofa
    }

    // batería: normal, a medio tiempo (puente) o redoble que crece con ruido ascendente (pre-coro, corte, subida)
    if (building) {
      const every = rise > 0.75 ? 1 : rise > 0.4 ? 2 : 4;
      if (st % every === 0) snare(t, 0.012 + 0.035 * rise);
      if (st % 4 === 0) kick(t, 0.05 + 0.04 * rise);
      if (st % 4 === 0) noise(t, sd * 4, 0.006 + 0.02 * rise, 1200 + 5200 * rise, 'bandpass');
      if (rise > 0.5 && st % 4 === 0) timpani(t, bassReg(firstOfBar[0]) - 12, 0.03 + 0.05 * rise);
    } else if (sec.drums === 'half') {
      if (st === 0) kick(t, KV.k);
      if (st === 8) {
        snare(t, KV.s);
        noise(t + 0.011, 0.05, KV.s * 0.45, 1400, 'bandpass');
      }
      if (st % 4 === 0) noise(t, 0.05, KV.sh * 1.5, 5200);
      if (st === 0 && k % 4 === 0) timpani(t, bassReg(firstOfBar[0]) - 12, 0.06);
    } else drums(th, st, t, k, E, sec.drums || L.drums, L.tutti);

    if (th.boss && L.orchestra && hasLead) bossLayer(th, st, t, k, sd, chord, firstOfBar);

    // capa épica: timbal en las frases y metales que refuerzan la melodía
    if (E >= 2 && L.orchestra) {
      if (st === 0 && k % 4 === 0) timpani(t, chord[0] - 24, 0.055);
      if (k % 4 === 3 && st >= 12 && st % 2 === 0) timpani(t, chord[2] - 24, 0.03 + 0.004 * (st - 12));
    }

    // melodía. En el CORO de los temas de ciudad suena el motivo del primer compás, repetido en secuencia sobre cada acorde
    // (con el remate original cada 4 compases): la repetición es lo que se queda en la cabeza.
    if (!hasLead || building) return;
    let notes = th.tune[src],
      dshift = sh;
    if (sec.chorus && !th.ownChorus && k % 4 !== 3) {
      notes = th.tune[0];
      let d = (((rootDeg(th.prog[src]) - rootDeg(th.prog[0])) % n) + n) % n;
      if (d > n / 2) d -= n;
      dshift = d;
    }
    const lead = sec.alt ? ALT_VOICE[th.leadVoice] || 'horn' : th.leadVoice;
    const lv = th.leadV * (sec.chorus ? 1.12 : sec.id === 'bridge' ? 0.85 : sec.id === 'outro' ? 0.7 : 1);
    for (const [at, deg0, dur] of notes)
      if (at === st) {
        const deg = deg0 + dshift;
        const top = (m) => {
          while (m > 90) m -= 12;
          return m;
        }; // el solista nunca pasa de ≈ Fa♯6: sin chillidos al subir de tono
        voice(lead, top(noteOf(th, deg) + 12), t, dur * sd, lv);
        if ((L.counter || sec.harmony) && dur >= 3)
          voice(th.counterVoice || 'horn', noteOf(th, deg - 2), t + sd * 0.02, dur * sd, lv * 0.4); // armonía una tercera debajo
        if (sec.chorus && dur >= 2) voice('horn', top(noteOf(th, deg + 2) + 12), t, dur * sd, lv * 0.3); // coro: tercera arriba
        if (sec.chorus && th.choir && dur >= 2)
          choir(choirReg(noteOf(th, deg) + 12), t, dur * sd, lv * (dur >= 3 ? 1.3 : 0.95), th.choir.vowel); // las voces cantan el estribillo
        if (L.orchestra) voice(E >= 2 ? 'brass' : 'strings', noteOf(th, deg), t, dur * sd, lv * (E >= 2 ? 0.5 : 0.35));
        const up = noteOf(th, deg) + 24 > 98 ? 12 : 24; // la octava de arriba nunca llega a chillar (tope ≈ Re7)
        if (L.octave) voice('celesta', noteOf(th, deg) + up, t, dur * sd * 0.9, lv * 0.3);
        if (L.octave && E >= 3) voice('brass', noteOf(th, deg) + up, t, dur * sd * 0.9, lv * 0.22);
        if (L.tutti && th.echo && dur >= 2) voice('pizz', noteOf(th, deg) + 12, t + sd * 3, 0.1, lv * 0.3); // eco a una corchea con puntillo
      }
  }
  function loop() {
    if (!playing || !AC || document.hidden || audioPageHidden || AC.state !== 'running') return;
    tempoNow += (targetBpm() - tempoNow) * 0.07;
    const lookahead = 0.14;
    if (next < AC.currentTime) next = AC.currentTime + 0.05;
    while (next < AC.currentTime + lookahead) {
      if (survivalQueue && step >= SURVIVAL_TRACK_BARS * 16) nextSurvivalTrack();
      const sd = 60 / bpm() / 4,
        sw = step % 4 >= 2 ? (theme.swing || 0) * sd * 2 : 0; // swing: las corcheas de contratiempo llegan tarde
      if (survivalQueue) playSurvival(step, next);
      else play(step, next + sw);
      next += sd;
      step++;
    }
  }
  function armSequencer() {
    if (muted || document.hidden || audioPageHidden || !playing || AC.state !== 'running') return false;
    clearInterval(timer);
    next = AC.currentTime + 0.08;
    bus.gain.cancelScheduledValues(AC.currentTime);
    bus.gain.setValueAtTime(0, AC.currentTime);
    bus.gain.setTargetAtTime(vol(), AC.currentTime, 0.12);
    timer = setInterval(loop, 25);
    return true;
  }
  /** Cambia de tema entrando al inicio de un compás. */
  function useTheme(nt) {
    if (nt !== theme) step = (nt.boss ? 4 : 0) * 16; // canción nueva: desde su intro (el jefe entra directo a la estrofa)
    theme = nt;
    setSfxKey(nt);
    baseBpm = nt.bpm;
    if (!playing) tempoNow = baseBpm;
  }
  function nextSurvivalTrack() {
    if (!survivalQueue.length) survivalQueue = shuffleSurvivalTracks(theme);
    useTheme(survivalQueue.shift());
    step = 0;
    tempoNow = baseBpm;
  }
  return {
    start() {
      if (muted) return;
      init();
      if (playing) {
        if (!timer) armSequencer();
        bus.gain.setTargetAtTime(vol(), AC.currentTime, 0.3);
        return;
      }
      tempoNow = targetBpm();
      playing = true;
      if (!survivalQueue) step = 0;
      armSequencer();
    },
    stop(fade = 0.5) {
      clearAudioRecoveryHint();
      playing = false;
      clearInterval(timer);
      timer = 0;
      if (bus && audioOwner.state !== 'closed') bus.gain.setTargetAtTime(0, audioOwner.currentTime, fade / 3);
    },
    background() {
      clearInterval(timer);
      timer = 0;
    },
    recover() {
      if (!playing || muted || document.hidden || audioPageHidden) return false;
      init();
      return armSequencer();
    },
    /** Salta al principio de una sección de la forma ('verse', 'chorus', 'bridge', 'final'…); la usan melodies.html y las pruebas. */
    seek(id) {
      let b = 0;
      for (const sec of FORM) {
        if (sec.id === id) {
          step = b * 16;
          songBar = b;
          return true;
        }
        b += sec.bars;
      }
      return false;
    },
    /** Fija la capa (1-10) a mano; entra en el próximo compás (lo usa melodies.html). */
    setLayer(n) {
      layerNext = Math.max(1, Math.min(LAYERS_PER_CITY, n));
    },
    /** Tema de la ciudad del nivel `n` y la capa que le toca (1 = solo lo básico … 10 = todo). */
    setLevel(n, hero) {
      survivalQueue = null;
      const city = zoneIdx(n);
      useTheme(isBossLevel(n) ? bossThemeFor(city) : cityThemeFor(city, hero));
      layerNext = layerOfLevel(n);
      if (!playing) layerNow = layerNext;
    },
    /** Toca un tema concreto desde el principio (lo usa melodies.html). */
    playTheme(th, layer = LAYERS_PER_CITY) {
      survivalQueue = null;
      duckLv = 1;
      muffled = false;
      theme = th;
      setSfxKey(th);
      baseBpm = th.bpm;
      tempoNow = th.bpm;
      step = 0;
      layerNow = layerNext = layer;
      if (playing) {
        playing = false;
        clearInterval(timer);
        timer = 0;
      }
      this.start();
    },
    /** Música fuera de partida: 'menu' (menú principal) o 'heroes' (elección de héroe). Arranca si hace falta. */
    scene(name) {
      survivalQueue = null;
      useTheme(name === 'heroes' ? HEROES_THEME : menuTheme);
      layerNext = LAYERS_PER_CITY;
      if (!playing) layerNow = layerNext;
      tempoNow = baseBpm;
      duckLv = 1;
      muffled = false;
      if (flt) flt.frequency.setTargetAtTime(9000, AC.currentTime, 0.15);
      this.start();
    },
    survival() {
      survivalQueue = shuffleSurvivalTracks();
      nextSurvivalTrack();
      this.duck(1);
      this.muffle(false);
      this.start();
    },
    /** Cambia el tema que suena en el menú principal (recompensa de logros). `null` = el de serie. */
    setMenuTheme(th) {
      menuTheme = th || MENU_THEME;
    },
    duck(v) {
      duckLv = v;
      if (bus && playing) bus.gain.setTargetAtTime(vol(), AC.currentTime, 0.25);
    },
    muffle(on) {
      muffled = !!on;
      if (flt) flt.frequency.setTargetAtTime(on ? 900 : 9000, AC.currentTime, 0.15);
    },
    refresh() {
      if (muted) this.stop(0.2);
      else if (bus && playing) bus.gain.setTargetAtTime(vol(), AC.currentTime, 0.1);
    },
    bpm,
    targetBpm,
    get layer() {
      return layerNow;
    },
    get section() {
      return sectionAt(songBar).sec.id;
    },
    get themeName() {
      return theme.name;
    },
    get playing() {
      return playing;
    },
  };
})();
/**
 * Aviso de pocos turnos: solo VISUAL (la música no cambia).
 *  low  (≈ 20 % de los turnos o menos) → clase body.low-turns: el fondo de la ciudad se atenúa.
 *  last (último movimiento)            → clase body.last-turn: el fondo se atenúa más.
 */
export function setTensionFx(low, last) {
  document.body.classList.toggle('low-turns', !!low);
  document.body.classList.toggle('last-turn', !!last);
}
