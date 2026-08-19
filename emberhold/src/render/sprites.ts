import type { Anim, Facing, UnitKind } from '../sim/types.ts';
import { canvas, ctx2d, ellipse, px, stamp } from './paint.ts';
import { TILE_H, TILE_W } from './iso.ts';

export type PropKind =
  | 'grass'
  | 'tuft'
  | 'tree-pine'
  | 'tree-round'
  | 'tree-autumn'
  | 'tree-bloom'
  | 'rock'
  | 'crystal'
  | 'wall'
  | 'tower'
  | 'house'
  | 'fortress'
  | 'bolt'
  | 'spark'
  | 'shadow';

const SKIN = '#f0c8a2';
const BOOT = '#3a2418';

function bob(anim: Anim, frame: number): number {
  if (anim === 'walk') return frame % 2 === 1 ? -1 : 0;
  if (anim === 'idle') return frame === 1 ? -1 : 0;
  if (anim === 'attack' || anim === 'chop' || anim === 'repair') return frame === 1 ? 1 : 0;
  return 0;
}

function stride(anim: Anim, frame: number): { l: number; r: number } {
  if (anim !== 'walk') return { l: 0, r: 0 };
  if (frame === 1) return { l: 2, r: -1 };
  if (frame === 3) return { l: -1, r: 2 };
  return { l: 0, r: 0 };
}

function armSwing(anim: Anim, frame: number, side: 'l' | 'r'): number {
  if (anim === 'walk') {
    const s = stride(anim, frame);
    return side === 'l' ? -s.l : -s.r;
  }
  if (anim === 'attack' || anim === 'chop' || anim === 'repair') {
    if (frame === 0) return side === 'r' ? -4 : 1;
    if (frame === 1) return side === 'r' ? 5 : -1;
    return side === 'r' ? 2 : 0;
  }
  return 0;
}

function humanoid(
  w: number,
  h: number,
  facing: Facing,
  anim: Anim,
  frame: number,
  pal: Record<string, string>,
  hat: string[],
  tool: 'pick' | 'sword' | 'hammer' | 'none',
): HTMLCanvasElement {
  const c = canvas(w, h);
  const ctx = ctx2d(c);
  const flip = facing === 'sw' || facing === 'nw';
  const back = facing === 'ne' || facing === 'nw';
  const yb = bob(anim, frame);
  const st = stride(anim, frame);
  const ox = Math.floor(w / 2) - 8;
  const oy = h - 28 + yb;

  ellipse(ctx, w / 2, h - 4, 8, 3, 'rgba(20,16,12,0.28)');

  const bootL = ox + 4 + (flip ? -st.r : st.l);
  const bootR = ox + 9 + (flip ? -st.l : st.r);
  px(ctx, bootL, oy + 22, 4, 3, BOOT);
  px(ctx, bootR, oy + 22, 4, 3, BOOT);
  px(ctx, ox + 5, oy + 16, 3, 7, pal.pant);
  px(ctx, ox + 9, oy + 16, 3, 7, pal.pant);

  const body: string[] = back
    ? [
        '.rrrrrrrr.',
        'rrrrrrrrrr',
        'rr.rrrr.rr',
        'rrrrrrrrrr',
        '.rrggggrr.',
        '.rrrrrrrr.',
        '..rrrrrr..',
      ]
    : [
        '.rrrrrrrr.',
        'rrssssssrr',
        'rrs.ss.srr',
        'rrssssssrr',
        '.rrggggrr.',
        '.rrrrrrrr.',
        '..r....r..',
      ];
  stamp(ctx, ox, oy + 9, body, { r: pal.robe, s: SKIN, g: pal.gold, '.': '' }, flip);

  const armY = oy + 11;
  const lSwing = armSwing(anim, frame, 'l');
  const rSwing = armSwing(anim, frame, 'r');
  px(ctx, ox + 1, armY + lSwing, 3, 7, pal.sleeve);
  px(ctx, ox + 13, armY + rSwing, 3, 7, pal.sleeve);
  px(ctx, ox + 1, armY + 6 + lSwing, 3, 3, SKIN);
  px(ctx, ox + 13, armY + 6 + rSwing, 3, 3, SKIN);

  stamp(ctx, ox, oy + (back ? 1 : 0), hat, pal, flip);

  if (!back) {
    px(ctx, ox + 6, oy + 12, 1, 1, '#2a2018');
    px(ctx, ox + 10, oy + 12, 1, 1, '#2a2018');
    if (anim !== 'attack') px(ctx, ox + 7, oy + 14, 3, 1, '#c07070');
  }

  drawTool(ctx, ox, oy, flip, rSwing, tool, anim, frame);
  return c;
}

function drawTool(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  flip: boolean,
  swing: number,
  tool: 'pick' | 'sword' | 'hammer' | 'none',
  anim: Anim,
  frame: number,
): void {
  if (tool === 'none') return;
  const handX = flip ? ox + 2 : ox + 14;
  const handY = oy + 17 + swing;
  const raised = anim === 'attack' || anim === 'chop' || anim === 'repair' ? frame : 0;
  if (tool === 'pick') {
    const ang = raised === 1 ? -1 : raised === 0 ? -4 : 2;
    px(ctx, handX, handY + ang, 2, 8, '#8b5a2b');
    px(ctx, handX - 3, handY + ang - 1, 8, 3, '#c9d4dc');
    px(ctx, handX - 4, handY + ang, 2, 2, '#a8b4bc');
  } else if (tool === 'sword') {
    const up = raised === 1 ? -10 : -6;
    px(ctx, handX, handY + up, 2, 12, '#d8e0e8');
    px(ctx, handX - 2, handY + up + 10, 6, 2, '#e0b04a');
  } else if (tool === 'hammer') {
    const up = raised === 1 ? -6 : -2;
    px(ctx, handX, handY + up, 2, 8, '#6b3e22');
    px(ctx, handX - 2, handY + up - 2, 7, 4, '#8a8f98');
  }
}

function hatWizard(): string[] {
  return [
    '....hhhh....',
    '...hhhhhh...',
    '..hhHHHHHh..',
    '.hhHHhhHHhh.',
    'hhhhhhhhhhhh',
    '...s....s...',
    '...ssssss...',
  ];
}

function hatStraw(): string[] {
  return [
    '............',
    '...yyyyyy...',
    '..yyyyyyyy..',
    '.yyyyyyyyyy.',
    'yyyyyyyyyyyy',
    '...s....s...',
    '...ssssss...',
  ];
}

function hatHelm(): string[] {
  return [
    '............',
    '...MMMMMM...',
    '..MMmmmmMM..',
    '.MMmmmmmmMM.',
    'MMmm....mmMM',
    '...s....s...',
    '...ssssss...',
  ];
}

function fox(
  facing: Facing,
  anim: Anim,
  frame: number,
): HTMLCanvasElement {
  const c = canvas(28, 22);
  const ctx = ctx2d(c);
  const flip = facing === 'sw' || facing === 'nw';
  const yb = bob(anim, frame);
  const run = anim === 'walk' || anim === 'attack' ? (frame % 2 === 0 ? 1 : -1) : 0;
  ellipse(ctx, 14, 19, 8, 3, 'rgba(20,16,12,0.28)');
  const pal = { f: '#e07030', d: '#b84818', t: '#ffb060', e: '#1a120c', w: '#fff4e8', '.': '' };
  const body = [
    '....ffff....',
    '...ffffff...',
    '..ffffffff..',
    '.ffffffffff.',
    'fffffdffffff',
    '.fffddffff..',
    '..ff..ff....',
  ];
  stamp(ctx, 6, 5 + yb, body, pal, flip);
  px(ctx, flip ? 8 : 18, 4 + yb, 2, 3, '#e07030');
  px(ctx, flip ? 6 : 20, 3 + yb, 2, 3, '#e07030');
  px(ctx, flip ? 18 : 8, 7 + yb, 1, 1, '#1a120c');
  const tailX = flip ? 20 : 2;
  px(ctx, tailX, 8 + yb + run, 5, 3, '#ff9040');
  px(ctx, tailX + (flip ? 4 : -1), 7 + yb + run, 3, 3, '#ffe080');
  return c;
}

function wolf(
  facing: Facing,
  anim: Anim,
  frame: number,
): HTMLCanvasElement {
  const c = canvas(32, 22);
  const ctx = ctx2d(c);
  const flip = facing === 'sw' || facing === 'nw';
  const yb = bob(anim, frame);
  const run = anim === 'walk' || anim === 'attack' ? (frame % 2 === 0 ? 1 : 0) : 0;
  ellipse(ctx, 16, 19, 9, 3, 'rgba(20,16,12,0.3)');
  const pal = { w: '#6b5344', d: '#4a382e', e: '#1a120c', n: '#c8b8a8', '.': '' };
  stamp(
    ctx,
    4,
    6 + yb,
    [
      '......ww......',
      '....wwwwww....',
      '...wwwwwwww...',
      '..wwwddwwwww..',
      '.wwwwwwwwwwww.',
      'wwww....wwww..',
      '.w.w....w.w...',
    ],
    pal,
    flip,
  );
  px(ctx, flip ? 8 : 22, 8 + yb, 1, 1, '#1a120c');
  px(ctx, flip ? 6 : 24, 10 + yb + run, 3, 2, '#4a382e');
  return c;
}

function slimeBody(frame: number, color: string): HTMLCanvasElement {
  const c = canvas(22, 18);
  const ctx = ctx2d(c);
  const squash = 1 + (frame % 2 === 0 ? 0.08 : -0.06);
  ellipse(ctx, 11, 16, 8, 2.4, 'rgba(20,16,12,0.25)');
  ctx.save();
  ctx.translate(11, 12);
  ctx.scale(squash, 1 / squash);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a18';
  ctx.fillRect(-3, -1, 2, 2);
  ctx.fillRect(2, -1, 2, 2);
  ctx.restore();
  return c;
}

function bruteBody(facing: Facing, anim: Anim, frame: number): HTMLCanvasElement {
  const c = canvas(36, 36);
  const ctx = ctx2d(c);
  const flip = facing === 'sw' || facing === 'nw';
  const yb = bob(anim, frame);
  ellipse(ctx, 18, 33, 11, 3.5, 'rgba(20,16,12,0.32)');
  const pal = { r: '#5c5e68', d: '#3e4048', m: '#557a47', e: '#70e2e8', '.': '' };
  stamp(
    ctx,
    6,
    4 + yb,
    [
      '....rrrrrr....',
      '...rrrrrrrr...',
      '..rrr....rrr..',
      '..rr.ee.ee.rr.',
      '.rrrrrrrrrrrr.',
      'rrrrrmeemrrrrr',
      'rrrrrrrrrrrrrr',
      '.rrr......rrr.',
      '.rd........dr.',
      '.dd........dd.',
    ],
    pal,
    flip,
  );
  return c;
}

function grassTile(): HTMLCanvasElement {
  const c = canvas(TILE_W, TILE_H);
  const ctx = ctx2d(c);
  ctx.beginPath();
  ctx.moveTo(TILE_W / 2, 0);
  ctx.lineTo(TILE_W, TILE_H / 2);
  ctx.lineTo(TILE_W / 2, TILE_H);
  ctx.lineTo(0, TILE_H / 2);
  ctx.closePath();
  ctx.fillStyle = '#4f9a3a';
  ctx.fill();
  ctx.strokeStyle = '#458a32';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#5aaa44';
  for (const [x, y] of [[20, 10], [40, 14], [28, 18], [16, 16], [48, 12]]) {
    px(ctx, x, y, 2, 1, '#5aaa44');
  }
  return c;
}

function grassTuft(): HTMLCanvasElement {
  const c = canvas(16, 12);
  const ctx = ctx2d(c);
  px(ctx, 4, 6, 2, 5, '#3f8a2c');
  px(ctx, 7, 4, 2, 7, '#4f9a3a');
  px(ctx, 10, 6, 2, 5, '#2f7a24');
  px(ctx, 6, 5, 1, 4, '#6aba4c');
  return c;
}

function treeCanopy(kind: 'pine' | 'round' | 'autumn' | 'bloom'): HTMLCanvasElement {
  const c = canvas(48, 64);
  const ctx = ctx2d(c);
  ellipse(ctx, 24, 58, 10, 4, 'rgba(20,16,12,0.3)');
  px(ctx, 22, 36, 5, 22, '#6b3e22');
  px(ctx, 23, 38, 3, 18, '#8b5a2b');
  if (kind === 'pine') {
    const layers: Array<[number, number, number, string]> = [
      [18, 8, 12, '#1f6a32'],
      [14, 16, 20, '#2a8040'],
      [10, 26, 28, '#247238'],
    ];
    for (const [x, y, w, col] of layers) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(x + w, y + 14);
      ctx.lineTo(x, y + 14);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const color = kind === 'autumn' ? '#d06030' : kind === 'bloom' ? '#e890b8' : '#2f8a44';
    const dark = kind === 'autumn' ? '#a04020' : kind === 'bloom' ? '#c06090' : '#1f6a32';
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(24, 24, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(22, 22, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'bloom') {
      ctx.fillStyle = '#fff0f6';
      ctx.fillRect(16, 16, 2, 2);
      ctx.fillRect(28, 20, 2, 2);
      ctx.fillRect(20, 26, 2, 2);
    }
    if (kind === 'autumn') {
      ctx.fillStyle = '#e8b040';
      ctx.fillRect(18, 18, 2, 2);
      ctx.fillRect(30, 24, 2, 2);
    }
  }
  return c;
}

function rockSprite(): HTMLCanvasElement {
  const c = canvas(28, 20);
  const ctx = ctx2d(c);
  ellipse(ctx, 14, 17, 9, 3, 'rgba(20,16,12,0.28)');
  const pal = { r: '#7a7e88', d: '#5a5e68', h: '#9aa0aa', '.': '' };
  stamp(
    ctx,
    2,
    2,
    [
      '...hhhhh....',
      '..hhrrrrhh..',
      '.hrrrrrrrrh.',
      'hrrrrddrrrrh',
      '.rrrddddrr.',
      '..rrddddrr..',
    ],
    pal,
  );
  return c;
}

function crystalSprite(): HTMLCanvasElement {
  const c = canvas(20, 28);
  const ctx = ctx2d(c);
  ellipse(ctx, 10, 25, 6, 2.4, 'rgba(40,80,120,0.28)');
  ctx.fillStyle = '#3a88c8';
  ctx.beginPath();
  ctx.moveTo(10, 2);
  ctx.lineTo(18, 16);
  ctx.lineTo(10, 24);
  ctx.lineTo(2, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8fd0ff';
  ctx.beginPath();
  ctx.moveTo(10, 4);
  ctx.lineTo(14, 14);
  ctx.lineTo(10, 18);
  ctx.closePath();
  ctx.fill();
  return c;
}

function isoPrism(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  tw: number,
  td: number,
  th: number,
  top: string,
  left: string,
  right: string,
): void {
  const hw = tw / 2;
  const hd = td / 2;
  const topY = footY - th;
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx + hw, topY + hd / 2);
  ctx.lineTo(cx, topY + hd);
  ctx.lineTo(cx - hw, topY + hd / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(cx - hw, topY + hd / 2);
  ctx.lineTo(cx, topY + hd);
  ctx.lineTo(cx, footY);
  ctx.lineTo(cx - hw, footY - hd / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(cx + hw, topY + hd / 2);
  ctx.lineTo(cx, topY + hd);
  ctx.lineTo(cx, footY);
  ctx.lineTo(cx + hw, footY - hd / 2);
  ctx.closePath();
  ctx.fill();
}

function wallSprite(): HTMLCanvasElement {
  const c = canvas(TILE_W, 48);
  const ctx = ctx2d(c);
  isoPrism(ctx, 32, 44, 56, 28, 18, '#c47a3a', '#8a4e22', '#a45c28');
  ctx.fillStyle = '#6b3e18';
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 7;
    ctx.fillRect(x, 18, 3, 16);
    ctx.fillStyle = '#d8a060';
    ctx.fillRect(x, 16, 3, 4);
    ctx.fillStyle = '#6b3e18';
  }
  return c;
}

function towerSprite(): HTMLCanvasElement {
  const c = canvas(56, 88);
  const ctx = ctx2d(c);
  isoPrism(ctx, 28, 78, 36, 20, 44, '#8a5a32', '#5a3a20', '#6e4628');
  ctx.fillStyle = '#3a7ab0';
  ctx.beginPath();
  ctx.moveTo(28, 8);
  ctx.lineTo(50, 28);
  ctx.lineTo(28, 36);
  ctx.lineTo(6, 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a5a88';
  ctx.beginPath();
  ctx.moveTo(28, 36);
  ctx.lineTo(50, 28);
  ctx.lineTo(50, 34);
  ctx.lineTo(28, 42);
  ctx.closePath();
  ctx.fill();
  px(ctx, 24, 48, 8, 10, '#1a1a18');
  px(ctx, 26, 50, 4, 6, '#c8e4ff');
  return c;
}

function houseSprite(): HTMLCanvasElement {
  const c = canvas(80, 80);
  const ctx = ctx2d(c);
  isoPrism(ctx, 40, 72, 64, 36, 28, '#c4a078', '#7a5a3a', '#8a6a44');
  ctx.fillStyle = '#4a3a32';
  ctx.beginPath();
  ctx.moveTo(40, 12);
  ctx.lineTo(72, 36);
  ctx.lineTo(40, 48);
  ctx.lineTo(8, 36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2a24';
  ctx.beginPath();
  ctx.moveTo(40, 48);
  ctx.lineTo(72, 36);
  ctx.lineTo(72, 42);
  ctx.lineTo(40, 54);
  ctx.closePath();
  ctx.fill();
  px(ctx, 36, 50, 8, 12, '#5a3a22');
  px(ctx, 22, 46, 6, 6, '#8fd0ff');
  px(ctx, 52, 46, 6, 6, '#8fd0ff');
  return c;
}

function fortressSprite(): HTMLCanvasElement {
  const c = canvas(110, 110);
  const ctx = ctx2d(c);
  isoPrism(ctx, 55, 100, 90, 50, 40, '#8a9098', '#5a6068', '#6a7078');
  isoPrism(ctx, 28, 70, 28, 18, 36, '#9aa0a8', '#4a5058', '#5a6068');
  isoPrism(ctx, 82, 70, 28, 18, 36, '#9aa0a8', '#4a5058', '#5a6068');
  ctx.fillStyle = '#3a2a24';
  ctx.beginPath();
  ctx.moveTo(55, 28);
  ctx.lineTo(92, 52);
  ctx.lineTo(55, 64);
  ctx.lineTo(18, 52);
  ctx.closePath();
  ctx.fill();
  px(ctx, 50, 72, 10, 16, '#2a2018');
  px(ctx, 24, 48, 5, 6, '#c45c38');
  px(ctx, 78, 48, 5, 6, '#c45c38');
  px(ctx, 52, 44, 6, 6, '#8fd0ff');
  return c;
}

function boltSprite(): HTMLCanvasElement {
  const c = canvas(10, 10);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#ffd060';
  ctx.beginPath();
  ctx.arc(5, 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff4c8';
  ctx.beginPath();
  ctx.arc(5, 5, 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

const FACINGS: Facing[] = ['se', 'sw', 'ne', 'nw'];
const ANIMS: Anim[] = ['idle', 'walk', 'attack', 'chop', 'repair'];

function framesFor(anim: Anim): number {
  if (anim === 'walk') return 4;
  if (anim === 'idle') return 2;
  return 3;
}

function palFor(kind: UnitKind): Record<string, string> {
  if (kind === 'hero') {
    return { robe: '#2a7a62', pant: '#1e5344', gold: '#e0b04a', sleeve: '#1f5a4a', h: '#1f3d4a', H: '#2a5568', s: SKIN, y: '#e0b04a', M: '#1f3d4a', m: '#2a5568' };
  }
  if (kind === 'worker') {
    return { robe: '#8a5a32', pant: '#5a3a20', gold: '#c09040', sleeve: '#6a4428', h: '#c8a040', H: '#e0c060', s: SKIN, y: '#d4b04a', M: '#c8a040', m: '#e0c060' };
  }
  return { robe: '#8a9098', pant: '#4a5058', gold: '#c45c38', sleeve: '#6a7078', h: '#c8d0d8', H: '#e8eef4', s: SKIN, y: '#c8d0d8', M: '#c8d0d8', m: '#9aa0a8' };
}

function hatFor(kind: UnitKind): string[] {
  if (kind === 'hero') return hatWizard();
  if (kind === 'worker') return hatStraw();
  return hatHelm();
}

function toolFor(kind: UnitKind, anim: Anim): 'pick' | 'sword' | 'hammer' | 'none' {
  if (kind === 'hero') return anim === 'repair' ? 'hammer' : 'pick';
  if (kind === 'worker') return anim === 'repair' ? 'hammer' : 'pick';
  if (kind === 'soldier') return 'sword';
  return 'none';
}

export class SpriteBank {
  private units = new Map<string, HTMLCanvasElement>();
  readonly props = new Map<PropKind, HTMLCanvasElement>();
  readonly grass: HTMLCanvasElement[] = [];

  constructor() {
    this.props.set('grass', grassTile());
    this.props.set('tuft', grassTuft());
    this.props.set('tree-pine', treeCanopy('pine'));
    this.props.set('tree-round', treeCanopy('round'));
    this.props.set('tree-autumn', treeCanopy('autumn'));
    this.props.set('tree-bloom', treeCanopy('bloom'));
    this.props.set('rock', rockSprite());
    this.props.set('crystal', crystalSprite());
    this.props.set('wall', wallSprite());
    this.props.set('tower', towerSprite());
    this.props.set('house', houseSprite());
    this.props.set('fortress', fortressSprite());
    this.props.set('bolt', boltSprite());
    this.grass.push(grassTile());
    const g2 = grassTile();
    const g2ctx = ctx2d(g2);
    g2ctx.fillStyle = '#458a32';
    g2ctx.fillRect(30, 12, 2, 1);
    this.grass.push(g2);

    for (const kind of ['hero', 'worker', 'soldier'] as UnitKind[]) {
      for (const facing of FACINGS) {
        for (const anim of ANIMS) {
          const n = framesFor(anim);
          for (let f = 0; f < n; f++) {
            const key = `${kind}:${facing}:${anim}:${f}`;
            this.units.set(
              key,
              humanoid(32, 40, facing, anim, f, palFor(kind), hatFor(kind), toolFor(kind, anim)),
            );
          }
        }
      }
    }
    for (const kind of ['pet', 'wolf'] as UnitKind[]) {
      for (const facing of FACINGS) {
        for (const anim of ANIMS) {
          const n = framesFor(anim);
          for (let f = 0; f < n; f++) {
            const key = `${kind}:${facing}:${anim}:${f}`;
            this.units.set(key, kind === 'pet' ? fox(facing, anim, f) : wolf(facing, anim, f));
          }
        }
      }
    }
    for (const facing of FACINGS) {
      for (const anim of ANIMS) {
        const n = framesFor(anim);
        for (let f = 0; f < n; f++) {
          this.units.set(`brute:${facing}:${anim}:${f}`, bruteBody(facing, anim, f));
          this.units.set(`slime:${facing}:${anim}:${f}`, slimeBody(f, '#5ebd5a'));
        }
      }
    }
  }

  unit(kind: UnitKind, facing: Facing, anim: Anim, t: number): HTMLCanvasElement {
    const n = framesFor(anim);
    const fps = anim === 'walk' ? 8 : anim === 'idle' ? 2.4 : 9;
    const f = Math.floor(t * fps) % n;
    const hit = this.units.get(`${kind}:${facing}:${anim}:${f}`);
    if (hit) return hit;
    const fallback = this.units.get('hero:se:idle:0');
    if (!fallback) throw new Error('sprite atlas vazio');
    return fallback;
  }

  treeVariant(gx: number, gy: number): PropKind {
    const v = (gx * 13 + gy * 7) % 4;
    if (v === 0) return 'tree-pine';
    if (v === 1) return 'tree-autumn';
    if (v === 2) return 'tree-bloom';
    return 'tree-round';
  }
}

export function unitFrameCount(anim: Anim): number {
  return framesFor(anim);
}
