import { describe, it, expect, vi, beforeAll } from 'vitest';

/** Audio y DOM simulados: cuentan las notas programadas y fallan si el secuenciador usa algo que no existe. */
const clock = { now: 0 };
const stats = { osc: 0, noise: 0, maxFreq: 0, minFreq: Infinity };
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), detune: param(), start() {}, stop() {}, addEventListener() {}, type: '' });

class FakeAC {
  constructor() { this.state = 'running'; this.sampleRate = 8000; this.destination = node(); }
  get currentTime() { return clock.now; }
  addEventListener() {}
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  createGain() { return node(); }
  createBiquadFilter() { return node(); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  createBufferSource() { stats.noise++; return node(); }
  createOscillator() {
    stats.osc++;
    const o = node();
    o.frequency = { value: 0, setValueAtTime(f) { track(f); }, exponentialRampToValueAtTime() {}, set value(f) { track(f); }, get value() { return 0; } };
    return o;
  }
}
const track = (f) => { if (f > 0) { stats.maxFreq = Math.max(stats.maxFreq, f); stats.minFreq = Math.min(stats.minFreq, f); } };
const el = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: { setProperty() {} }, dataset: {},
  addEventListener() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => el(), textContent: '', innerHTML: '', hidden: true,
});

describe('secuenciador (con audio simulado)', () => {
  let Music;
  beforeAll(async () => {
    const store = {};
    vi.stubGlobal('localStorage', { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } });
    vi.stubGlobal('window', { AudioContext: FakeAC });
    vi.stubGlobal('addEventListener', () => {});
    vi.stubGlobal('document', { hidden: false, body: el(), getElementById: () => el(), addEventListener() {}, querySelectorAll: () => [] });
    vi.useFakeTimers();
    ({ Music } = await import('../src/audio/music.js'));
  });

  /** Reproduce `ms` milisegundos de música. */
  const play = (ms) => {
    for (let t = 0; t < ms; t += 25) {
      clock.now += 0.025;
      vi.advanceTimersByTime(25);
    }
  };

  it('toca el menú, héroes y las 10 ciudades sin errores, con notas en cada compás y en un registro audible', () => {
    const scenes = [() => Music.scene('menu'), () => Music.scene('heroes'), ...Array.from({ length: 10 }, (_, z) => () => Music.setLevel(z * 10 + 1))];
    expect(scenes).toHaveLength(12);
    for (const go of scenes) {
      go();
      Music.start();
      stats.osc = 0;
      stats.maxFreq = 0;
      stats.minFreq = Infinity;
      play(9000); // ~16 compases a ritmo normal: más que una vuelta entera de algunos compases
      expect(Music.playing).toBe(true);
      expect(stats.osc, Music.themeName).toBeGreaterThan(100);
      expect(stats.minFreq, Music.themeName).toBeGreaterThan(25);   // el bajo no cae a infrasonidos
      expect(stats.maxFreq, Music.themeName).toBeLessThan(9000);    // nada chillón
    }
  });

  it('cada canción completa (intro, estrofas, coros, puente, coro final modulado y cierre) pasa por todas sus secciones sin notas chillonas ni infrasonidos', () => {
    const scenes = [() => Music.scene('menu'), () => Music.scene('heroes'), ...Array.from({ length: 10 }, (_, z) => () => { Music.setLevel(z * 10 + 9); Music.setLayer(10); }), () => Music.setLevel(10)];
    for (const go of scenes) {
      Music.stop(0);
      go();
      Music.start();
      stats.osc = 0; stats.maxFreq = 0; stats.minFreq = Infinity;
      const seen = new Set();
      for (let t = 0; t < 215; t += 5) { play(5000); seen.add(Music.section); }
      expect(seen.size, Music.themeName).toBe(12);                       // las 12 secciones de la forma
      expect(stats.minFreq, Music.themeName).toBeGreaterThan(25);
      expect(stats.maxFreq, Music.themeName).toBeLessThan(9000);
    }
    Music.stop(0);
  });

  it('con pocos turnos la música NO cambia: mismo tempo y sin capas nuevas (el aviso es solo visual)', async () => {
    const { setTensionFx } = await import('../src/audio/music.js');
    Music.setLevel(1);
    Music.start();
    play(2000);
    const bpm = Music.bpm();
    expect(bpm).toBeCloseTo(124, 0);   // el tempo del tema del Valle, sin aceleración
    Music.seek('verse');
    stats.osc = 0;
    play(15500);                        // 8 compases
    const normal = stats.osc;
    setTensionFx(true, true);          // pocos turnos + último turno
    Music.seek('verse');               // el mismo tramo de la canción, ahora con el aviso encendido
    stats.osc = 0;
    play(15500);
    expect(Music.bpm()).toBeCloseTo(bpm, 0);
    expect(Math.abs(stats.osc - normal) / normal).toBeLessThan(0.06); // mismas notas: ni latido, ni alarma, ni más hats
    setTensionFx(false, false);
    Music.stop(0.1);
    expect(Music.playing).toBe(false);
  });

  it('capas por nivel: cada nivel de la ciudad suma notas (1 = básico … 10 = todo) y la melodía no cambia', () => {
    let prev = 0;
    const counts = [];
    for (let l = 1; l <= 10; l++) {
      Music.stop(0);
      Music.setLevel(Math.min(l, 9));    // ciudad 1, nivel l → capa l (el nivel 10 es el jefe, con su propio tema: la capa 10 se fuerza sobre el tema de la ciudad)
      if (l === 10) Music.setLayer(10);
      Music.start();
      Music.seek('verse');               // la canción tiene forma: se compara siempre la misma sección (estrofas)
      play(2300);                        // deja entrar la capa en el siguiente compás
      expect(Music.layer).toBe(l);
      stats.osc = 0;
      play(15500);
      counts.push(stats.osc);
      expect(stats.osc, `capa ${l}`).toBeGreaterThanOrEqual(prev * 0.97);
      prev = stats.osc;
    }
    expect(counts[9]).toBeGreaterThan(counts[0] * 2);   // en las estrofas el nivel 10 suena mucho más lleno que el 1 (el coro es grande en todos)
    expect(new Set(counts).size).toBeGreaterThanOrEqual(6);
    Music.stop(0.1);
  });

  it('los niveles jefe (10, 20… 100) suenan con la marcha del jefe, en otra tonalidad en cada ciudad, y los demás con el tema de su ciudad', () => {
    const names = {};
    for (const level of [9, 10, 20, 100, 11]) {
      Music.setLevel(level);
      Music.start();
      play(2300);
      names[level] = Music.themeName;
    }
    expect(names[10]).toBe('El guardián del umbral');
    expect(names[20]).toBe(names[10]);
    expect(names[100]).toBe(names[10]);
    expect(names[9]).not.toBe(names[10]);
    expect(names[11]).not.toBe(names[10]);
    Music.stop(0.1);
  });

  it('la música de jefe es épica: mucho más llena que la de la ciudad con todas sus capas, sin infrasonidos ni chillidos', () => {
    const measure = (go) => {
      Music.stop(0);
      go();
      Music.start();
      Music.seek('chorus');              // coro contra coro: el momento más lleno de cada canción
      play(2300);
      stats.osc = 0; stats.maxFreq = 0; stats.minFreq = Infinity;
      play(9000);
      return { osc: stats.osc, min: stats.minFreq, max: stats.maxFreq };
    };
    const city = measure(() => { Music.setLevel(9); Music.setLayer(10); });
    const boss = measure(() => Music.setLevel(10));
    expect(boss.osc, 'densidad de sonido').toBeGreaterThan(city.osc * 1.35);
    expect(boss.min).toBeGreaterThan(25);
    expect(boss.max).toBeLessThan(9000);
    for (const level of [20, 50, 100]) {
      const b = measure(() => Music.setLevel(level));
      expect(b.osc, `jefe ${level}`).toBeGreaterThan(city.osc * 1.35);
      expect(b.min, `jefe ${level}`).toBeGreaterThan(25);
    }
    Music.stop(0.1);
  });

  it('el nivel 11 vuelve a la capa 1 con el tema de la ciudad siguiente', () => {
    Music.setLevel(10);
    Music.start();
    play(2300);
    expect(Music.layer).toBe(10);
    Music.setLevel(11);
    play(5000);
    expect(Music.layer).toBe(1);
    Music.stop(0.1);
  });
});
