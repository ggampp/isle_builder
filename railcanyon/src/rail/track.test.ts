import { describe, expect, it } from 'vitest';
import { WATER_LEVEL, heightAt } from '../world/heightfield.ts';
import { DEFAULT_LOOP, buildTrackCurve, sampleTrack } from './track.ts';

describe('track', () => {
  const curve = buildTrackCurve();

  it('o loop padrão fica inteiro sobre terra firme (nunca no rio)', () => {
    const { points } = sampleTrack(curve, 2);
    for (const p of points) {
      expect(heightAt(p.x, p.z)).toBeGreaterThan(WATER_LEVEL);
    }
  });

  it('amostragem por arc-length tem espaçamento uniforme', () => {
    const spacing = 3;
    const { points, length } = sampleTrack(curve, spacing);
    expect(length).toBeGreaterThan(100);
    const expected = length / points.length;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      const d = points[i].distanceTo(next);
      // Tolerância folgada: a curva 3D dobra e sobe/desce levemente.
      expect(d).toBeGreaterThan(expected * 0.5);
      expect(d).toBeLessThan(expected * 1.5);
    }
  });

  it('tangentes acompanham a direção do próximo ponto', () => {
    const { points, tangents } = sampleTrack(curve, 4);
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      const dir = next.clone().sub(points[i]).normalize();
      expect(dir.dot(tangents[i])).toBeGreaterThan(0.8);
    }
  });

  it('curva é fechada e passa perto dos pontos de controle', () => {
    for (const [x, z] of DEFAULT_LOOP) {
      const { points } = sampleTrack(curve, 2);
      const min = Math.min(...points.map((p) => Math.hypot(p.x - x, p.z - z)));
      expect(min).toBeLessThan(6);
    }
  });
});
