import { MAP_H, MAP_W } from '../sim/config.ts';
import { hash } from '../sim/map.ts';
import type { Actor, World } from '../sim/types.ts';
import { TILE_H, TILE_W, worldToScreen } from './iso.ts';
import { SpriteBank } from './sprites.ts';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

type DrawItem = {
  depth: number;
  draw: () => void;
};

export class WorldView {
  readonly sprites: SpriteBank;
  rain: { x: number; y: number; l: number; s: number }[] = [];

  constructor() {
    this.sprites = new SpriteBank();
    for (let i = 0; i < 90; i++) {
      this.rain.push({
        x: Math.random(),
        y: Math.random(),
        l: 8 + Math.random() * 10,
        s: 0.35 + Math.random() * 0.45,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D, world: World, cam: Camera, hover: { gx: number; gy: number } | null): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2f6a9a';
    ctx.fillRect(0, 0, w, h);

    const items: DrawItem[] = [];
    const zoom = cam.zoom;

    const toScreen = (wx: number, wy: number): { x: number; y: number } => {
      const p = worldToScreen(wx - cam.x, wy - cam.y);
      return { x: w / 2 + p.x * zoom, y: h / 2 + p.y * zoom };
    };

    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const s = toScreen(gx, gy);
        if (s.x < -TILE_W * zoom || s.x > w + TILE_W * zoom || s.y < -TILE_H * zoom || s.y > h + TILE_H * zoom) continue;
        const tile = this.sprites.grass[(gx + gy) % 2];
        ctx.drawImage(tile, s.x - (TILE_W / 2) * zoom, s.y, TILE_W * zoom, TILE_H * zoom);
        if (hash(gx, gy, world.seed + 3) < 0.08) {
          const tuft = this.sprites.props.get('tuft');
          if (tuft) ctx.drawImage(tuft, s.x - 8 * zoom, s.y + 4 * zoom, 16 * zoom, 12 * zoom);
        }
      }
    }

    const push = (wx: number, wy: number, draw: () => void): void => {
      items.push({ depth: wx + wy, draw });
    };

    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const node = world.tiles[gy][gx];
        if (!node) continue;
        push(gx + 0.5, gy + 0.5, () => {
          const s = toScreen(gx + 0.5, gy + 0.5);
          if (node.kind === 'tree') {
            const img = this.sprites.props.get(this.sprites.treeVariant(gx, gy));
            if (img) ctx.drawImage(img, s.x - 24 * zoom, s.y - 56 * zoom, 48 * zoom, 64 * zoom);
          } else if (node.kind === 'rock') {
            const img = this.sprites.props.get('rock');
            if (img) ctx.drawImage(img, s.x - 14 * zoom, s.y - 16 * zoom, 28 * zoom, 20 * zoom);
          } else {
            const img = this.sprites.props.get('crystal');
            if (img) ctx.drawImage(img, s.x - 10 * zoom, s.y - 24 * zoom, 20 * zoom, 28 * zoom);
          }
          if (node.hp < node.maxHp) bar(ctx, s.x, s.y - 28 * zoom, node.hp / node.maxHp, zoom);
        });
      }
    }

    for (const b of world.buildings) {
      push(b.gx + b.w / 2, b.gy + b.h / 2, () => {
        const s = toScreen(b.gx + b.w / 2, b.gy + b.h);
        const img = this.sprites.props.get(b.kind);
        if (!img) return;
        const scale = b.kind === 'fortress' ? 1 : b.kind === 'house' ? 0.92 : 1;
        const dw = img.width * zoom * scale;
        const dh = img.height * zoom * scale;
        ctx.drawImage(img, s.x - dw / 2, s.y - dh, dw, dh);
        bar(ctx, s.x, s.y - dh - 4, b.hp / b.maxHp, zoom);
        if (b.kind === 'house' && b.trainLeft > 0) {
          ctx.fillStyle = 'rgba(12,10,8,0.7)';
          ctx.fillRect(s.x - 40 * zoom, s.y - dh - 18 * zoom, 80 * zoom, 12 * zoom);
          ctx.fillStyle = '#f4e4c0';
          ctx.font = `${Math.max(9, 10 * zoom)}px Trebuchet MS, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`treino ${Math.ceil(b.trainLeft)}s`, s.x, s.y - dh - 9 * zoom);
        }
        if (world.time - b.lastHitAt < 1.6 && b.kind === 'wall') {
          ctx.fillStyle = '#8a2020';
          ctx.font = `bold ${Math.max(10, 11 * zoom)}px Trebuchet MS, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('PAREDE SOB ATAQUE!', s.x, s.y - dh - 22 * zoom);
        }
      });
    }

    const drawActor = (u: Actor, extra = 0): void => {
      if (u.hp <= 0) return;
      push(u.x, u.y + extra, () => {
        const s = toScreen(u.x, u.y);
        const img = this.sprites.unit(u.kind, u.facing, u.anim, u.animT);
        const dw = img.width * zoom * (u.kind === 'brute' ? 1.15 : 1);
        const dh = img.height * zoom * (u.kind === 'brute' ? 1.15 : 1);
        if (u.kind === 'hero') {
          ctx.strokeStyle = 'rgba(80,220,120,0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.drawImage(img, s.x - dw / 2, s.y - dh + 2 * zoom, dw, dh);
        bar(ctx, s.x, s.y - dh - 2, u.hp / u.maxHp, zoom, u.kind === 'hero' ? '#e0b04a' : isFoe(u) ? '#c44c3a' : '#6ad05a');
        if (u.kind === 'hero') {
          ctx.fillStyle = '#d8f0c8';
          ctx.font = `bold ${Math.max(10, 11 * zoom)}px Trebuchet MS, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('Warden', s.x, s.y - dh - 12 * zoom);
        }
      });
    };

    drawActor(world.hero, 0.02);
    if (world.pet.hp > 0) drawActor(world.pet, 0.01);
    for (const u of world.units) drawActor(u);

    for (const p of world.projectiles) {
      push(p.x, p.y, () => {
        const s = toScreen(p.x, p.y);
        const img = this.sprites.props.get('bolt');
        if (img) ctx.drawImage(img, s.x - 5 * zoom, s.y - 8 * zoom, 10 * zoom, 10 * zoom);
      });
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    for (const f of world.floaters) {
      const s = toScreen(f.x, f.y);
      ctx.globalAlpha = Math.max(0, 1 - f.age / 0.9);
      ctx.fillStyle = f.kind === 'heal' ? '#8fe08a' : f.kind === 'loot' ? '#e0b04a' : f.kind === 'xp' ? '#c89ae8' : '#f0d0c8';
      ctx.font = `bold ${Math.max(11, 12 * zoom)}px Trebuchet MS, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, s.x, s.y);
      ctx.globalAlpha = 1;
    }

    if (hover && world.selected) {
      const s = toScreen(hover.gx, hover.gy);
      ctx.strokeStyle = 'rgba(255,220,120,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + (TILE_W / 2) * zoom, s.y + (TILE_H / 2) * zoom);
      ctx.lineTo(s.x, s.y + TILE_H * zoom);
      ctx.lineTo(s.x - (TILE_W / 2) * zoom, s.y + (TILE_H / 2) * zoom);
      ctx.closePath();
      ctx.stroke();
    }

    this.drawRain(ctx, w, h, world.time);
  }

  private drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    ctx.strokeStyle = 'rgba(220,236,255,0.28)';
    ctx.lineWidth = 1;
    for (const d of this.rain) {
      const x = ((d.x * w + time * 70 * d.s) % (w + 20)) - 10;
      const y = ((d.y * h + time * 180 * d.s) % (h + 20)) - 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y + d.l);
      ctx.stroke();
    }
  }
}

function isFoe(u: Actor): boolean {
  return u.kind === 'wolf' || u.kind === 'slime' || u.kind === 'brute';
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ratio: number,
  zoom: number,
  color = '#6ad05a',
): void {
  const w = 22 * zoom;
  const h = 3 * zoom;
  ctx.fillStyle = 'rgba(12,10,8,0.75)';
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = ratio < 0.35 ? '#c44c3a' : color;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, ratio)), h);
}
