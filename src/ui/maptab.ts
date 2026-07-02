import type { Tilemap } from '../world/tilemap.ts';
import { CHUNK_SIZE, TILE_SIZE } from '../world/constants.ts';
import { TerrainLayer } from '../world/layers.ts';
import { computeLandBounds, countIslands } from '../world/landBounds.ts';

export interface CameraView {
  x: number;
  y: number;
  halfViewWidth: number;
  halfViewHeight: number;
}

export interface MapTabCallbacks {
  onCenterCamera: () => void;
  onSaveMapImage: () => void;
  onNavigateCamera: (worldX: number, worldY: number) => void;
  getVillagerCount: () => number;
}

interface MapTransform {
  minTileX: number;
  minTileY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  widthTiles: number;
  heightTiles: number;
}

export class MapTab {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private transform: MapTransform | null = null;

  private statsIslands: HTMLElement;
  private statsTiles: HTMLElement;
  private statsVillagers: HTMLElement;

  private host: HTMLDivElement;
  private callbacks: MapTabCallbacks;
  private tilemap: Tilemap;

  constructor(host: HTMLDivElement, callbacks: MapTabCallbacks, tilemap: Tilemap) {
    this.host = host;
    this.callbacks = callbacks;
    this.tilemap = tilemap;
    this.host.innerHTML = '';

    const mapTitle = document.createElement('div');
    mapTitle.className = 'sec-title';
    mapTitle.textContent = 'MINIMAPA';
    this.host.appendChild(mapTitle);

    const minimapWrap = document.createElement('div');
    minimapWrap.className = 'minimap-wrap';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 300;
    this.canvas.height = 220;
    this.ctx = this.canvas.getContext('2d');

    this.canvas.addEventListener('click', (e) => this.handleClick(e));

    const hint = document.createElement('div');
    hint.className = 'minimap-hint';
    hint.textContent = 'Clique para navegar · retângulo = viewport';

    minimapWrap.append(this.canvas, hint);
    this.host.appendChild(minimapWrap);

    const statsRow = document.createElement('div');
    statsRow.className = 'stats';

    this.statsIslands = this.createStatBox(statsRow, 'ILHAS');
    this.statsTiles = this.createStatBox(statsRow, 'TILES DE TERRA');
    this.statsVillagers = this.createStatBox(statsRow, 'ALDEÕES');

    this.host.appendChild(statsRow);

    const centerBtn = document.createElement('button');
    centerBtn.className = 'pill-btn blue';
    centerBtn.textContent = 'Centralizar na ilha';
    centerBtn.addEventListener('click', () => callbacks.onCenterCamera());

    const saveBtn = document.createElement('button');
    saveBtn.className = 'pill-btn purple';
    saveBtn.innerHTML = `Salvar imagem do mapa<small>PNG em alta resolução, sem UI</small>`;
    saveBtn.addEventListener('click', () => callbacks.onSaveMapImage());

    this.host.append(centerBtn, saveBtn);
  }

  private createStatBox(parent: HTMLElement, label: string): HTMLElement {
    const stat = document.createElement('div');
    stat.className = 'stat';

    const val = document.createElement('b');
    val.textContent = '0';

    const span = document.createElement('span');
    span.textContent = label;

    stat.append(val, span);
    parent.appendChild(stat);
    return val;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.transform) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
    const tileX = (sx - this.transform.offsetX) / this.transform.scale;
    const tileY = (sy - this.transform.offsetY) / this.transform.scale;
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.callbacks.onNavigateCamera(worldX, worldY);
  }

  public update(camera?: CameraView): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#2e63a4';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const bounds = computeLandBounds(this.tilemap);
    if (!bounds) {
      this.transform = null;
      this.updateStats(0, 0);
      return;
    }

    const width = bounds.maxTileX - bounds.minTileX + 1;
    const height = bounds.maxTileY - bounds.minTileY + 1;
    const padding = 10;

    const scale = Math.min(
      (this.canvas.width - padding * 2) / width,
      (this.canvas.height - padding * 2) / height,
    );

    const offsetX = (this.canvas.width - width * scale) / 2 - bounds.minTileX * scale;
    const offsetY = (this.canvas.height - height * scale) / 2 - bounds.minTileY * scale;

    this.transform = {
      minTileX: bounds.minTileX,
      minTileY: bounds.minTileY,
      scale,
      offsetX,
      offsetY,
      widthTiles: width,
      heightTiles: height,
    };

    const colors: Record<number, string> = {
      [TerrainLayer.Sand]: '#e7d29a',
      [TerrainLayer.Grass]: '#79c15c',
      [TerrainLayer.Path]: '#c8a867',
      [TerrainLayer.Bridge]: '#8a5a33',
      [TerrainLayer.Cliff]: '#9e9e9e',
    };

    for (const chunk of this.tilemap.allChunks()) {
      for (let i = 0; i < chunk.layers.length; i++) {
        const layer = chunk.layers[i];
        if (layer > TerrainLayer.Water) {
          const lx = i % CHUNK_SIZE;
          const ly = Math.floor(i / CHUNK_SIZE);
          const tx = chunk.cx * CHUNK_SIZE + lx;
          const ty = chunk.cy * CHUNK_SIZE + ly;

          this.ctx.fillStyle = colors[layer] ?? '#ff00ff';
          this.ctx.fillRect(
            Math.floor(tx * scale + offsetX),
            Math.floor(ty * scale + offsetY),
            Math.ceil(scale),
            Math.ceil(scale),
          );
        }
      }
    }

    if (camera && this.transform) {
      const left = (camera.x - camera.halfViewWidth) / TILE_SIZE;
      const right = (camera.x + camera.halfViewWidth) / TILE_SIZE;
      const topTile = (camera.y + camera.halfViewHeight) / TILE_SIZE;
      const bottomTile = (camera.y - camera.halfViewHeight) / TILE_SIZE;

      const rx = left * scale + offsetX;
      const ry = bottomTile * scale + offsetY;
      const rw = (right - left) * scale;
      const rh = (topTile - bottomTile) * scale;

      this.ctx.strokeStyle = '#ffd23f';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(rx, ry, rw, rh);
      this.ctx.fillStyle = 'rgba(255, 210, 63, 0.12)';
      this.ctx.fillRect(rx, ry, rw, rh);
    }

    const islandsCount = countIslands(this.tilemap);
    this.updateStats(islandsCount, bounds.landTileCount);
  }

  private updateStats(islands: number, tiles: number): void {
    this.statsIslands.textContent = islands.toString();
    this.statsTiles.textContent = tiles.toLocaleString('pt-BR');
    this.statsVillagers.textContent = this.callbacks.getVillagerCount().toLocaleString('pt-BR');
  }
}
