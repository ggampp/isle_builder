import { describe, expect, it } from 'vitest';
import { PIECE_KINDS, PIECE_SPECS, normalizeAngle, pieceEnd, poseAlong, samplePiece } from './geometry.ts';
import type { Pose } from './geometry.ts';

const START: Pose = { x: 10, z: -4, heading: 0.7 };

describe('geometria das peças', () => {
  it('t=0 devolve a pose inicial para toda peça', () => {
    for (const kind of PIECE_KINDS) {
      const p = poseAlong(START, kind, 0);
      expect(p.x).toBeCloseTo(START.x, 10);
      expect(p.z).toBeCloseTo(START.z, 10);
      expect(p.heading).toBeCloseTo(START.heading, 10);
    }
  });

  it('a reta avança exatamente o comprimento na direção do heading', () => {
    const end = pieceEnd(START, 'straight');
    const spec = PIECE_SPECS.straight;
    expect(Math.hypot(end.x - START.x, end.z - START.z)).toBeCloseTo(spec.length, 6);
    expect(end.heading).toBeCloseTo(START.heading, 10);
  });

  it('as curvas giram o ângulo previsto, para lados opostos', () => {
    expect(normalizeAngle(pieceEnd(START, 'curveL').heading - START.heading))
      .toBeCloseTo(PIECE_SPECS.curveL.turn, 10);
    expect(normalizeAngle(pieceEnd(START, 'curveR').heading - START.heading))
      .toBeCloseTo(PIECE_SPECS.curveR.turn, 10);
    expect(PIECE_SPECS.curveL.turn).toBeGreaterThan(0);
    expect(PIECE_SPECS.curveR.turn).toBeLessThan(0);
  });

  it('o comprimento amostrado bate com o comprimento declarado', () => {
    for (const kind of PIECE_KINDS) {
      const poses = [poseAlong(START, kind, 0), ...samplePiece(START, kind, 240)];
      let length = 0;
      for (let i = 1; i < poses.length; i++) {
        length += Math.hypot(poses[i].x - poses[i - 1].x, poses[i].z - poses[i - 1].z);
      }
      expect(length).toBeCloseTo(PIECE_SPECS[kind].length, 1);
    }
  });

  it('curvas simétricas espelham o deslocamento lateral', () => {
    const left = pieceEnd({ x: 0, z: 0, heading: 0 }, 'curveL');
    const right = pieceEnd({ x: 0, z: 0, heading: 0 }, 'curveR');
    expect(left.x).toBeCloseTo(right.x, 10);
    expect(left.z).toBeCloseTo(-right.z, 10);
  });
});
