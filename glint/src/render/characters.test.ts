import { describe, expect, it } from 'vitest';
import { createGolemModel, createHeroModel, createSlimeModel } from './characters.ts';

function parts(view: ReturnType<typeof createHeroModel>): string[] {
  const names: string[] = [];
  view.root.traverse((object) => names.push(object.name));
  return names;
}

describe('character models', () => {
  it('builds a hero with articulated equipment', () => {
    expect(parts(createHeroModel())).toEqual(expect.arrayContaining([
      'blue-cloak', 'kite-shield', 'sword-blade', 'hero-head',
    ]));
  });

  it('builds distinct detailed models for slimes and the golem', () => {
    expect(parts(createSlimeModel())).toContain('slime-crown');
    expect(parts(createSlimeModel(true))).toContain('spectral-flame');
    expect(parts(createGolemModel())).toEqual(expect.arrayContaining([
      'golem-torso', 'rune-chest', 'left-boulder-arm',
    ]));
  });
});
