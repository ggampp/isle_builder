import { describe, expect, it } from 'vitest';
import {
  MESA_LEVEL, WATER_LEVEL, heightAt, isRiver, riverDistance, slopeAt,
} from './heightfield.ts';

describe('heightfield', () => {
  it('é determinística', () => {
    for (const [x, z] of [[0, 0], [37.5, -81.2], [-140, 155], [200, 200]]) {
      expect(heightAt(x, z)).toBe(heightAt(x, z));
    }
  });

  it('o centro da mesa fica acima do nível da água', () => {
    expect(heightAt(0, 0)).toBeGreaterThan(WATER_LEVEL + 2);
  });

  it('o leito do rio fica abaixo do nível da água em toda a volta', () => {
    // Percorre o anel do rio achando o centro (riverDistance ≈ 0) por ângulo.
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
      let lo = 60;
      let hi = 240;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (riverDistance(Math.cos(a) * mid, Math.sin(a) * mid) < 0) lo = mid;
        else hi = mid;
      }
      const r = (lo + hi) / 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      expect(isRiver(x, z)).toBe(true);
      expect(heightAt(x, z)).toBeLessThan(WATER_LEVEL);
    }
  });

  it('a mesa é aproximadamente plana longe do rio e dos buttes', () => {
    expect(Math.abs(heightAt(20, 30) - MESA_LEVEL)).toBeLessThan(2);
    expect(slopeAt(20, 30)).toBeLessThan(0.3);
  });
});
