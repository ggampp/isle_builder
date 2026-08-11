import { TILE_SIZE } from '../world/constants.ts';
import type { Tilemap } from '../world/tilemap.ts';
import type { PropMap } from '../props/propmap.ts';
import { createPropUid, type PlacedProp } from '../props/propmap.ts';
import { getPropDefinition } from '../props/catalog.ts';
import { canPlaceProp } from '../props/placement.ts';
import type { HistoryManager } from '../tools/history.ts';

export class PropPlacementController {
  selectedDefId: string | null = null;
  scatterSpacing = 1;
  private isDown = false;
  private lastTile: { x: number; y: number } | null = null;
  private readonly tilemap: Tilemap;
  private readonly propMap: PropMap;
  private readonly history: HistoryManager;

  constructor(tilemap: Tilemap, propMap: PropMap, history: HistoryManager) {
    this.tilemap = tilemap;
    this.propMap = propMap;
    this.history = history;
  }

  setSelectedProp(defId: string | null): void {
    this.selectedDefId = defId;
  }

  setScatterSpacing(spacing: number): void {
    this.scatterSpacing = Math.max(1, Math.min(10, Math.round(spacing)));
  }

  getPreviewTile(worldX: number, worldY: number): { tileX: number; tileY: number; valid: boolean } | null {
    const def = this.selectedDefId ? getPropDefinition(this.selectedDefId) : undefined;
    if (!def) return null;
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    const result = canPlaceProp(this.tilemap, this.propMap, def, tileX, tileY, getPropDefinition);
    return { tileX, tileY, valid: result.valid };
  }

  update(isAction: boolean, worldX: number, worldY: number): void {
    if (!this.selectedDefId) return;
    const def = getPropDefinition(this.selectedDefId);
    if (!def) return;

    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    if (isAction && !this.isDown) {
      this.isDown = true;
      this.history.beginStroke();
      this.tryPlace(def, tileX, tileY);
      this.lastTile = { x: tileX, y: tileY };
    } else if (isAction && this.isDown) {
      if (def.scatter && this.lastTile) {
        const dist = Math.hypot(tileX - this.lastTile.x, tileY - this.lastTile.y);
        if (dist >= this.scatterSpacing) {
          this.tryPlace(def, tileX, tileY);
          this.lastTile = { x: tileX, y: tileY };
        }
      }
    } else if (!isAction && this.isDown) {
      this.isDown = false;
      this.lastTile = null;
      this.history.endStroke();
    }
  }

  tryRemoveAt(worldX: number, worldY: number): boolean {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    const prop = this.propMap.findAt(tileX, tileY, getPropDefinition);
    if (!prop) return false;
    const def = getPropDefinition(prop.defId);
    if (!def) return false;

    this.history.beginStroke();
    this.propMap.remove(prop.uid, def);
    this.history.endStroke();
    return true;
  }

  private tryPlace(def: NonNullable<ReturnType<typeof getPropDefinition>>, tileX: number, tileY: number): void {
    this.placeOne(def, tileX, tileY);

    // Props de scatter caem em aglomerado (1–2 vizinhos com jitter) em vez de
    // um item isolado por passo — aproxima do adensamento da referência
    // (jogo_exemplo.png) sem exigir dezenas de passadas do usuário.
    if (def.scatter) {
      const extras = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < extras; i++) {
        const ox = tileX + Math.floor(Math.random() * 5) - 2;
        const oy = tileY + Math.floor(Math.random() * 5) - 2;
        if (ox === tileX && oy === tileY) continue;
        this.placeOne(def, ox, oy);
      }
    }
  }

  private placeOne(def: NonNullable<ReturnType<typeof getPropDefinition>>, tileX: number, tileY: number): void {
    const check = canPlaceProp(this.tilemap, this.propMap, def, tileX, tileY, getPropDefinition);
    if (!check.valid) return;

    // Variação visual só para o que é orgânico — construções/utensílios
    // colocados deliberadamente ficam uniformes.
    const organic = def.category === 'vegetation' || def.category === 'decor';
    const placed: PlacedProp = {
      uid: createPropUid(),
      defId: def.id,
      tileX,
      tileY,
      ...(organic
        ? { scale: 0.85 + Math.random() * 0.35, flip: Math.random() < 0.5 }
        : {}),
    };
    this.propMap.add(placed, def);
  }
}
