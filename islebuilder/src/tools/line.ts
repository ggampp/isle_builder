import type { Tilemap } from '../world/tilemap.ts';
import { TILE_SIZE } from '../world/constants.ts';
import type { Tool, PreviewTile } from './toolsystem.ts';
import { MIN_RADIUS_TILES, MAX_RADIUS_TILES } from './brush.ts';

export class LineTool implements Tool {
  radiusTiles = MIN_RADIUS_TILES;
  private readonly tilemap: Tilemap;
  private startPoint: { x: number; y: number } | null = null;
  private endPoint: { x: number; y: number } | null = null;

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
  }

  setRadius(radiusTiles: number): void {
    this.radiusTiles = Math.max(MIN_RADIUS_TILES, Math.min(MAX_RADIUS_TILES, Math.round(radiusTiles)));
  }

  onDown(worldX: number, worldY: number, _layer: number): void {
    this.startPoint = { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
    this.endPoint = { ...this.startPoint };
  }

  onDrag(worldX: number, worldY: number, _layer: number): void {
    if (!this.startPoint) return;
    this.endPoint = { x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE) };
  }

  onUp(_worldX: number, _worldY: number, layer: number): void {
    if (!this.startPoint || !this.endPoint) return;
    
    // Apply changes
    const points = bresenhamLine(this.startPoint.x, this.startPoint.y, this.endPoint.x, this.endPoint.y);
    for (const p of points) {
      this.paintCircle(p.x, p.y, layer, true);
    }

    this.startPoint = null;
    this.endPoint = null;
  }

  onCancel(): void {
    this.startPoint = null;
    this.endPoint = null;
  }

  getPreview(_worldX: number, _worldY: number, layer: number): PreviewTile[] {
    if (!this.startPoint || !this.endPoint) return [];
    
    const points = bresenhamLine(this.startPoint.x, this.startPoint.y, this.endPoint.x, this.endPoint.y);
    const tiles: PreviewTile[] = [];
    const painted = new Set<string>();

    for (const p of points) {
      const circle = this.getCircleTiles(p.x, p.y, layer);
      for (const t of circle) {
        const key = `${t.x},${t.y}`;
        if (!painted.has(key)) {
          painted.add(key);
          tiles.push(t);
        }
      }
    }

    return tiles;
  }

  private paintCircle(centerTileX: number, centerTileY: number, layer: number, apply: boolean): void {
    const r = this.radiusTiles;
    const rSq = r * r;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > rSq) continue;
        if (apply) {
          this.tilemap.paintLayer(centerTileX + dx, centerTileY + dy, layer);
        }
      }
    }
  }

  private getCircleTiles(centerTileX: number, centerTileY: number, layer: number): PreviewTile[] {
    const r = this.radiusTiles;
    const rSq = r * r;
    const tiles: PreviewTile[] = [];

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > rSq) continue;
        tiles.push({ x: centerTileX + dx, y: centerTileY + dy, layer });
      }
    }
    return tiles;
  }

}

/** Bresenham em grid de tiles; exportado para testes unitários. */
export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}
