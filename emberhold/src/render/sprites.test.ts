import { describe, expect, it } from 'vitest';
import { unitFrameCount } from './sprites.ts';

describe('ciclos de sprite', () => {
  it('caminhada tem quatro frames, idle dois, golpe três', () => {
    expect(unitFrameCount('walk')).toBe(4);
    expect(unitFrameCount('idle')).toBe(2);
    expect(unitFrameCount('attack')).toBe(3);
    expect(unitFrameCount('chop')).toBe(3);
    expect(unitFrameCount('repair')).toBe(3);
  });
});
