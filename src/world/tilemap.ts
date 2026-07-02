import { CHUNK_SIZE } from './constants.ts';
import { TerrainLayer } from './layers.ts';

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/** Um bloco de CHUNK_SIZE×CHUNK_SIZE tiles; unidade de re-mesh e culling. */
export class Chunk {
  readonly cx: number;
  readonly cy: number;
  /** Uma camada (0..5) por tile, linearizado como `y * CHUNK_SIZE + x`. */
  readonly layers: Uint8Array;
  dirty = true;

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    this.layers = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  }
}

/**
 * Grid esparso e efetivamente ilimitado: chunks só existem depois de
 * receberem o primeiro tile pintado (`getOrCreateChunk`). Tiles fora de
 * qualquer chunk carregado são implicitamente água (camada 0).
 */
export class Tilemap {
  private chunks = new Map<string, Chunk>();
  public onTileChanged?: (x: number, y: number, oldLayer: number, newLayer: number) => void;

  getChunk(cx: number, cy: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cy));
  }

  allChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  *dirtyChunks(): IterableIterator<Chunk> {
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) yield chunk;
    }
  }

  getLayer(tileX: number, tileY: number): number {
    const cx = Math.floor(tileX / CHUNK_SIZE);
    const cy = Math.floor(tileY / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cy);
    if (!chunk) return 0;
    const lx = tileX - cx * CHUNK_SIZE;
    const ly = tileY - cy * CHUNK_SIZE;
    return chunk.layers[ly * CHUNK_SIZE + lx];
  }

  /** Setter bruto: define a camada exata, sem regras de jogo. Usado por
   * `paintLayer` e por testes que precisam montar um mapa arbitrário. */
  setLayer(tileX: number, tileY: number, layer: number): void {
    const cx = Math.floor(tileX / CHUNK_SIZE);
    const cy = Math.floor(tileY / CHUNK_SIZE);
    const chunk = this.getOrCreateChunk(cx, cy);
    const lx = tileX - cx * CHUNK_SIZE;
    const ly = tileY - cy * CHUNK_SIZE;
    const idx = ly * CHUNK_SIZE + lx;
    const oldLayer = chunk.layers[idx];
    if (oldLayer === layer) return;
    chunk.layers[idx] = layer;
    chunk.dirty = true;
    this.markNeighborDirtyIfEdge(cx, cy, lx, ly);
    if (this.onTileChanged) {
      this.onTileChanged(tileX, tileY, oldLayer, layer);
    }
  }

  /**
   * Operação de pintura (usada pelas ferramentas): só eleva uma camada por
   * vez — grama nunca "pega" direto na água, precisa que já haja areia
   * embaixo (comportamento do vídeo de referência, ver Sprint 02 §3).
   * Descer de camada (ex.: pintar água sobre grama) é sempre permitido.
   * Ponte só sobre água; penhasco sobre areia/grama; trilha sobre grama.
   */
  paintLayer(tileX: number, tileY: number, desiredLayer: number): void {
    const current = this.getLayer(tileX, tileY);

    if (desiredLayer <= TerrainLayer.Water) {
      this.setLayer(tileX, tileY, TerrainLayer.Water);
      return;
    }

    if (desiredLayer === TerrainLayer.Bridge) {
      if (current === TerrainLayer.Water) {
        this.setLayer(tileX, tileY, TerrainLayer.Bridge);
      }
      return;
    }

    if (desiredLayer === TerrainLayer.Cliff) {
      if (current >= TerrainLayer.Sand && current <= TerrainLayer.Grass) {
        this.setLayer(tileX, tileY, TerrainLayer.Cliff);
      }
      return;
    }

    if (desiredLayer > current + 1) return;
    this.setLayer(tileX, tileY, desiredLayer);
  }

  /**
   * Rebaixa a camada atual, respeitando regras especiais de ponte/trilha/penhasco.
   * Utilizado pela borracha.
   */
  eraseLayer(tileX: number, tileY: number): void {
    const current = this.getLayer(tileX, tileY);
    switch (current) {
      case TerrainLayer.Cliff:
        this.setLayer(tileX, tileY, TerrainLayer.Grass);
        break;
      case TerrainLayer.Path:
        this.setLayer(tileX, tileY, TerrainLayer.Grass);
        break;
      case TerrainLayer.Bridge:
        this.setLayer(tileX, tileY, TerrainLayer.Water);
        break;
      default:
        if (current > TerrainLayer.Water) {
          this.setLayer(tileX, tileY, current - 1);
        }
        break;
    }
  }

  /**
   * Remove todos os chunks, voltando tudo para água.
   */
  clear(): void {
    this.chunks.clear();
  }

  private getOrCreateChunk(cx: number, cy: number): Chunk {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  private markDirtyIfExists(cx: number, cy: number): void {
    const chunk = this.getChunk(cx, cy);
    if (chunk) chunk.dirty = true;
  }

  /**
   * Um tile na borda de um chunk influencia a máscara de auto-tiling do
   * tile vizinho do outro lado da fronteira — então aquele chunk também
   * precisa re-mesh mesmo sem nenhum tile seu ter mudado de valor.
   */
  private markNeighborDirtyIfEdge(cx: number, cy: number, lx: number, ly: number): void {
    const atLeft = lx === 0;
    const atRight = lx === CHUNK_SIZE - 1;
    const atTop = ly === 0;
    const atBottom = ly === CHUNK_SIZE - 1;

    if (atLeft) this.markDirtyIfExists(cx - 1, cy);
    if (atRight) this.markDirtyIfExists(cx + 1, cy);
    if (atTop) this.markDirtyIfExists(cx, cy - 1);
    if (atBottom) this.markDirtyIfExists(cx, cy + 1);
    if (atLeft && atTop) this.markDirtyIfExists(cx - 1, cy - 1);
    if (atRight && atTop) this.markDirtyIfExists(cx + 1, cy - 1);
    if (atLeft && atBottom) this.markDirtyIfExists(cx - 1, cy + 1);
    if (atRight && atBottom) this.markDirtyIfExists(cx + 1, cy + 1);
  }
}
