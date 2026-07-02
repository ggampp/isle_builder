import { describe, expect, it } from 'vitest';
import { computeBlobMask, MaskBit, type NeighborSample } from './autotiler.ts';

const NONE: NeighborSample = {
  n: false,
  s: false,
  e: false,
  w: false,
  ne: false,
  nw: false,
  se: false,
  sw: false,
};

const ALL: NeighborSample = {
  n: true,
  s: true,
  e: true,
  w: true,
  ne: true,
  nw: true,
  se: true,
  sw: true,
};

describe('computeBlobMask', () => {
  it('tile isolado (sem vizinhos) tem mask 0', () => {
    expect(computeBlobMask(NONE)).toBe(0);
  });

  it('tile totalmente cercado tem os 8 bits (255)', () => {
    expect(computeBlobMask(ALL)).toBe(255);
  });

  it('seta um bit de aresta mesmo sem diagonais', () => {
    const mask = computeBlobMask({ ...NONE, n: true });
    expect(mask).toBe(MaskBit.N);
  });

  it('não seta o bit de canto quando o vizinho diagonal difere, mesmo com as duas arestas presentes', () => {
    const mask = computeBlobMask({ ...NONE, n: true, e: true });
    expect(mask).toBe(MaskBit.N | MaskBit.E);
  });

  it('só seta o bit de canto quando as duas arestas E a diagonal estão presentes', () => {
    const mask = computeBlobMask({ ...NONE, n: true, e: true, ne: true });
    expect(mask).toBe(MaskBit.N | MaskBit.E | MaskBit.NE);
  });

  it('não seta o bit de canto quando só a diagonal está presente, sem as duas arestas', () => {
    const mask = computeBlobMask({ ...NONE, n: true, ne: true });
    expect(mask).toBe(MaskBit.N);
  });

  it('trata os 4 cantos de forma independente', () => {
    const mask = computeBlobMask({ ...ALL, ne: false, se: false });
    expect(mask).toBe(MaskBit.N | MaskBit.S | MaskBit.E | MaskBit.W | MaskBit.NW | MaskBit.SW);
  });
});
