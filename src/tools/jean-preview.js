/**
 * Visor y reproductor de pruebas para las canciones de Jean (output/jean-canciones.html).
 * Permite comparar Original vs. Mejorada vs. Versión Más Alegre, reproducirlas con el motor del juego
 * o con el reproductor MIDI multipista integrado, y descargar los archivos .mid.
 */
import { Music } from '../audio/music.js';
import { CITY_REPERTOIRES, LAYERS_PER_CITY, SCALES, chordMidi, entryAt, parseBar, shiftBar, shiftEntry } from '../audio/themes.js';
import { JEAN_IMPROVED_DATA, JEAN_HAPPY_DATA } from '../audio/themes-jean-preview.js';
import { ZONES } from '../data/zones.js';
import { themeToMidiBytes, themeToMidiData } from './midi-export.js';

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const noteName = (m) => NAMES[m % 12];
const SCALE_NAMES = { maj: 'mayor', min: 'menor', dor: 'dórica', mix: 'mixolidia', lyd: 'lidia', phd: 'frigia dom.' };
const GROOVE_NAMES = { pop: 'pop-folk', polka: 'polka', latin: 'clave', shuffle: 'shuffle', disco: 'disco-funk', soft: 'suave', bossa: 'bossa', march: 'marcha', chill: 'chill', bigband: 'big band' };
const INSTR = { flute: 'flauta', accordion: 'acordeón', clarinet: 'clarinete', celesta: 'celesta', koto: 'koto', brass: 'metales', vibes: 'vibráfono', guitar: 'guitarra', piano: 'piano', pizz: 'pizzicato', whistle: 'silbato', fiddle: 'violín', horn: 'trompa', synth: 'sintetizador' };

function compileSong(base, song) {
  const raw = { ...base, ...song };
  let d = raw;
  if (raw.B) {
    const n = SCALES[raw.sc].length;
    const { k, end, endProg } = raw.B;
    d = {
      ...raw,
      tuneText: [...raw.tuneText, ...raw.tuneText.slice(0, 6).map((b) => shiftBar(b, k)), ...end],
      prog: [...raw.prog, ...raw.prog.slice(0, 6).map((e) => shiftEntry(e, k, n)), ...endProg],
    };
  }
  return {
    padW: 'sine',
    padV: 0.016,
    bassV: 0.07,
    compV: 0.02,
    arpV: 0.02,
    leadV: 0.042,
    epic: 1,
    groove: 'pop',
    echo: true,
    ...d,
    tune: d.tuneText.map((b) => parseBar(b).notes),
  };
}

const ORIGINALS = CITY_REPERTOIRES.jean;
const IMPROVED = JEAN_IMPROVED_DATA.map((s, i) => compileSong(ORIGINALS[i], s));
const HAPPY = JEAN_HAPPY_DATA.map((s, i) => compileSong(ORIGINALS[i], s));

const VERSIONS = [
  { key: 'orig', label: 'Original (actual)', list: ORIGINALS },
  { key: 'impr', label: 'Mejorada (estilo Corazón al sol)', list: IMPROVED },
  { key: 'happy', label: 'Más alegre (MIDI)', list: HAPPY },
];

function chordName(th, entry) {
  const c = chordMidi(th, entry);
  const iv = c.slice(1, 4).map((m) => (m - c[0]) % 12).join(',');
  const q = { '4,7,11': 'maj7', '3,7,10': 'm7', '4,7,10': '7', '3,6,10': 'm7♭5', '3,6,9': 'dim7', '3,7,11': 'm(maj7)', '4,8,11': 'maj7♯5', '4,7,9': '6' }[iv] ?? '';
  return noteName(c[0]) + q;
}

const noteMidi = (th, deg) => {
  const s = SCALES[th.sc];
  const n = s.length;
  return th.root + 12 + s[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
};

function rollSvg(th) {
  const W = 1024;
  const stepW = W / 256;
  const all = th.tune.flat().map(([, d]) => noteMidi(th, d));
  const lo = Math.min(...all) - 1;
  const hi = Math.max(...all) + 1;
  const rowH = 8;
  const H = (hi - lo + 1) * rowH;
  let g = '';
  for (let b = 0; b < 16; b++) {
    g += `<rect x="${b * 16 * stepW}" y="0" width="${16 * stepW}" height="${H}" fill="${b % 2 ? '#ffffff05' : '#ffffff00'}"/>`;
    g += `<line x1="${b * 16 * stepW}" x2="${b * 16 * stepW}" y1="0" y2="${H}" stroke="${b % 4 ? '#ffffff12' : '#ffffff30'}"/>`;
  }
  th.tune.forEach((bar, b) => {
    for (const [at, deg, dur] of bar) {
      const m = noteMidi(th, deg);
      const x = (b * 16 + at) * stepW;
      const y = (hi - m) * rowH;
      const hue = (m * 17) % 360;
      g += `<rect x="${x + 0.5}" y="${y + 1}" width="${Math.max(2, dur * stepW - 1)}" height="${rowH - 2}" rx="2" fill="hsl(${hue} 70% 62%)"><title>${noteName(m)} · compás ${b + 1}</title></rect>`;
    }
  });
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${Math.min(200, H)}px">${g}</svg>`;
}

/* ==================== Reproductor MIDI WebAudio ligero ==================== */
const MidiPlayer = (() => {
  let ac = null;
  let master = null;
  let noiseBuf = null;
  let timer = 0;
  let playing = false;
  let onStop = null;
  let activeMutes = new Set();

  function ensureAc() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.42;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  }

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function playSynthNote(trackId, pitch, vel, t, durSec) {
    const g = ac.createGain();
    const v = (vel / 127) * (trackId === 'harmony' ? 0.12 : trackId === 'comp' ? 0.14 : trackId === 'hook' ? 0.16 : trackId === 'bass' ? 0.34 : 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.06, durSec));

    if (trackId === 'drums') {
      if (pitch === 36) {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
        g.gain.setValueAtTime(0.35, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.14);
      } else {
        const src = ac.createBufferSource();
        src.buffer = noiseBuf;
        const flt = ac.createBiquadFilter();
        flt.type = pitch === 38 || pitch === 39 ? 'bandpass' : 'highpass';
        flt.frequency.value = pitch === 38 ? 1600 : pitch === 39 ? 2200 : 6200;
        g.gain.setValueAtTime(pitch === 38 ? 0.18 : 0.09, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (pitch === 49 ? 0.5 : 0.07));
        src.connect(flt);
        flt.connect(g);
        g.connect(master);
        src.start(t);
        src.stop(t + 0.55);
      }
      return;
    }

    const o = ac.createOscillator();
    o.type = trackId === 'bass' || trackId === 'lead' ? 'triangle' : 'sine';
    o.frequency.value = hz(pitch);
    const flt = ac.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = trackId === 'bass' ? 750 : trackId === 'harmony' ? 1800 : 3400;
    o.connect(flt);
    flt.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + Math.max(0.08, durSec) + 0.03);
  }

  function stop() {
    clearInterval(timer);
    playing = false;
    if (onStop) {
      const cb = onStop;
      onStop = null;
      cb();
    }
  }

  function play(midiData, mutes, stopCb) {
    stop();
    ensureAc();
    activeMutes = mutes;
    onStop = stopCb;
    playing = true;

    const secPerTick = 60 / midiData.bpm / midiData.ppq;
    const totalTicks = midiData.bars * 16 * midiData.stepTicks;
    const flat = [];
    for (const tr of midiData.tracks) {
      for (const n of tr.notes) flat.push({ trackId: tr.id, ...n });
    }
    flat.sort((a, b) => a.tick - b.tick);

    let idx = 0;
    const t0 = ac.currentTime + 0.08;
    timer = setInterval(() => {
      if (!playing) return;
      const now = ac.currentTime;
      const horizon = now + 0.18;
      while (idx < flat.length) {
        const ev = flat[idx];
        const evT = t0 + ev.tick * secPerTick;
        if (evT > horizon) break;
        if (evT >= now - 0.05 && !activeMutes.has(ev.trackId)) {
          playSynthNote(ev.trackId, ev.pitch, ev.vel, evT, ev.dur * secPerTick);
        }
        idx++;
      }
      if (now - t0 >= totalTicks * secPerTick + 0.3) stop();
    }, 35);
  }

  return { play, stop };
})();

/* ==================== UI ==================== */
const SECTIONS = [['intro', 'Intro'], ['verse', 'Estrofa'], ['verse2', 'Estrofa 2'], ['pre', 'Pre-coro'], ['chorus', 'Coro'], ['bridge', 'Puente'], ['final', 'Coro final']];
const list = document.getElementById('list');
const nowEl = document.getElementById('now');
let activeCard = null;
let raf = 0;

function stopAll() {
  Music.stop(0.12);
  MidiPlayer.stop();
  cancelAnimationFrame(raf);
  activeCard = null;
  document.querySelectorAll('.cursor').forEach((c) => (c.style.display = 'none'));
  document.querySelectorAll('button.on').forEach((b) => {
    b.classList.remove('on');
    if (b.dataset.role === 'game') b.textContent = '▶ Motor del juego';
    if (b.dataset.role === 'midi') b.textContent = '🎹 Reproducir MIDI';
  });
  document.querySelectorAll('.chords span.hit').forEach((s) => s.classList.remove('hit'));
  nowEl.textContent = 'Nada sonando';
}

document.getElementById('stop').onclick = stopAll;

ZONES.forEach((z, city) => {
  const card = document.createElement('section');
  card.className = 'card';
  let verIdx = 2;
  const mutedTracks = new Set();

  const renderCard = () => {
    const ver = VERSIONS[verIdx];
    const th = ver.list[city];
    const chords = Array.from({ length: 16 }, (_, b) => {
      const e = entryAt(th, b, 0);
      const e2 = entryAt(th, b, 8);
      const a = chordName(th, e);
      return `<span>${e2 === e ? a : `${a}·${chordName(th, e2)}`}</span>`;
    }).join('');

    card.innerHTML = `
      <div class="head">
        <h2>${z.e} ${city + 1}. ${z.n}</h2>
        <small>«${th.name}»</small>
        <span class="sp"></span>
        <div class="tabs">
          ${VERSIONS.map((v, k) => `<button class="tab ${k === verIdx ? 'active' : ''}" data-v="${k}">${v.label}</button>`).join('')}
        </div>
      </div>
      <div class="meta">
        <span class="tag">${noteName(th.root)} ${SCALE_NAMES[th.sc] ?? th.sc}</span>
        <span class="tag">${th.bpm} bpm</span>
        <span class="tag">melodía: ${INSTR[th.leadVoice] ?? th.leadVoice}</span>
        <span class="tag">acompaña: ${INSTR[th.compVoice] ?? th.compVoice}</span>
        <span class="tag">ritmo: ${GROOVE_NAMES[th.groove] ?? th.groove}</span>
      </div>
      <div class="controls">
        <button data-role="game">▶ Motor del juego</button>
        <button data-role="midi">🎹 Reproducir MIDI</button>
        <button data-role="dl">⬇ Descargar .mid</button>
        <label class="laywrap">Capa <input type="range" min="1" max="${LAYERS_PER_CITY}" value="${LAYERS_PER_CITY}" class="lay"> <b class="lv">${LAYERS_PER_CITY}</b></label>
      </div>
      <div class="layers sections">
        <span>Sección (motor):</span>
        ${SECTIONS.map(([id, label]) => `<button class="sec" data-sec="${id}">${label}</button>`).join(' ')}
      </div>
      <div class="layers tracks">
        <span>Pistas MIDI:</span>
        ${[
          ['lead', 'Melodía'],
          ['comp', 'Acordes'],
          ['hook', 'Gancho'],
          ['bass', 'Bajo'],
          ['harmony', 'Coro/Cuerdas'],
          ['drums', 'Batería'],
        ]
          .map(([id, label]) => `<button class="trk ${mutedTracks.has(id) ? 'muted' : ''}" data-trk="${id}">${label}</button>`)
          .join(' ')}
      </div>
      <div class="chords">${chords}</div>
      <div class="roll">${rollSvg(th)}<div class="cursor"></div></div>
    `;

    card.querySelectorAll('.tab').forEach((b) => {
      b.onclick = () => {
        if (activeCard === city) stopAll();
        verIdx = Number(b.dataset.v);
        renderCard();
      };
    });

    const btnGame = card.querySelector('[data-role="game"]');
    const btnMidi = card.querySelector('[data-role="midi"]');
    const btnDl = card.querySelector('[data-role="dl"]');
    const slider = card.querySelector('.lay');
    const lv = card.querySelector('.lv');
    const cursor = card.querySelector('.cursor');
    const spans = [...card.querySelectorAll('.chords span')];

    slider.oninput = () => {
      lv.textContent = slider.value;
      if (activeCard === city) Music.setLayer(Number(slider.value));
    };

    const startCursor = (bpm) => {
      const startedAt = performance.now() + 120;
      cursor.style.display = 'block';
      const frame = () => {
        const barSec = (60 / bpm) * 4;
        const t = Math.max(0, (performance.now() - startedAt) / 1000) / barSec;
        cursor.style.left = `${((t % 16) / 16) * 100}%`;
        spans.forEach((s, k) => s.classList.toggle('hit', k === Math.floor(t % 16)));
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    btnGame.onclick = () => {
      if (btnGame.classList.contains('on')) {
        stopAll();
        return;
      }
      stopAll();
      activeCard = city;
      btnGame.classList.add('on');
      btnGame.textContent = '■ Parar';
      Music.playTheme(th, Number(slider.value));
      nowEl.textContent = `Motor del juego · ${z.n} (${ver.label})`;
      startCursor(th.bpm);
    };

    card.querySelectorAll('.sec').forEach((b) => {
      b.onclick = () => {
        if (!btnGame.classList.contains('on')) btnGame.onclick();
        Music.seek(b.dataset.sec);
      };
    });

    btnMidi.onclick = () => {
      if (btnMidi.classList.contains('on')) {
        stopAll();
        return;
      }
      stopAll();
      activeCard = city;
      btnMidi.classList.add('on');
      btnMidi.textContent = '■ Parar MIDI';
      const midiData = themeToMidiData(th, { bars: 32 });
      nowEl.textContent = `MIDI · ${z.n} (${ver.label})`;
      MidiPlayer.play(midiData, mutedTracks, stopAll);
      startCursor(th.bpm);
    };

    card.querySelectorAll('.trk').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.trk;
        if (mutedTracks.has(id)) mutedTracks.delete(id);
        else mutedTracks.add(id);
        b.classList.toggle('muted', mutedTracks.has(id));
      };
    });

    btnDl.onclick = () => {
      const bytes = themeToMidiBytes(th, { bars: 32 });
      const blob = new Blob([bytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = th.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      a.href = url;
      a.download = `${String(city + 1).padStart(2, '0')}-${slug}.mid`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  };

  renderCard();
  list.append(card);
});
