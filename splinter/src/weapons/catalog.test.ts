import { describe, expect, it } from 'vitest';
import { spreadDirection, weaponById, weaponBySlot, WEAPONS } from './catalog.ts';

describe('armas', () => {
  it('cinco slots distintos de 1 a 5', () => {
    expect(WEAPONS).toHaveLength(5);
    expect(WEAPONS.map((w) => w.slot).sort().join('')).toBe('12345');
  });

  it('escopeta espalha vários pellets; o revólver não', () => {
    expect(weaponById('shotgun').pellets).toBeGreaterThan(1);
    expect(weaponById('bullet').pellets).toBe(1);
  });

  it('bomba é arremesso; laser é feixe contínuo', () => {
    expect(weaponById('bomb').throw).toBe(true);
    expect(weaponById('laser').beam).toBe(true);
    expect(weaponBySlot(4)?.id).toBe('bomb');
  });

  it('spread unitário continua unitário', () => {
    const d = spreadDirection({ x: 0, y: 0, z: -1 }, 0.1, () => 0.25);
    const len = Math.hypot(d.x, d.y, d.z);
    expect(len).toBeCloseTo(1, 5);
  });
});
