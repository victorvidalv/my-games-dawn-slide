/* ============================ Zonas: una cada 3 niveles (7 tramos × 3 = 21 niveles) ============================
   Cambian los colores de las piezas y el fondo; la llave roja siempre se mantiene roja. */
export const ZONES = [
  { n: 'Valle Esmeralda', e: '🌿', s: 52, l: 52, h: [158, 38, 202, 92, 224, 24, 46, 178] },
  { n: 'Puerto de las Velas', e: '⚓', s: 56, l: 53, h: [194, 22, 208, 174, 42, 218, 158, 30] },
  { n: 'Aldea de Otoño', shade: '#2a122738', e: '🍂', s: 56, l: 50, h: [28, 96, 40, 305, 112, 22, 52, 154] },
  { n: 'Refugio Glacial', shade: '#0a203335', e: '🏔️', s: 54, l: 60, h: [198, 210, 188, 224, 178, 238, 170, 252] },
  { n: 'Ciudad del Reloj', shade: '#17113140', e: '🌃', s: 64, l: 54, h: [295, 188, 262, 212, 322, 155, 46, 278] },
  { n: 'Puerto del Volcán', shade: '#260d183b', e: '🌋', s: 54, l: 48, h: [24, 36, 46, 200, 214, 262, 18, 166] },
  { n: 'Castillo Dorado', e: '🏰', s: 62, l: 56, h: [44, 52, 38, 210, 162, 276, 34, 198] },
];
ZONES.forEach((z) => {
  if (z.h) {
    z.t1 = `hsl(${z.h[0]} ${z.s}% ${Math.max(30, z.l - 16)}% / .42)`;
    z.t2 = `hsl(${z.h[1]} ${z.s}% ${Math.max(30, z.l - 16)}% / .32)`;
    z.cc = `hsl(${z.h[0]} 80% 64%)`;
  }
});
export const ZONE_COUNT = ZONES.length;
export const ZONE_LEVELS = 3;
export const zoneIdx = (l) => Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor((l - 1) / ZONE_LEVELS)));
export const zoneStep = (l) => ((Math.max(1, l) - 1) % ZONE_LEVELS) + 1;
export const zoneOf = (l) => ZONES[zoneIdx(l)];
