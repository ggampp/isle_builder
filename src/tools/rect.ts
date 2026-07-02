import type { Tilemap } from '../world/tilemap.ts';
import { TILE_SIZE } from '../world/constants.ts';
import type { Tool, PreviewTile } from './toolsystem.ts';

export class RectTool implements Tool {
  private readonly tilemap: Tilemap;
  private startPoint: { x: number; y: number } | null = null;
  private endPoint: { x: number; y: number } | null = null;

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
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
    
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.tilemap.paintLayer(x, y, layer);
      }
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
    return filledRectTiles(this.startPoint.x, this.startPoint.y, this.endPoint.x, this.endPoint.y, layer);
  }
}

/** Tiles inclusivos de um retângulo preenchido; exportado para testes unitários. */
export function filledRectTiles(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  layer: number,
): PreviewTile[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  const tiles: PreviewTile[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push({ x, y, layer });
    }
  }
  return tiles;
}
