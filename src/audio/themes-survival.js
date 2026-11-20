import { parseBar } from './themes.js';

export const SURVIVAL_TRACK_BARS = 32;

// Dos frases por tema. La segunda mitad las reorquesta con bajo y percusión más densos.
const songs = [
  [
    'Contrarreloj',
    144,
    45,
    'min',
    'synth',
    [0, 5, 2, 4],
    [0, 3, 8, 10],
    [4, 12],
    '7:3 9:1 7:2 4:2 5:3 4:1 2:2 r:2',
    'r:2 6:2 9:3 11:1 9:2 6:2 4:4',
  ],
  [
    'Filo de cobre',
    152,
    43,
    'phr',
    'brass',
    [0, 1, 5, 1],
    [0, 6, 10, 14],
    [4, 11],
    '7:2 4:2 8:3 7:1 4:2 3:2 1:4',
    'r:3 4:1 7:3 8:1 10:2 8:2 7:4',
  ],
  [
    'Pulso nocturno',
    138,
    48,
    'dor',
    'glass',
    [0, 3, 5, 4],
    [0, 4, 7, 11, 14],
    [6, 12],
    'r:1 11:2 9:3 7:2 9:2 10:1 9:1 7:4',
    '5:4 7:1 9:2 r:1 12:3 10:1 9:4',
  ],
  [
    'Roca partida',
    149,
    41,
    'hmin',
    'fiddle',
    [0, 5, 3, 4],
    [0, 2, 8, 11],
    [4, 7, 12],
    '4:2 6:1 7:1 9:2 7:2 6:3 4:1 2:4',
    'r:2 4:1 6:1 7:4 10:2 9:2 7:4',
  ],
  [
    'Cerco',
    142,
    46,
    'min',
    'horn',
    [0, 6, 3, 5],
    [0, 5, 8, 13],
    [3, 12],
    '7:4 r:2 5:1 4:1 5:2 2:2 0:4',
    '9:3 10:1 9:2 7:2 5:4 4:2 2:2',
  ],
  [
    'Resonancia',
    156,
    44,
    'dor',
    'vibes',
    [0, 4, 6, 3],
    [0, 4, 8, 12],
    [4, 12, 15],
    'r:2 4:2 7:2 11:2 9:1 11:1 12:2 11:4',
    '7:1 9:1 11:2 14:3 12:1 11:2 9:2 7:4',
  ],
  [
    'Aguja de hielo',
    147,
    47,
    'phr',
    'celesta',
    [0, 5, 1, 6],
    [0, 3, 6, 12],
    [5, 13],
    '12:2 11:1 8:1 7:4 r:2 8:2 4:4',
    '11:1 8:1 7:1 4:1 8:3 7:1 4:2 5:2 4:4',
  ],
  [
    'Golpe de hierro',
    158,
    42,
    'hmin',
    'guitar',
    [0, 1, 5, 4],
    [0, 3, 7, 8, 13],
    [4, 10, 12],
    '7:1 4:1 7:1 9:1 10:3 9:1 7:2 4:2 6:4',
    '4:3 6:1 7:2 11:2 10:3 9:1 7:4',
  ],
  [
    'Última defensa',
    140,
    50,
    'min',
    'accordion',
    [0, 2, 5, 4],
    [0, 6, 9, 12],
    [4, 12],
    '4:3 7:1 11:4 10:2 9:2 7:4',
    'r:1 5:2 7:1 9:3 7:1 4:2 5:2 2:4',
  ],
  [
    'La última llave',
    150,
    45,
    'phd',
    'pizz',
    [0, 3, 1, 4],
    [0, 4, 10, 13],
    [4, 7, 12],
    '7:2 8:2 11:3 8:1 7:2 4:2 3:4',
    'r:3 4:1 7:2 11:2 12:3 11:1 8:2 7:2',
  ],
  [
    'Alba de acero',
    146,
    47,
    'dor',
    'flute',
    [0, 3, 5, 6],
    [0, 4, 8, 14],
    [4, 12],
    '4:2 7:2 9:3 11:1 9:2 7:2 4:4',
    'r:2 7:2 11:2 14:2 12:3 11:1 9:4',
  ],
  [
    'Cumbre astral',
    154,
    48,
    'min',
    'bell',
    [0, 5, 6, 4],
    [0, 3, 8, 12],
    [4, 10, 14],
    'r:1 7:2 10:1 12:2 10:2 9:3 7:1 5:4',
    '7:2 9:2 12:3 14:1 12:2 10:2 7:4',
  ],
];

export const SURVIVAL_TRACKS = songs.map(([name, bpm, root, sc, lead, prog, kicks, snares, ...phrases]) => ({
  name,
  bpm,
  root,
  sc,
  lead,
  prog,
  kicks,
  snares,
  tune: phrases.map((phrase) => parseBar(phrase).notes),
}));

export function shuffleSurvivalTracks(previous, random = Math.random) {
  const playlist = SURVIVAL_TRACKS.slice();
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }
  if (playlist[0] === previous) {
    const j = 1 + Math.floor(random() * (playlist.length - 1));
    [playlist[0], playlist[j]] = [playlist[j], playlist[0]];
  }
  return playlist;
}
