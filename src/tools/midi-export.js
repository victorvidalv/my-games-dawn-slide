/**
 * Exportador MIDI (Standard MIDI File Format 1) para temas de DAWNSLIDE.
 * Genera tanto los eventos estructurados (para el reproductor MIDI en HTML) como el binario .mid.
 */
import { SCALES, chordMidi, entryAt } from '../audio/themes.js';

const GM_PROGRAM = {
  piano: 0,
  celesta: 8,
  vibes: 11,
  accordion: 21,
  guitar: 25,
  pizz: 45,
  strings: 48,
  choir: 52,
  horn: 60,
  brass: 61,
  clarinet: 71,
  flute: 73,
  whistle: 78,
  koto: 107,
  fiddle: 40,
  synth: 81,
  glass: 9,
  bell: 14,
  bass: 32,
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

const RIFFS = {
  pop: [
    [0, 'r'],
    [3, 'r'],
    [6, '5'],
    [8, 'r'],
    [11, 'r'],
    [14, '3'],
  ],
  bossa: [
    [0, 'r'],
    [6, '5'],
    [8, 'r'],
    [14, '5'],
  ],
  oompah: [
    [0, 'r'],
    [8, '5'],
  ],
};
const IV = { r: 0, 3: 1, 5: 2, 7: 3 };

const COMP = {
  charleston: [0, 6],
  offbeat: [4, 12],
  oompah: [4, 12],
  strum: [0, 6, 10],
  chop16: [0, 3, 6, 8, 11, 14],
  bossa: [0, 3, 6, 10, 12],
  skank: [2, 6, 10, 14],
  montuno: [3, 6, 10, 12, 14],
  pump: [0, 2, 4, 6, 8, 10, 12, 14],
};

const bassReg = (m) => {
  while (m > 52) m -= 12;
  while (m < 40) m += 12;
  return m;
};

const noteOf = (th, deg) => {
  const s = SCALES[th.sc];
  const n = s.length;
  return th.root + s[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
};

/**
 * Convierte un tema compilado en pistas MIDI (480 PPQ, 120 ticks = 1 semicorchea).
 * Estructura de 32 compases: A (8) + B (8) + B Coro (8) + A' Final (8).
 */
export function themeToMidiData(th, { bars = 32 } = {}) {
  const PPQ = 480;
  const STEP_TICKS = PPQ / 4; // 120 ticks por paso 1/16
  const swingTicks = Math.round((th.swing || 0) * STEP_TICKS);

  const stepTick = (absStep) => {
    const st = absStep % 16;
    const base = absStep * STEP_TICKS;
    return base + (st % 2 === 1 ? swingTicks : 0);
  };

  const tracks = {
    lead: { name: 'Melodía', channel: 0, program: GM_PROGRAM[th.leadVoice] ?? 25, notes: [] },
    comp: { name: 'Acordes', channel: 1, program: GM_PROGRAM[th.compVoice] ?? 0, notes: [] },
    hook: { name: 'Gancho / Arpegio', channel: 2, program: GM_PROGRAM[th.hook?.voice || 'pizz'] ?? 45, notes: [] },
    bass: { name: 'Bajo', channel: 3, program: GM_PROGRAM.bass, notes: [] },
    harmony: { name: 'Coro / Cuerdas', channel: 4, program: GM_PROGRAM.strings, notes: [] },
    drums: { name: 'Batería', channel: 9, program: 0, notes: [] },
  };

  const pushNote = (track, tick, durTicks, pitch, vel) => {
    const p = Math.max(24, Math.min(108, Math.round(pitch)));
    const v = Math.max(1, Math.min(127, Math.round(vel)));
    track.notes.push({ tick: Math.max(0, Math.round(tick)), dur: Math.max(20, Math.round(durTicks)), pitch: p, vel: v });
  };

  const scaleLen = SCALES[th.sc].length;
  const rootDeg = (e) => (typeof e === 'string' ? Number(e.split(':')[0]) : Array.isArray(e) ? rootDeg(e[0]) : e);

  for (let bar = 0; bar < bars; bar++) {
    const section = Math.floor(bar / 8); // 0: A, 1: B, 2: Coro B, 3: A'
    const src = section === 1 || section === 2 ? 8 + (bar % 8) : bar % 8;
    const isChorus = section === 2 || section === 1;
    const isBig = section >= 2;
    const barStep0 = bar * 16;

    const firstChord = chordMidi(th, entryAt(th, src, 0));
    // Cuerdas / Coro
    firstChord.slice(0, 3).forEach((m) => {
      pushNote(tracks.harmony, stepTick(barStep0), STEP_TICKS * 15, m + 12, isBig ? 62 : 46);
    });

    // Melodía principal (en el coro repite el motivo del compás 0 sobre el acorde, excepto cada 4.º compás)
    let notes = th.tune[src];
    let dshift = 0;
    if (section === 2 && bar % 4 !== 3) {
      notes = th.tune[0];
      let d = (((rootDeg(th.prog[src]) - rootDeg(th.prog[0])) % scaleLen) + scaleLen) % scaleLen;
      if (d > scaleLen / 2) d -= scaleLen;
      dshift = d;
    }

    for (const [at, deg0, dur] of notes) {
      const deg = deg0 + dshift;
      let pitch = noteOf(th, deg) + 12;
      while (pitch > 90) pitch -= 12;
      const t0 = stepTick(barStep0 + at);
      const t1 = stepTick(barStep0 + at + dur);
      pushNote(tracks.lead, t0, t1 - t0, pitch, isChorus ? 104 : 94);

      if (dur >= 3) {
        pushNote(tracks.harmony, t0, t1 - t0, noteOf(th, deg - 2), 64);
      }
      if (isBig && dur >= 2) {
        pushNote(tracks.lead, t0, Math.max(60, (t1 - t0) * 0.9), pitch + 12 <= 98 ? pitch + 12 : pitch, 58);
      }
    }

    // Pasos de acompañamiento, bajo, hook y batería
    for (let st = 0; st < 16; st++) {
      const abs = barStep0 + st;
      const t0 = stepTick(abs);
      const chord = chordMidi(th, entryAt(th, src, st));

      // Bajo
      const riff = RIFFS[th.bassPat] || RIFFS.pop;
      const hit = riff.find((r) => r[0] === st);
      if (hit) {
        const bn = hit[1] === '8' ? chord[0] + 12 : chord[IV[hit[1]]];
        pushNote(tracks.bass, t0, STEP_TICKS * 2.2, bassReg(bn), 86);
      }

      // Comping
      const compSteps = COMP[th.comp] || COMP.chop16;
      if (compSteps.includes(st)) {
        chord.slice(1, 4).forEach((m, idx) => {
          pushNote(tracks.comp, t0 + idx * 8, STEP_TICKS * 1.3, m + 12, 66);
        });
      }

      // Hook
      if (th.hook) {
        const j = th.hook.s.indexOf(st);
        if (j >= 0) {
          const hm = chord[th.hook.n[j % th.hook.n.length] % chord.length] + (th.hook.oct ?? 12);
          pushNote(tracks.hook, t0, STEP_TICKS * 1.4, hm, st % 8 === 0 ? 78 : 64);
        }
      }

      // Batería (GM channel 9)
      const g = GROOVES[th.groove] || GROOVES.pop;
      if (g.k?.includes(st)) pushNote(tracks.drums, t0, 90, 36, 98);
      if (g.s?.includes(st)) pushNote(tracks.drums, t0, 90, 38, 88);
      if (g.rim?.includes(st)) pushNote(tracks.drums, t0, 60, 37, 72);
      if (g.h?.includes(st)) pushNote(tracks.drums, t0, 60, 42, st % 4 === 2 ? 64 : 48);
      if (g.oh?.includes(st)) pushNote(tracks.drums, t0, 120, 46, 62);
      if (g.sh?.includes(st)) pushNote(tracks.drums, t0, 60, 69, 46);
      if (g.tm?.includes(st)) pushNote(tracks.drums, t0, 80, 54, 62);
      if (g.rd?.includes(st)) pushNote(tracks.drums, t0, 100, 51, 56);
      if (g.cg?.includes(st)) pushNote(tracks.drums, t0, 80, st % 4 === 2 ? 64 : 63, 66);
      if (isChorus && th.choir?.clap?.includes(st)) pushNote(tracks.drums, t0, 80, 39, 76);
      if (st === 0 && bar % 8 === 0 && bar > 0) pushNote(tracks.drums, t0, 240, 49, 80);
    }
  }

  return {
    bpm: th.bpm,
    ppq: PPQ,
    bars,
    stepTicks: STEP_TICKS,
    swingTicks,
    tracks: Object.entries(tracks).map(([id, tr]) => ({ id, ...tr })),
  };
}

function writeVarLen(val) {
  const bytes = [val & 0x7f];
  let v = val >>> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  return bytes;
}

function strBytes(s) {
  return Array.from(s, (ch) => ch.charCodeAt(0) & 0x7f);
}

function makeTrackChunk(events) {
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const body = [];
  let prev = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - prev);
    prev = ev.tick;
    body.push(...writeVarLen(delta), ...ev.data);
  }
  // End of track
  body.push(0x00, 0xff, 0x2f, 0x00);
  const len = body.length;
  return [
    0x4d,
    0x54,
    0x72,
    0x6b, // "MTrk"
    (len >>> 24) & 0xff,
    (len >>> 16) & 0xff,
    (len >>> 8) & 0xff,
    len & 0xff,
    ...body,
  ];
}

/** Genera un archivo Standard MIDI File (SMF Format 1) listo para guardar como .mid */
export function themeToMidiBytes(th, opts = {}) {
  const midi = themeToMidiData(th, opts);
  const tempoUs = Math.round(60_000_000 / midi.bpm);

  // Track 0: Tempo & Time Signature
  const metaName = strBytes(th.name || 'Lia Theme');
  const metaEvents = [
    { tick: 0, order: 0, data: [0xff, 0x03, metaName.length, ...metaName] },
    { tick: 0, order: 1, data: [0xff, 0x51, 0x03, (tempoUs >>> 16) & 0xff, (tempoUs >>> 8) & 0xff, tempoUs & 0xff] },
    { tick: 0, order: 2, data: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] },
  ];
  const chunks = [makeTrackChunk(metaEvents)];

  for (const tr of midi.tracks) {
    const ch = tr.channel & 0x0f;
    const tname = strBytes(tr.name);
    const evs = [{ tick: 0, order: 0, data: [0xff, 0x03, tname.length, ...tname] }];
    if (ch !== 9) {
      evs.push({ tick: 0, order: 1, data: [0xc0 | ch, tr.program & 0x7f] });
    }
    for (const n of tr.notes) {
      evs.push({ tick: n.tick, order: 3, data: [0x90 | ch, n.pitch & 0x7f, n.vel & 0x7f] });
      evs.push({ tick: n.tick + n.dur, order: 2, data: [0x80 | ch, n.pitch & 0x7f, 0x00] });
    }
    chunks.push(makeTrackChunk(evs));
  }

  const nTracks = chunks.length;
  const header = [
    0x4d,
    0x54,
    0x68,
    0x64, // "MThd"
    0x00,
    0x00,
    0x00,
    0x06,
    0x00,
    0x01, // Format 1
    (nTracks >>> 8) & 0xff,
    nTracks & 0xff,
    (midi.ppq >>> 8) & 0xff,
    midi.ppq & 0xff,
  ];
  return new Uint8Array([...header, ...chunks.flat()]);
}
