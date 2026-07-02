import { describe, it, expect, beforeEach } from 'vitest';
import { Tilemap } from '../world/tilemap.ts';
import { HistoryManager } from './history.ts';
import { PropMap, createPropUid, resetPropUidCounter } from '../props/propmap.ts';
import { getPropDefinition } from '../props/catalog.ts';
import { canPlaceProp } from '../props/placement.ts';
import { TerrainLayer } from '../world/layers.ts';
import { getCatalogPropCount } from '../props/catalog.ts';

describe('HistoryManager', () => {
  it('undoes and redoes a stroke', () => {
    const tilemap = new Tilemap();
    const propMap = new PropMap();
    const history = new HistoryManager(tilemap, propMap);

    history.beginStroke();
    tilemap.paintLayer(0, 0, 1);
    history.endStroke();

    expect(tilemap.getLayer(0, 0)).toBe(1);
    expect(history.canUndo).toBe(true);

    history.undo();
    expect(tilemap.getLayer(0, 0)).toBe(0);

    history.redo();
    expect(tilemap.getLayer(0, 0)).toBe(1);
  });

  it('handles multiple tiles in a single stroke', () => {
    const tilemap = new Tilemap();
    const propMap = new PropMap();
    const history = new HistoryManager(tilemap, propMap);

    history.beginStroke();
    tilemap.paintLayer(0, 0, 1);
    tilemap.paintLayer(1, 0, 1);
    tilemap.paintLayer(0, 0, 2);
    history.endStroke();

    history.undo();
    expect(tilemap.getLayer(0, 0)).toBe(0);
    expect(tilemap.getLayer(1, 0)).toBe(0);
  });

  it('clear command clears everything and can be undone', () => {
    const tilemap = new Tilemap();
    const propMap = new PropMap();
    const history = new HistoryManager(tilemap, propMap);

    tilemap.paintLayer(5, 5, 1);
    history.clearMap();
    expect(tilemap.getLayer(5, 5)).toBe(0);

    history.undo();
    expect(tilemap.getLayer(5, 5)).toBe(1);
  });

  it('undoes and redoes prop placement', () => {
    resetPropUidCounter();
    const tilemap = new Tilemap();
    tilemap.setLayer(0, 0, TerrainLayer.Grass);
    const propMap = new PropMap();
    const history = new HistoryManager(tilemap, propMap);
    const def = getPropDefinition('flower_red')!;

    history.beginStroke();
    propMap.add({ uid: createPropUid(), defId: def.id, tileX: 0, tileY: 0 }, def);
    history.endStroke();

    expect([...propMap.all()]).toHaveLength(1);

    history.undo();
    expect([...propMap.all()]).toHaveLength(0);

    history.redo();
    expect([...propMap.all()]).toHaveLength(1);
  });
});

describe('prop catalog', () => {
  it('has at least 40 props', () => {
    expect(getCatalogPropCount()).toBeGreaterThanOrEqual(40);
  });
});

describe('canPlaceProp', () => {
  beforeEach(() => resetPropUidCounter());

  it('blocks buildings on water', () => {
    const tilemap = new Tilemap();
    const propMap = new PropMap();
    const house = getPropDefinition('house_red')!;
    const result = canPlaceProp(tilemap, propMap, house, 0, 0, getPropDefinition);
    expect(result.valid).toBe(false);
  });

  it('allows decor on grass', () => {
    const tilemap = new Tilemap();
    tilemap.setLayer(2, 2, TerrainLayer.Grass);
    const propMap = new PropMap();
    const flower = getPropDefinition('flower_red')!;
    const result = canPlaceProp(tilemap, propMap, flower, 2, 2, getPropDefinition);
    expect(result.valid).toBe(true);
  });
});
