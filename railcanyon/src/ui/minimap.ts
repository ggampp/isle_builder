import { WATER_LEVEL, heightAt } from '../world/heightfield.ts';
import { TOWNS } from '../world/towns.ts';
import type { Vec3 } from '../rail/network.ts';

const MAP_SIZE = 152;
const WORLD_HALF = 220;

/** Minimapa: terreno pintado uma vez da heightfield + cidades + linha + trem. */
export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private base: ImageData | null = null;
  private lines: { x: number; y: number }[][] = [];
  private connected = new Set<string>();

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = MAP_SIZE;
    canvas.height = MAP_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('minimap 2d context');
    this.ctx = ctx;
    this.paintBase();
  }

  /** Todas as linhas da malha (principal + desvios). */
  setLines(lines: ReadonlyArray<ReadonlyArray<Vec3>>): void {
    this.lines = lines.map((points) => points.map((p) => this.toMap(p.x, p.z)));
  }

  setConnected(townIds: string[]): void {
    this.connected = new Set(townIds);
  }

  private toMap(x: number, z: number): { x: number; y: number } {
    return {
      x: ((x + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_SIZE,
      y: ((z + WORLD_HALF) / (WORLD_HALF * 2)) * MAP_SIZE,
    };
  }

  private paintBase(): void {
    const img = this.ctx.createImageData(MAP_SIZE, MAP_SIZE);
    for (let py = 0; py < MAP_SIZE; py++) {
      for (let px = 0; px < MAP_SIZE; px++) {
        const x = (px / MAP_SIZE) * WORLD_HALF * 2 - WORLD_HALF;
        const z = (py / MAP_SIZE) * WORLD_HALF * 2 - WORLD_HALF;
        const h = heightAt(x, z);
        let r = 232; let g = 166; let b = 108;
        if (h < WATER_LEVEL + 0.3) { r = 95; g = 211; b = 200; }
        else if (h > 11) { r = 192; g = 80; b = 56; }
        else if (h > 8) { r = 217; g = 126; b = 74; }
        const i = (py * MAP_SIZE + px) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    this.ctx.putImageData(img, 0, 0);
    this.base = this.ctx.getImageData(0, 0, MAP_SIZE, MAP_SIZE);
  }

  update(trainPositions: ReadonlyArray<{ x: number; z: number }>): void {
    const ctx = this.ctx;
    if (this.base) ctx.putImageData(this.base, 0, 0);

    for (const points of this.lines) {
      if (points.length < 2) continue;
      ctx.strokeStyle = 'rgba(74, 52, 34, 0.95)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    for (const town of TOWNS) {
      const p = this.toMap(town.x, town.z);
      ctx.fillStyle = this.connected.has(town.id) ? '#f0a72c' : '#f6ead2';
      ctx.strokeStyle = '#4a3a26';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    for (const position of trainPositions) {
      const t = this.toMap(position.x, position.z);
      ctx.fillStyle = '#2f66c4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
