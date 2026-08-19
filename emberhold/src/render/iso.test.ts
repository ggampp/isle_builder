import { describe, expect, it } from 'vitest';
import { depth, screenToWorld, worldToScreen } from './iso.ts';

describe('projeção isométrica', () => {
  it('screenToWorld inverte worldToScreen', () => {
    const s = worldToScreen(3.5, 8.25);
    const w = screenToWorld(s.x, s.y);
    expect(w.x).toBeCloseTo(3.5, 6);
    expect(w.y).toBeCloseTo(8.25, 6);
  });

  it('mais ao sul+leste tem profundidade maior (desenha por cima)', () => {
    expect(depth(2, 2)).toBeGreaterThan(depth(1, 1));
  });
});
