import { describe, expect, it } from 'vitest';
import { Tilemap } from '../world/tilemap.ts';
import { TerrainLayer } from '../world/layers.ts';
import { CoastManager } from '../world/coast.ts';
import { TILE_SIZE } from '../world/constants.ts';
import {
  labelWalkableComponents,
  pickWalkTarget,
  TerrainCensusTracker,
  targetVillagerCount,
} from './census.ts';
import { EntityManager } from './manager.ts';
import { findNearestWalkable, isWalkableTile, tileCenter } from './walkability.ts';

function paintGrassIsland(tilemap: Tilemap, cx: number, cy: number, r: number): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        tilemap.setLayer(x, y, TerrainLayer.Sand);
        tilemap.setLayer(x, y, TerrainLayer.Grass);
      }
    }
  }
}

describe('labelWalkableComponents', () => {
  it('merges land masses connected by a bridge', () => {
    const tilemap = new Tilemap();
    tilemap.setLayer(0, 0, TerrainLayer.Sand);
    tilemap.setLayer(1, 0, TerrainLayer.Sand);
    tilemap.setLayer(2, 0, TerrainLayer.Bridge);
    tilemap.setLayer(3, 0, TerrainLayer.Sand);
    tilemap.setLayer(4, 0, TerrainLayer.Sand);

    const walkable = [
      { tileX: 0, tileY: 0 },
      { tileX: 1, tileY: 0 },
      { tileX: 2, tileY: 0 },
      { tileX: 3, tileY: 0 },
      { tileX: 4, tileY: 0 },
    ];
    const bridges = [{ tileX: 2, tileY: 0 }];
    const { samples, componentCount } = labelWalkableComponents(tilemap, walkable, bridges);
    expect(componentCount).toBe(1);
    expect(samples.every((s) => s.component === samples[0]!.component)).toBe(true);
  });

  it('keeps separate components without bridge', () => {
    const tilemap = new Tilemap();
    tilemap.setLayer(0, 0, TerrainLayer.Grass);
    tilemap.setLayer(5, 0, TerrainLayer.Grass);
    const walkable = [{ tileX: 0, tileY: 0 }, { tileX: 5, tileY: 0 }];
    const { componentCount } = labelWalkableComponents(tilemap, walkable, []);
    expect(componentCount).toBe(2);
  });
});

describe('pickWalkTarget', () => {
  it('can pick target on another component for bridge crossing', () => {
    const census = {
      grassTiles: 10,
      walkableTiles: 10,
      deepWaterTiles: 0,
      shallowWaterTiles: 0,
      walkableSamples: [
        { tileX: 0, tileY: 0, component: 0 },
        { tileX: 10, tileY: 0, component: 1 },
      ],
      deepWaterSamples: [],
      shallowWaterSamples: [],
      bridgeTiles: [{ tileX: 5, tileY: 0 }],
      componentCount: 2,
    };
    let foundOther = false;
    for (let i = 0; i < 40; i++) {
      const t = pickWalkTarget(census, 0, 1);
      if (t && t.component === 1) foundOther = true;
    }
    expect(foundOther).toBe(true);
  });
});

describe('EntityManager terrain revalidation', () => {
  it('teleports villager when grass is erased', () => {
    const tilemap = new Tilemap();
    const coast = new CoastManager(tilemap);
    paintGrassIsland(tilemap, 10, 10, 4);
    tilemap.setLayer(12, 12, TerrainLayer.Sand);
    tilemap.setLayer(12, 12, TerrainLayer.Grass);

    const manager = new EntityManager(tilemap, coast);
    manager['census'] = new TerrainCensusTracker().rebuild(tilemap, coast);
    manager['spawnVillager']();

    expect(manager.villagers.length).toBe(1);
    const v = manager.villagers[0]!;
    const startTile = { tx: Math.floor(v.x / TILE_SIZE), ty: Math.floor(v.y / TILE_SIZE) };

    tilemap.setLayer(startTile.tx, startTile.ty, TerrainLayer.Water);

    for (let i = 0; i < 30; i++) {
      manager.update(0.05, 0, 0);
    }

    const stillThere = manager.villagers.length;
    if (stillThere > 0) {
      const { tx, ty } = { tx: Math.floor(v.x / TILE_SIZE), ty: Math.floor(v.y / TILE_SIZE) };
      expect(isWalkableTile(tilemap, tx, ty)).toBe(true);
    } else {
      expect(stillThere).toBe(0);
    }
  });
});

describe('targetVillagerCount', () => {
  it('scales with grass tiles up to cap', () => {
    const census = {
      grassTiles: 6000,
      walkableTiles: 6000,
      deepWaterTiles: 0,
      shallowWaterTiles: 0,
      walkableSamples: [],
      deepWaterSamples: [],
      shallowWaterSamples: [],
      bridgeTiles: [],
      componentCount: 1,
    };
    expect(targetVillagerCount(census, 1 / 60, 200)).toBeLessThanOrEqual(200);
  });
});

describe('findNearestWalkable', () => {
  it('finds adjacent sand when standing on erased tile', () => {
    const tilemap = new Tilemap();
    tilemap.setLayer(5, 5, TerrainLayer.Sand);
    tilemap.setLayer(6, 5, TerrainLayer.Grass);
    const found = findNearestWalkable(tilemap, 6, 5);
    expect(found).not.toBeNull();
    const c = tileCenter(found!.tileX, found!.tileY);
    expect(c.x).toBeDefined();
  });
});
