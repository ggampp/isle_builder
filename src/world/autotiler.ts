import type { Tilemap } from './tilemap.ts';

/**
 * Bits do "blob tileset" clássico de 47 variantes: 4 bits de aresta
 * (N/S/E/W) + 4 bits de canto (NE/NW/SE/SW), onde um bit de canto só é
 * contado quando as DUAS arestas adjacentes também estão presentes — é
 * esse "gating" que reduz as 256 combinações cruas a 47 formas visuais
 * distintas (uma diagonal isolada, sem as arestas, não muda o contorno).
 */
export const MaskBit = {
  N: 1,
  S: 2,
  E: 4,
  W: 8,
  NE: 16,
  NW: 32,
  SE: 64,
  SW: 128,
} as const;

export interface NeighborSample {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
  ne: boolean;
  nw: boolean;
  se: boolean;
  sw: boolean;
}

/** Pura: bitmask de vizinhos → índice (0-255) no atlas blob. Sem I/O. */
export function computeBlobMask(sample: NeighborSample): number {
  let mask = 0;
  if (sample.n) mask |= MaskBit.N;
  if (sample.s) mask |= MaskBit.S;
  if (sample.e) mask |= MaskBit.E;
  if (sample.w) mask |= MaskBit.W;
  if (sample.n && sample.e && sample.ne) mask |= MaskBit.NE;
  if (sample.n && sample.w && sample.nw) mask |= MaskBit.NW;
  if (sample.s && sample.e && sample.se) mask |= MaskBit.SE;
  if (sample.s && sample.w && sample.sw) mask |= MaskBit.SW;
  return mask;
}

/**
 * Amostra os 8 vizinhos de um tile no tilemap, testando "pertence à mesma
 * transição" como `layer >= threshold` — assim uma camada mais alta (ex.:
 * grama) também conta como "presente" para a mask da camada mais baixa
 * (areia), o que é exatamente o que faz a grama "flutuar" sobre a areia
 * sem quebrar a borda dela. Convenção: mundo +Y é Norte (ver render/chunkmesh.ts).
 */
export function sampleNeighbors(tilemap: Tilemap, tileX: number, tileY: number, threshold: number): NeighborSample {
  const same = (dx: number, dy: number): boolean => tilemap.getLayer(tileX + dx, tileY + dy) >= threshold;
  return {
    n: same(0, 1),
    s: same(0, -1),
    e: same(1, 0),
    w: same(-1, 0),
    ne: same(1, 1),
    nw: same(-1, 1),
    se: same(1, -1),
    sw: same(-1, -1),
  };
}
