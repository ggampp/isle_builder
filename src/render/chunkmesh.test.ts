import { describe, expect, it } from 'vitest';
import { TerrainLayer } from '../world/layers.ts';
import { Tilemap } from '../world/tilemap.ts';
import { buildLayerGeometry } from './chunkmesh.ts';

function uvBoundsForQuad(uvs: Float32Array, quadIndex: number): { minV: number; maxV: number } {
  const start = quadIndex * 8;
  const values = [uvs[start + 1]!, uvs[start + 3]!, uvs[start + 5]!, uvs[start + 7]!];
  return {
    minV: Math.min(...values),
    maxV: Math.max(...values),
  };
}

describe('buildLayerGeometry', () => {
  it('maps blob atlas rows through CanvasTexture flipY', () => {
    const isolated = new Tilemap();
    isolated.setLayer(0, 0, TerrainLayer.Sand);
    const isolatedChunk = isolated.getChunk(0, 0);
    expect(isolatedChunk).toBeDefined();
    const isolatedGeometry = buildLayerGeometry(isolated, isolatedChunk!, TerrainLayer.Sand);
    expect(isolatedGeometry).not.toBeNull();
    const isolatedUvs = isolatedGeometry!.getAttribute('uv').array as Float32Array;
    expect(uvBoundsForQuad(isolatedUvs, 0)).toEqual({ minV: 15 / 16, maxV: 1 });

    const surrounded = new Tilemap();
    for (let y = 0; y <= 2; y++) {
      for (let x = 0; x <= 2; x++) {
        surrounded.setLayer(x, y, TerrainLayer.Sand);
      }
    }
    const surroundedChunk = surrounded.getChunk(0, 0);
    expect(surroundedChunk).toBeDefined();
    const surroundedGeometry = buildLayerGeometry(surrounded, surroundedChunk!, TerrainLayer.Sand);
    expect(surroundedGeometry).not.toBeNull();
    const surroundedUvs = surroundedGeometry!.getAttribute('uv').array as Float32Array;
    expect(uvBoundsForQuad(surroundedUvs, 4)).toEqual({ minV: 0, maxV: 1 / 16 });
  });
});
