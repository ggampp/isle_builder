/**
 * Função de altura determinística do mundo: mesa desértica cercada por um rio
 * cavado em canyon, com buttes (morros-testemunha). Pura (sem DOM/Three) para
 * ser testável no Vitest.
 */

export const WORLD_SIZE = 440;
export const WATER_LEVEL = 1.0;
export const MESA_LEVEL = 6.0;

/** Hash determinístico → [0,1). */
function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 1013904223;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise bilinear com suavização. */
function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** fBm de 3 oitavas em [0,1]. */
export function fbm(x: number, y: number): number {
  return (
    valueNoise(x, y) * 0.55 +
    valueNoise(x * 2.1 + 31.7, y * 2.1 + 11.3) * 0.3 +
    valueNoise(x * 4.3 + 71.1, y * 4.3 + 47.9) * 0.15
  );
}

const BUTTES: ReadonlyArray<{ x: number; z: number; r: number; h: number }> = [
  { x: -60, z: -120, r: 26, h: 17 },
  { x: 95, z: -95, r: 20, h: 14 },
  { x: 130, z: 60, r: 24, h: 19 },
  { x: -140, z: 60, r: 18, h: 12 },
  { x: -20, z: 150, r: 22, h: 15 },
  { x: 40, z: -175, r: 16, h: 11 },
  { x: -185, z: -40, r: 20, h: 13 },
  { x: 185, z: -25, r: 17, h: 12 },
];

/**
 * Distância assinada ao eixo do rio (0 = centro do rio). O rio é um anel em
 * volta da mesa com raio modulado por ruído — sempre fechado.
 */
export function riverDistance(x: number, z: number): number {
  const angle = Math.atan2(z, x);
  const dist = Math.hypot(x, z);
  const radius =
    158 +
    Math.sin(angle * 3 + 0.9) * 16 +
    Math.sin(angle * 5 + 2.1) * 7 +
    (fbm(Math.cos(angle) * 2.3 + 5, Math.sin(angle) * 2.3 + 5) - 0.5) * 18;
  return dist - radius;
}

const RIVER_HALF_WIDTH = 13;

export function isRiver(x: number, z: number): boolean {
  return Math.abs(riverDistance(x, z)) < RIVER_HALF_WIDTH;
}

/** Altura do terreno em (x, z). */
export function heightAt(x: number, z: number): number {
  const d = riverDistance(x, z);
  const ad = Math.abs(d);

  // Relevo suave da mesa/planalto externo.
  let h = MESA_LEVEL + (fbm(x * 0.012 + 9, z * 0.012 + 9) - 0.5) * 2.4;

  // Borda externa do mundo sobe um pouco (paredão distante do canyon).
  const edge = Math.max(Math.abs(x), Math.abs(z));
  if (edge > 190) h += (edge - 190) * 0.06 + fbm(x * 0.05, z * 0.05) * 2;

  // Buttes.
  for (const b of BUTTES) {
    const bd = Math.hypot(x - b.x, z - b.z) / b.r;
    if (bd < 1.6) {
      const t = Math.max(0, 1 - bd);
      h += b.h * t * t * (3 - 2 * t);
    }
  }

  // Canyon do rio: cavado íngreme até o leito.
  if (ad < RIVER_HALF_WIDTH + 16) {
    const t = Math.min(1, Math.max(0, (ad - RIVER_HALF_WIDTH) / 16));
    const carve = t * t * (3 - 2 * t); // 0 no rio, 1 na mesa
    const bed = -2.2 + fbm(x * 0.06, z * 0.06) * 0.8;
    h = bed + (h - bed) * carve;
  }
  return h;
}

/** Inclinação aproximada (para colorir rocha nas encostas). */
export function slopeAt(x: number, z: number): number {
  const e = 1.2;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}
