import type { Tilemap } from '../world/tilemap.ts';
import { TILE_SIZE } from '../world/constants.ts';
import type { Tool, PreviewTile } from './toolsystem.ts';

export class DropperTool implements Tool {
  private readonly tilemap: Tilemap;
  private readonly onSelectLayer: (layer: number) => void;

  constructor(tilemap: Tilemap, onSelectLayer: (layer: number) => void) {
    this.tilemap = tilemap;
    this.onSelectLayer = onSelectLayer;
  }

  onDown(worldX: number, worldY: number, _layer: number): void {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    const layer = this.tilemap.getLayer(tileX, tileY);
    this.onSelectLayer(layer);
  }

  onDrag(worldX: number, worldY: number, _layer: number): void {
    this.onDown(worldX, worldY, _layer);
  }

  onUp(): void {}
  onCancel(): void {}
  getPreview(): PreviewTile[] { return []; }
}
