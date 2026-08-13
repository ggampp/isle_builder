/**
 * Função de altura determinística do mundo ativo.
 * Perfil (buttes, pads, rio) vem de `setTerrainProfile` / mapas.
 */

import type { TerrainProfile, TownPadDef } from './maps.ts';

export const WORLD_SIZE = 440;
export const WATER_LEVEL = 1.0;
export const MESA_LEVEL = 6.0;

/** Hash determinístico → [0,1). */
function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 1013904223;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

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

const DEFAULT_PROFILE: TerrainProfile = {
  mesaLevel: MESA_LEVEL,
  buttes: [
    { x: -60, z: -120, r: 26, h: 17 },
    { x: 95, z: -95, r: 20, h: 14 },
    { x: 130, z: 60, r: 24, h: 19 },
    { x: -140, z: 60, r: 18, h: 12 },
    { x: -20, z: 150, r: 22, h: 15 },
    { x: 40, z: -175, r: 16, h: 11 },
    { x: -185, z: -40, r: 20, h: 13 },
    { x: 185, z: -25, r: 17, h: 12 },
  ],
  townPads: [
    { x: -92, z: -34, r: 30, level: 6.4 },
    { x: 96, z: -62, r: 30, level: 7.1 },
    { x: -12, z: 186, r: 28, level: 6.8 },
  ],
  river: {
    kind: 'ring',
    baseRadius: 158,
    amp1: 16,
    phase1: 0.9,
    amp2: 7,
    phase2: 2.1,
    noiseAmp: 18,
    halfWidth: 13,
  },
};

let profile: TerrainProfile = DEFAULT_PROFILE;

/** Platôs planos das cidades do mapa ativo (live binding). */
export let TOWN_PADS: ReadonlyArray<TownPadDef> = DEFAULT_PROFILE.townPads;

export function setTerrainProfile(next: TerrainProfile): void {
  profile = next;
  TOWN_PADS = next.townPads;
}

export function getTerrainProfile(): TerrainProfile {
  return profile;
}

export function riverHalfWidth(): number {
  return profile.river.halfWidth;
}

/**
 * Distância assinada ao eixo do rio (0 = centro).
 * Ring = anel; band = faixa serpenteante.
 */
export function riverDistance(x: number, z: number): number {
  const river = profile.river;
  if (river.kind === 'band') {
    const t = river.along === 'x' ? x : z;
    const cross = river.along === 'x' ? z : x;
    const center =
      river.center + Math.sin(t * river.freq + 0.7) * river.amp + (fbm(t * 0.04 + 3, 7) - 0.5) * 8;
    let d = cross - center;
    if (river.twinCenter !== undefined) {
      const c2 =
        river.twinCenter +
        Math.sin(t * river.freq + 2.1) * river.amp * 0.7 +
        (fbm(t * 0.04 + 9, 11) - 0.5) * 6;
      const d2 = cross - c2;
      d = Math.abs(d) < Math.abs(d2) ? d : d2;
    }
    return d;
  }

  const angle = Math.atan2(z, x);
  const dist = Math.hypot(x, z);
  const radius =
    river.baseRadius +
    Math.sin(angle * 3 + river.phase1) * river.amp1 +
    Math.sin(angle * 5 + river.phase2) * river.amp2 +
    (fbm(Math.cos(angle) * 2.3 + 5, Math.sin(angle) * 2.3 + 5) - 0.5) * river.noiseAmp;
  return dist - radius;
}

export function isRiver(x: number, z: number): boolean {
  return Math.abs(riverDistance(x, z)) < profile.river.halfWidth;
}

/** Altura do terreno em (x, z). */
export function heightAt(x: number, z: number): number {
  const d = riverDistance(x, z);
  const ad = Math.abs(d);
  const half = profile.river.halfWidth;
  const mesa = profile.mesaLevel;

  let h = mesa + (fbm(x * 0.012 + 9, z * 0.012 + 9) - 0.5) * 2.4;

  const edge = Math.max(Math.abs(x), Math.abs(z));
  if (edge > 190) h += (edge - 190) * 0.06 + fbm(x * 0.05, z * 0.05) * 2;

  for (const b of profile.buttes) {
    const bd = Math.hypot(x - b.x, z - b.z) / b.r;
    if (bd < 1.6) {
      const t = Math.max(0, 1 - bd);
      h += b.h * t * t * (3 - 2 * t);
    }
  }

  if (ad < half + 16) {
    const t = Math.min(1, Math.max(0, (ad - half) / 16));
    const carve = t * t * (3 - 2 * t);
    const bed = -2.2 + fbm(x * 0.06, z * 0.06) * 0.8;
    h = bed + (h - bed) * carve;
  }

  for (const pad of profile.townPads) {
    const pd = Math.hypot(x - pad.x, z - pad.z) / pad.r;
    if (pd < 1) {
      const t = 1 - pd * pd;
      h += (pad.level - h) * t * t;
    }
  }
  return h;
}

export function slopeAt(x: number, z: number): number {
  const e = 1.2;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}
