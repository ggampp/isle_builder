import type { Tilemap } from '../world/tilemap.ts';
import { TILE_SIZE } from '../world/constants.ts';
import type { Tool, PreviewTile } from './toolsystem.ts';
import { MIN_RADIUS_TILES, MAX_RADIUS_TILES } from './brush.ts';

export class EraserTool implements Tool {
  radiusTiles = MIN_RADIUS_TILES;
  spacing = 1;

  private readonly tilemap: Tilemap;
  private lastWorld: { x: number; y: number } | null = null;

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
  }

  setRadius(radiusTiles: number): void {
    this.radiusTiles = Math.max(MIN_RADIUS_TILES, Math.min(MAX_RADIUS_TILES, Math.round(radiusTiles)));
  }

  setSpacing(spacing: number): void {
    this.spacing = Math.max(1, Math.min(10, Math.round(spacing)));
  }

  onDown(worldX: number, worldY: number, _layer: number): void {
    this.lastWorld = null;
    this.eraseAt(worldX, worldY);
    this.lastWorld = { x: worldX, y: worldY };
  }

  onDrag(worldX: number, worldY: number, _layer: number): void {
    if (!this.lastWorld) {
      this.eraseAt(worldX, worldY);
      this.lastWorld = { x: worldX, y: worldY };
      return;
    }

    const dx = worldX - this.lastWorld.x;
    const dy = worldY - this.lastWorld.y;
    const distance = Math.hypot(dx, dy);
    
    const step = this.spacing === 1 
      ? Math.max(MIN_RADIUS_TILES, this.radiusTiles) * TILE_SIZE * 0.5
      : this.radiusTiles * TILE_SIZE * (this.spacing - 1);
      
    if (this.spacing > 1 && distance < step) {
      return;
    }

    const steps = Math.max(1, Math.ceil(distance / step));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.eraseAt(this.lastWorld.x + dx * t, this.lastWorld.y + dy * t);
    }

    this.lastWorld = { x: worldX, y: worldY };
  }

  onUp(): void {
    this.lastWorld = null;
  }

  onCancel(): void {
    this.lastWorld = null;
  }

  getPreview(worldX: number, worldY: number, layer: number): PreviewTile[] {
    const tiles: PreviewTile[] = [];
    const centerTileX = Math.floor(worldX / TILE_SIZE);
    const centerTileY = Math.floor(worldY / TILE_SIZE);
    const r = this.radiusTiles;
    const rSq = r * r;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > rSq) continue;
        tiles.push({ x: centerTileX + dx, y: centerTileY + dy, layer });
      }
    }
    return tiles;
  }

  private eraseAt(worldX: number, worldY: number): void {
    const centerTileX = Math.floor(worldX / TILE_SIZE);
    const centerTileY = Math.floor(worldY / TILE_SIZE);
    const r = this.radiusTiles;
    const rSq = r * r;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > rSq) continue;
        this.tilemap.eraseLayer(centerTileX + dx, centerTileY + dy);
      }
    }
  }
}
