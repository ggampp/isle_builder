import { describe, expect, it } from 'vitest';
import { getPropDefinition } from '../../props/catalog.ts';
import { TILE_SIZE } from '../../world/constants.ts';
import {
  ART_PIXELS_PER_WORLD_UNIT,
  entitySpriteSize,
  propWorldSize,
  TERRAIN_MASK_CELL_PX,
  terrainFillWorldScale,
  tilesToWorld,
  VISUAL_TILES,
} from './worldScale.ts';

describe('worldScale', () => {
  it('converts tiles to world units', () => {
    expect(tilesToWorld(2)).toBe(TILE_SIZE * 2);
  });

  it('sizes trees ~2 tiles and buildings by footprint', () => {
    const tree = getPropDefinition('tree_oak')!;
    const house = getPropDefinition('house_red')!;
    const barn = getPropDefinition('barn')!;

    expect(propWorldSize(tree).h).toBe(tilesToWorld(VISUAL_TILES.tree));
    expect(propWorldSize(house).h).toBe(tilesToWorld(2));
    expect(propWorldSize(barn).h).toBe(tilesToWorld(3));
  });

  it('aligns terrain mask density with prop sprites', () => {
    const tree = propWorldSize(getPropDefinition('tree_oak')!);
    const propPxPerWu = 64 / tree.h;
    const terrainPxPerWu = TERRAIN_MASK_CELL_PX / TILE_SIZE;
    expect(terrainPxPerWu).toBeCloseTo(propPxPerWu, 5);
    expect(terrainFillWorldScale(2000, 1000)).toEqual({
      x: 2000 / ART_PIXELS_PER_WORLD_UNIT,
      y: 1000 / ART_PIXELS_PER_WORLD_UNIT,
    });
  });

  it('keeps villagers shorter than trees', () => {
    const villager = entitySpriteSize('villager');
    const tree = propWorldSize(getPropDefinition('tree_oak')!);
    expect(villager.h).toBeLessThan(tree.h);
    expect(villager.h).toBeCloseTo(tilesToWorld(VISUAL_TILES.villager));
  });
});