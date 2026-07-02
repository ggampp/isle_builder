import type { Tilemap } from '../world/tilemap.ts';
import { TILE_SIZE } from '../world/constants.ts';
import { TerrainLayer } from '../world/layers.ts';
import type { Tool, PreviewTile } from './toolsystem.ts';

export const BUCKET_MAX_FILL_CELLS = 10000;

export interface FloodFillResult {
  cellsFilled: number;
  hitLimit: boolean;
}

/**
 * Flood fill BFS sobre região contígua da camada inicial.
 * Exportado para testes unitários.
 */
export function floodFill(
  tilemap: Tilemap,
  startX: number,
  startY: number,
  targetLayer: number,
  maxCells: number = BUCKET_MAX_FILL_CELLS,
): FloodFillResult {
  const startLayer = tilemap.getLayer(startX, startY);
  if (startLayer === targetLayer) return { cellsFilled: 0, hitLimit: false };

  if (targetLayer === TerrainLayer.Bridge) {
    if (startLayer !== TerrainLayer.Water) return { cellsFilled: 0, hitLimit: false };
  } else if (targetLayer === TerrainLayer.Cliff) {
    if (startLayer < TerrainLayer.Sand || startLayer > TerrainLayer.Grass) {
      return { cellsFilled: 0, hitLimit: false };
    }
  } else if (targetLayer > startLayer + 1) {
    return { cellsFilled: 0, hitLimit: false };
  }

  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);

  let cellsFilled = 0;
  let hitLimit = false;

  while (queue.length > 0 && cellsFilled < maxCells) {
    const { x, y } = queue.shift()!;

    tilemap.paintLayer(x, y, targetLayer);
    cellsFilled++;

    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;
      if (tilemap.getLayer(n.x, n.y) === startLayer) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  if (cellsFilled >= maxCells && queue.length > 0) {
    hitLimit = true;
  }

  return { cellsFilled, hitLimit };
}

export class BucketTool implements Tool {
  private readonly tilemap: Tilemap;
  private readonly onOverflow?: (limit: number) => void;

  constructor(tilemap: Tilemap, onOverflow?: (limit: number) => void) {
    this.tilemap = tilemap;
    this.onOverflow = onOverflow;
  }

  onDown(worldX: number, worldY: number, targetLayer: number): void {
    const startX = Math.floor(worldX / TILE_SIZE);
    const startY = Math.floor(worldY / TILE_SIZE);

    const result = floodFill(this.tilemap, startX, startY, targetLayer);

    if (result.hitLimit) {
      this.onOverflow?.(BUCKET_MAX_FILL_CELLS);
    }
  }

  onDrag(): void {}
  onUp(): void {}
  onCancel(): void {}
  getPreview(): PreviewTile[] { return []; }
}
