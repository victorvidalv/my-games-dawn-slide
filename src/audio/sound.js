import { Music } from './music.js';
import { SCALES } from './themes.js';
import { S } from '../state.js';
import { $ } from '../dom.js';
/* ============================ Sonido y vibración ============================ */
/** Ganchos que la app conecta, para que el audio no dependa del resto del juego. */
export const hooks = { onSuspend: null };
export let AC = null,
  audioNeedsRecovery = false,
  audioRecoveryTimer = 0,
  audioPageHidden = false;
export function ctx() {
  if (!AC || AC.state === 'closed') {
    const previous = AC,
      owner = (AC = new (window.AudioContext || window.webkitAudioContext)());
    if (previous) audioNeedsRecovery = true;
    if (owner.state === 'running') queueMicrotask(() => completeAudioRecovery(owner));
    owner.addEventListener('statechange', () => handleAudioState(owner));
  }
  if (!document.hidden && !audioPageHidden && (AC.state === 'suspended' || AC.state === 'interrupted')) {
    audioNeedsRecovery = true;
    const owner = AC;
    try {
      Promise.resolve(owner.resume())
        .then(() => completeAudioRecovery(owner))
        .catch(() => queueAudioRecoveryHint());
    } catch (_) {}
  }
  return AC;
}
export let muted = localStorage.getItem('desbloquea.mute') === '1';
/* Los efectos suenan en la tonalidad del tema que toca la música (acordes de su tónica), así nunca desentonan con ella. */
let key = { root: 55, scale: SCALES.maj };
export const setSfxKey = (th) => {
  key = { root: th.root, scale: SCALES[th.sc] };
};
const TRIAD = [0, 2, 4]; // fundamental, tercera y quinta de la escala
/** Frecuencia de la nota `i` del arpegio de la tónica (0,1,2 = fundamental, 3ª, 5ª; 3,4,5 = la octava de arriba…) `oct` octavas por encima de la tónica. */
export function keyHz(i = 0, oct = 1) {
  const n = key.scale.length,
    deg = TRIAD[((i % 3) + 3) % 3] + n * Math.floor(i / 3);
  return 440 * Math.pow(2, (key.root + 12 * oct + key.scale[deg % n] + 12 * Math.floor(deg / n) - 69) / 12);
}
let noiseBuf = null,
  noiseOwner = null;
/* Bus de efectos: un compresor suave «pega» los sonidos y evita picos, y una reverberación corta les da espacio (sala pequeña). */
let master = null,
  masterOwner = null;
function dest() {
  if (master && masterOwner === AC) return master;
  masterOwner = AC;
  try {
    const input = AC.createGain(),
      comp = AC.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.16;
    input.connect(comp);
    comp.connect(AC.destination);
    const len = Math.floor(AC.sampleRate * 1.1),
      buf = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    const conv = AC.createConvolver(),
      wet = AC.createGain();
    conv.buffer = buf;
    wet.gain.value = 0.13;
    input.connect(conv);
    conv.connect(wet);
    wet.connect(AC.destination);
    master = input;
  } catch (_) {
    master = AC.destination;
  }
  return master;
}
function out(f, t, v, d, lp) {
  // cadena común: ataque corto (sin clics), caída exponencial y filtro paso bajo opcional
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  let n = g;
  if (f) {
    const q = AC.createBiquadFilter();
    q.type = lp ? 'lowpass' : 'bandpass';
    q.frequency.value = f;
    if (!lp) q.Q.value = 1.2;
    q.connect(g);
    n = q;
  }
  g.connect(dest());
  return n;
}
export function tone(f, d = 0.1, type = 'sine', v = 0.12, delay = 0, slide = 0, lp = 0) {
  if (muted || document.hidden || audioPageHidden) return;
  try {
    ctx();
    const t = AC.currentTime + delay,
      o = AC.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    o.connect(out(lp, t, v, d, true));
    o.start(t);
    o.stop(t + d + 0.02);
  } catch (e) {}
}
/** Ráfaga de ruido filtrado (madera, metal, soplo): `type` es el filtro ('lowpass' golpe sordo, 'bandpass' roce, 'highpass' brillo). */
export function noise(d = 0.05, v = 0.1, freq = 1200, type = 'lowpass', delay = 0, sweep = 0) {
  if (muted || document.hidden || audioPageHidden) return;
  try {
    ctx();
    if (noiseOwner !== AC) {
      noiseOwner = AC;
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const b = noiseBuf.getChannelData(0);
      for (let i = 0; i < b.length; i++) b[i] = Math.random() * 2 - 1;
    }
    const t = AC.currentTime + delay,
      s = AC.createBufferSource(),
      q = AC.createBiquadFilter(),
      g = AC.createGain();
    s.buffer = noiseBuf;
    q.type = type;
    q.frequency.setValueAtTime(freq, t);
    if (sweep) q.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(q);
    q.connect(g);
    g.connect(dest());
    s.start(t);
    s.stop(t + d + 0.02);
  } catch (e) {}
}
export const sfx = {
  /* Interfaz y transiciones */
  ui: () => {
    tone(keyHz(1, 2), 0.05, 'triangle', 0.028, 0, 0, 3200);
    noise(0.018, 0.018, 4200, 'highpass');
  },
  whoosh: (up = true) => noise(0.3, 0.06, up ? 420 : 2600, 'bandpass', 0, up ? 2800 : -2000),
  levelIn: () => {
    noise(0.26, 0.05, 500, 'bandpass', 0, 2600);
    [0, 2, 3].forEach((k, i) => tone(keyHz(k, 1), 0.22, 'triangle', 0.06, 0.05 + i * 0.06, 0, 2800));
    tone(keyHz(0, 0), 0.3, 'sine', 0.07, 0.05, 0, 600);
  },
  land: () => {
    noise(0.03, 0.04, 1700, 'bandpass', 0.1);
  },
  bossAlarm: () => {
    [0, 0.28].forEach((d) => {
      tone(58, 0.34, 'sawtooth', 0.11, d, -6, 620);
      tone(87, 0.3, 'sawtooth', 0.06, d, -6, 900);
      noise(0.12, 0.1, 260, 'lowpass', d);
    });
    noise(0.7, 0.07, 300, 'bandpass', 0.1, 3400);
    tone(41, 1, 'triangle', 0.12, 0.5, -8);
  },
  routePick: () => {
    [0, 1, 2, 3, 4].forEach((k, i) => tone(keyHz(k, 1), 0.34, 'sine', 0.07, i * 0.055, 0, 3600));
    tone(keyHz(0, 0), 0.6, 'triangle', 0.08, 0, 0, 700);
    noise(0.25, 0.04, 3000, 'highpass', 0.2, 2500);
  },
  /**
   * Firma sonora de cada héroe (suena al despertar su poder, siempre en la tonalidad del tema):
   *   Jean  – el péndulo: tic-tac de reloj que se acelera y una campana de torre que cae (el tiempo retrocede).
   *   Juth  – las runas: arpa de cristal que sube en cascada con un coro agudo y chispas.
   *   Lía   – la brasa: dos latidos graves, un soplo de fuego que se aviva y un acorde cálido.
   */
  heroSig: (hero) => {
    if (hero === 'jean') {
      [0, 0.2, 0.36, 0.48, 0.57, 0.64, 0.7].forEach((d, i) => {
        noise(0.018, 0.07, i % 2 ? 2600 : 3600, 'bandpass', d);
        tone(i % 2 ? 1400 : 1900, 0.03, 'square', 0.03, d, 0, 5000);
      });
      [3, 2, 1, 0].forEach((k, i) => {
        tone(keyHz(k, 1), 1.1, 'sine', 0.07, 0.1 + i * 0.16, 0, 3000);
        tone(keyHz(k, 1) * 2.76, 0.7, 'sine', 0.02, 0.1 + i * 0.16, 0, 6000);
      });
      tone(keyHz(0, -1), 1.2, 'triangle', 0.09, 0.1, -12, 500);
    } else if (hero === 'van') {
      [0, 1, 2, 3, 4, 5, 6, 7].forEach((k, i) => {
        tone(keyHz(k, 1), 0.6, 'triangle', 0.05, i * 0.055, 0, 5200);
        tone(keyHz(k, 2), 0.4, 'sine', 0.03, i * 0.055 + 0.03, 0, 7000);
      });
      [0, 2].forEach((k) => {
        tone(keyHz(k, 2), 1.1, 'sine', 0.035, 0.3, 6, 4200);
        tone(keyHz(k, 2) * 1.005, 1.1, 'sine', 0.03, 0.3, -6, 4200);
      });
      noise(0.6, 0.03, 6500, 'highpass', 0.2, 2500);
    } else {
      [0, 0.26].forEach((d) => {
        tone(62, 0.22, 'sine', 0.2, d, -18, 300);
        noise(0.06, 0.07, 180, 'lowpass', d);
      });
      noise(0.9, 0.07, 300, 'bandpass', 0.3, 2400);
      [0, 1, 2].forEach((k, i) => {
        tone(keyHz(k, 0), 1, 'sawtooth', 0.035, 0.35 + i * 0.07, 0, 1400);
        tone(keyHz(k, 1), 0.9, 'sine', 0.05, 0.4 + i * 0.07, 0, 2600);
      });
    }
  },
  // Poder de héroe: carga (zumbido que sube, chisporroteo) y descarga (trueno seco, golpe grave y acorde de metales)
  powerCharge: (up) => {
    noise(1, 0.05, up ? 300 : 2600, 'bandpass', 0, up ? 3600 : -2200);
    tone(keyHz(0, -1), 1, 'sawtooth', 0.06, 0, up ? 70 : -30, 500);
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => noise(0.04, 0.035, 5200 + i * 300, 'highpass', 0.1 + i * 0.11));
  },
  /**
   * Descarga de cada poder (suena cuando el círculo mágico actúa sobre el tablero):
   *   Rebobinar (Jean)      – el tiempo se retuerce: cinta que rebobina (dos barridos que caen), tonos que resbalan hacia abajo,
   *                           un golpe grave y la campana del reloj al cerrar.
   *   Trazar destino (Juth) – purificación: ola de aire que sube, acorde de coro luminoso, cascada de cristales y un brillo final.
   */
  powerUnleash: (up) => {
    if (!up) {
      noise(0.55, 0.12, 4200, 'bandpass', 0, -3800);
      noise(0.45, 0.08, 2600, 'bandpass', 0.12, -2300);
      [5, 4, 3, 2, 1, 0].forEach((k, i) =>
        tone(keyHz(k, 1), 0.26, 'sawtooth', 0.04, i * 0.05, -keyHz(k, 1) * 0.35, 2200),
      );
      tone(70, 0.9, 'sine', 0.2, 0.05, -30);
      noise(0.3, 0.14, 160, 'lowpass', 0.05);
      tone(keyHz(0, 1), 1.4, 'sine', 0.09, 0.42, 0, 3200);
      tone(keyHz(0, 1) * 2.76, 0.9, 'sine', 0.025, 0.42, 0, 6000);
      tone(keyHz(2, 1), 1.2, 'sine', 0.05, 0.48, 0, 3200);
    } else {
      noise(0.8, 0.09, 500, 'bandpass', 0, 5200);
      noise(0.5, 0.05, 5000, 'highpass', 0.15, 3000);
      [0, 1, 2, 3].forEach((k) => {
        tone(keyHz(k, 1), 1.5, 'sine', 0.05, 0.06, 4, 3600);
        tone(keyHz(k, 1) * 1.004, 1.5, 'triangle', 0.03, 0.06, -4, 3000);
      });
      [3, 4, 5, 6, 7, 8].forEach((k, i) => tone(keyHz(k, 2), 0.45, 'sine', 0.04, 0.1 + i * 0.05, 0, 8000));
      tone(keyHz(0, 0), 1.2, 'triangle', 0.1, 0, 0, 700);
      tone(keyHz(6, 2), 0.9, 'sine', 0.03, 0.5, 0, 9000);
    }
  },
  // Pieza deslizante: golpecito de madera (ruido sordo + cuerpo grave) y una nota de la tónica del tema que sube un poco cada vez
  move: () => {
    noise(0.05, 0.12, 700, 'lowpass');
    tone(keyHz(Math.floor(Math.random() * 3), 0), 0.12, 'sine', 0.09, 0, -30, 900);
    tone(keyHz(2, 1), 0.1, 'triangle', 0.03, 0.02, 0, 2400);
  },
  /** Marca de casilla al arrastrar: pizzicato suave en la escala del tema (cada casilla una nota distinta). */
  tick: (c = 0) => {
    tone(keyHz(c, 1), 0.07, 'triangle', 0.045, 0, 0, 2600);
  },
  // Poder de Jean (rebobinar): barrido de ruido hacia abajo y arpegio que desciende; poder de Juth (destino): hacia arriba, con brillo de runas
  power: (up) => {
    noise(0.9, 0.05, up ? 500 : 3200, 'bandpass', 0, up ? 3200 : -2600);
    [0, 1, 2, 3, 4, 5].forEach((k, i) => {
      const j = up ? i : 5 - i;
      tone(keyHz(j, 1), 0.5, 'sine', 0.06, i * 0.07, 0, 3200);
      tone(keyHz(j, 2), 0.35, 'triangle', 0.025, i * 0.07 + 0.03, 0, 4200);
    });
    tone(keyHz(0, 0), 0.9, 'triangle', 0.09, 0, up ? 30 : -20, 500);
  },
  /** Cada paso del poder: nota del arpegio de la tónica (sube con Destino, baja con Rebobinar) y un tintineo. */
  powerStep: (n, up) => {
    const j = up ? n : Math.max(0, 6 - n);
    tone(keyHz(j, 1), 0.3, 'sine', 0.07, 0, 0, 3600);
    tone(keyHz(j + 3, 1), 0.18, 'triangle', 0.03, 0.03, 0, 4200);
    noise(0.07, 0.03, 5200, 'highpass');
  },
  /* Jefe: el golpe de la presentación y el salto al tablero */
  thunder: () => {
    noise(0.9, 0.16, 180, 'lowpass', 0);
    tone(48, 1, 'sawtooth', 0.1, 0.02, -18);
    tone(36, 1.3, 'triangle', 0.12, 0.08, -10);
    noise(0.4, 0.08, 900, 'bandpass', 0.3);
  },
  powerEnd: (up) => {
    [0, 1, 2, 3].forEach((k, i) => tone(keyHz(up ? i : 3 - i, 2), 0.5, 'sine', 0.045, i * 0.06, 0, 4200));
    tone(keyHz(0, 1), 0.8, 'triangle', 0.05, 0, 0, 1500);
  },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'sine', 0.13, i * 0.08)),
  // Nivel superado (no perfecto): arpegio suave y agradable.
  success: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'sine', 0.07, i * 0.1));
    tone(262, 0.6, 'triangle', 0.04, 0);
    tone(1568, 0.3, 'sine', 0.03, 0.42);
  },
  perfect: () => {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.35, 'sine', 0.12, i * 0.07));
    [1760, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, 0.5 + i * 0.09));
    tone(196, 0.5, 'sine', 0.05, 0, 30);
  },
  fail: () => {
    tone(260, 0.7, 'triangle', 0.07, 0, -140);
    tone(130, 0.8, 'sine', 0.05, 0.1, -50);
  },
  hint: () => {
    tone(880, 0.2, 'sine', 0.1);
    tone(1320, 0.3, 'sine', 0.08, 0.08);
  },
  gateMove: () => {
    noise(0.03, 0.07, 3600, 'bandpass');
    tone(keyHz(2, 2), 0.07, 'square', 0.03, 0, 0, 2600);
    tone(keyHz(0, 1), 0.12, 'triangle', 0.06, 0.05, 0, 1600);
    noise(0.1, 0.04, 1800, 'bandpass', 0.02, -900);
  }, // metal: clic de cerradura y deslizar
  heavyMove: () => {
    noise(0.12, 0.16, 380, 'lowpass');
    tone(keyHz(0, -1), 0.26, 'sine', 0.16, 0, -18, 400);
    tone(keyHz(0, 0), 0.14, 'triangle', 0.05, 0.02, 0, 700);
  }, // golpe sordo y grave
  iceMove: () => {
    noise(0.18, 0.045, 2600, 'highpass', 0, 2600);
    [2, 3, 4, 5].forEach((k, i) => tone(keyHz(k, 2), 0.16, 'sine', 0.04, i * 0.045, 0, 5200));
  }, // desliz cristalino sobre hielo
  unlock: () => {
    [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 0.05));
    tone(1976, 0.3, 'sine', 0.06, 0.2);
  },
  locked: () => {
    tone(150, 0.18, 'square', 0.06);
    tone(120, 0.22, 'square', 0.05, 0.1);
  },
  bump: () => {
    noise(0.04, 0.07, 420, 'lowpass');
    tone(130, 0.08, 'sine', 0.07, 0, -20);
  },
  bossEntrance: (city = 0) => {
    const motifs = [
      [2, 0],
      [0, 2, 0],
      [0, 1, 2],
      [2, 1, 0],
      [0, 0, 2],
      [2, 3, 0],
      [2, 0, 2],
      [0, 2, 3],
      [1, 2, 0],
      [2, 1, 3],
    ];
    const wind = [510, 650, 720, 570, 430, 910, 670, 380, 830, 540];
    noise(0.7, 0.045, wind[city], 'bandpass', 0, 400);
    tone(keyHz(0, 0), 0.8, 'sine', 0.065, 0.07, 0, 380);
    motifs[city].forEach((note, i) => {
      tone(keyHz(note, 2), 0.49, 'sine', 0.052, 0.21 + i * 0.16, 0, 2000);
      tone(keyHz(note, 3), 0.22, 'sine', 0.017, 0.21 + i * 0.16, 0, 3100);
    });
  },
  bossStart: () => {
    noise(0.35, 0.055, 780, 'bandpass', 0, -420);
    tone(keyHz(0, 1), 0.32, 'triangle', 0.058, 0.1, 0, 950);
    tone(keyHz(0, 0), 0.38, 'sine', 0.08, 0.12, 0, 450);
  },
  plate: () => {
    tone(330, 0.1, 'triangle', 0.08);
    tone(494, 0.14, 'triangle', 0.07, 0.07);
  },
  start: () => {
    tone(330, 0.12, 'triangle', 0.08);
    tone(494, 0.18, 'triangle', 0.08, 0.08);
  },
  revive: () => {
    tone(130.8, 0.85, 'triangle', 0.15, 0, 130.8);
    tone(196, 0.75, 'triangle', 0.1, 0.06);
    [261.6, 329.6, 392, 523.2, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.45, 'sine', 0.11, i * 0.065));
    [1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.55, 'triangle', 0.06, 0.38 + i * 0.06));
  },
  warn: () => tone(220, 0.16, 'sine', 0.04),
  // Don Dublón: su «voz» es un balbuceo de notas graves (más larga la frase, más dura) y tintineos de caja
  merchantCoin: () => {
    [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, 0.16, 'sine', 0.06, i * 0.05));
    tone(880, 0.3, 'triangle', 0.04, 0.05);
  },
  merchantNope: () => {
    tone(196, 0.3, 'sawtooth', 0.055, 0, -70);
    tone(147, 0.4, 'sawtooth', 0.05, 0.2, -50);
  },
  merchantBell: () => {
    [1319, 1760, 2093].forEach((f, i) => tone(f, 0.5, 'sine', 0.05, i * 0.08));
    tone(660, 0.6, 'triangle', 0.03, 0.02);
  },
  // ruleta del destino: arranque con soplo ascendente, «tac» de madera y oro por sector y campanada de cierre
  fateSpin: () => {
    tone(150, 1.1, 'sawtooth', 0.025, 0, 420);
    tone(300, 1.1, 'triangle', 0.035, 0.05, 800);
    [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'sine', 0.05, 0.1 + i * 0.07));
  },
  fateTick: (k = 0) => {
    const n = k % 6;
    tone(1600 + n * 70, 0.03, 'square', 0.03);
    tone(520 + n * 34, 0.07, 'triangle', 0.075);
    tone(2400, 0.02, 'sine', 0.03, 0.005);
  },
  fateLand: () => {
    tone(110, 1.6, 'sine', 0.11, 0, -30);
    [523, 784, 1047, 1568].forEach((f, i) => tone(f, 1, 'sine', 0.075, 0.04 + i * 0.085));
    tone(2093, 0.7, 'sine', 0.035, 0.32);
    tone(2637, 0.5, 'triangle', 0.02, 0.4);
  },
  fanfare: () => {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.45, 'sine', 0.12, i * 0.11));
    [523, 659, 784, 1047].forEach((f) => tone(f, 1.6, 'triangle', 0.07, 0.85));
  },
  journey: () => {
    [392, 494, 587, 784].forEach((f, i) => tone(f, 0.5, 'sine', 0.08, i * 0.35));
    tone(98, 1.6, 'triangle', 0.06, 0, 40);
    [1175, 1568].forEach((f, i) => tone(f, 0.4, 'sine', 0.05, 2 + i * 0.12));
  },
};

/* Aplausos sintetizados: cientos de palmadas de ruido filtrado con una envolvente que sube y baja */
export const vib = (p) => {
  try {
    navigator.vibrate && navigator.vibrate(p);
  } catch (e) {}
};
export function soundLabel() {
  const button = $('pSound');
  if (!button) return;
  const label = muted ? 'Activar sonido' : 'Desactivar sonido';
  const extra = muted ? '<path d="m21 11 5 6m0-6-5 6"/>' : '<path d="M21 10q6 4 0 8m3-11q9 7 0 14"/>';
  button.innerHTML = `<span>${label}</span><svg class="pause-icon" viewBox="0 0 30 28" aria-hidden="true"><path d="M4 11h5l7-6v18l-7-6H4Z"/>${extra}</svg>`;
  button.setAttribute('aria-pressed', String(!muted));
  button.setAttribute('aria-label', label);
}
export function toggleSound() {
  muted = !muted;
  localStorage.setItem('desbloquea.mute', muted ? '1' : '0');
  soundLabel();
  if (muted) Music.stop(0.2);
  else {
    unlockAudio();
    if (S.run?.survival?.status === 'active' || (S.G && !S.G.done)) {
      Music.start();
      Music.muffle($('menu').classList.contains('show') || $('pause').classList.contains('show'));
    } else Music.scene($('heroSelect')?.classList.contains('show') ? 'heroes' : 'menu'); // sin partida: vuelve la música del menú
  }
  document.dispatchEvent(new Event('soundstate'));
}
/** ¿El audio del navegador está realmente sonando? (puede estar suspendido hasta un toque, o interrumpido en iOS) */
export const audioRunning = () => !!AC && AC.state === 'running';
/**
 * Desbloquea el audio dentro de un gesto del usuario: crea/reanuda el contexto y reproduce un búfer mudo (truco de iOS/Safari),
 * y vuelve a arrancar la música si estaba parada. Devuelve una promesa que se cumple cuando el audio ya suena.
 */
export function unlockAudio() {
  if (muted) return Promise.resolve(false);
  try {
    const c = ctx(),
      b = c.createBuffer(1, 1, 22050),
      src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
    return Promise.resolve(c.state === 'running' ? true : c.resume())
      .then(() => {
        audioNeedsRecovery = true;
        completeAudioRecovery(c);
        document.dispatchEvent(new Event('soundstate'));
        return c.state === 'running';
      })
      .catch(() => false);
  } catch (_) {
    return Promise.resolve(false);
  }
}
soundLabel();

/* Safari may return from background as "interrupted", not just "suspended".
   Retry resume directly inside every trusted gesture; never await before it. */
export function clearAudioRecoveryHint() {
  clearTimeout(audioRecoveryTimer);
  audioRecoveryTimer = 0;
  const hint = $('audioRecover');
  if (hint) hint.hidden = true;
}
function queueAudioRecoveryHint() {
  // Ya no se muestra un aviso aparte: el botón de sonido (un solo icono) indica y arregla el estado del audio
}
function completeAudioRecovery(owner = AC) {
  if (owner !== AC || !owner || owner.state !== 'running' || document.hidden || audioPageHidden || muted) return;
  const needed = audioNeedsRecovery;
  audioNeedsRecovery = false;
  clearAudioRecoveryHint();
  if (needed && Music.playing) Music.recover();
}
function handleAudioState(owner) {
  if (owner !== AC) return;
  document.dispatchEvent(new Event('soundstate'));
  if (owner.state === 'running') {
    completeAudioRecovery(owner);
    return;
  }
  audioNeedsRecovery = true;
  Music.background();
  if (!document.hidden && !audioPageHidden && !muted && owner.state !== 'closed') recoverPageAudio();
}
function recoverPageAudio(fromGesture = false) {
  if (fromGesture && !document.hidden) audioPageHidden = false;
  if (document.hidden || audioPageHidden || muted) {
    clearAudioRecoveryHint();
    return;
  }
  if (!AC) {
    if (!fromGesture) return;
    try {
      ctx();
    } catch (_) {
      return;
    }
  }
  if (AC.state === 'running' && !audioNeedsRecovery) return;
  audioNeedsRecovery = true;
  try {
    if (AC.state === 'closed') ctx();
    const owner = AC;
    if (owner.state === 'running') {
      completeAudioRecovery(owner);
      return;
    }
    // Must be called synchronously from touch/pointer/key handlers on iOS.
    Promise.resolve(owner.resume())
      .then(() => completeAudioRecovery(owner))
      .catch(() => queueAudioRecoveryHint());
  } catch (_) {
    queueAudioRecoveryHint();
  }
  queueAudioRecoveryHint();
}
function suspendPageAudio() {
  audioPageHidden = true;
  hooks.onSuspend?.(); // la app guarda la partida (se asigna en main.js)
  clearAudioRecoveryHint();
  Music.background();
  if (!AC) return;
  audioNeedsRecovery = true;
  if (AC.state === 'running') {
    try {
      Promise.resolve(AC.suspend()).catch(() => {});
    } catch (_) {}
  }
}
addEventListener('pagehide', suspendPageAudio);
addEventListener('pageshow', () => {
  audioPageHidden = false;
  recoverPageAudio();
});
addEventListener('focus', () => {
  if (!document.hidden) audioPageHidden = false;
  recoverPageAudio();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspendPageAudio();
  else {
    audioPageHidden = false;
    recoverPageAudio();
  }
});
for (const event of ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'])
  addEventListener(
    event,
    () => {
      recoverPageAudio(true);
      if (!muted && AC && AC.state !== 'running') unlockAudio();
    },
    { capture: true, passive: true },
  );
$('audioRecover').onclick = () => recoverPageAudio(true);
