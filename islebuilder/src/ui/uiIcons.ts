import { dot, px } from '../render/art/pixelDraw.ts';
import { Palette } from '../render/art/palette.ts';

const ICON_PX = 16;
const O = Palette.outline;

export type UiIconId =
  | 'brush' | 'line' | 'rect' | 'bucket' | 'eraser' | 'dropper' | 'hand'
  | 'land' | 'decor' | 'props' | 'world' | 'map' | 'help'
  | 'settings' | 'pause' | 'play' | 'eye' | 'camera'
  | 'water' | 'sand' | 'grass' | 'path' | 'bridge' | 'cliff'
  | 'undo' | 'redo' | 'clear' | 'zoom' | 'size' | 'space'
  | 'villager' | 'fish' | 'whale' | 'ship' | 'foam' | 'repop';

const cache = new Map<UiIconId, string>();

type Drawer = (ctx: CanvasRenderingContext2D) => void;

const drawers: Record<UiIconId, Drawer> = {
  brush: (c) => {
    px(c, 3, 2, 3, 8, '#c99a1e');
    px(c, 5, 10, 2, 4, '#8a5a33');
    px(c, 4, 13, 4, 2, '#ffd23f');
    for (let y = 2; y < 10; y++) dot(c, 2, y, O);
    dot(c, 6, 10, O);
  },
  line: (c) => {
    for (let i = 0; i < 10; i++) {
      dot(c, 3 + i, 12 - i, '#ffd23f');
      dot(c, 3 + i, 11 - i, O);
    }
    px(c, 2, 12, 3, 3, '#e8564f');
    px(c, 11, 3, 3, 3, '#58c25c');
  },
  rect: (c) => {
    px(c, 3, 4, 10, 9, '#3fa7e0');
    for (let x = 3; x < 13; x++) { dot(c, x, 4, O); dot(c, x, 12, O); }
    for (let y = 4; y < 13; y++) { dot(c, 3, y, O); dot(c, 12, y, O); }
    px(c, 5, 6, 6, 5, '#ffd23f');
  },
  bucket: (c) => {
    px(c, 4, 3, 8, 2, '#9e9e9e');
    px(c, 3, 5, 10, 8, '#3fa7e0');
    px(c, 4, 11, 8, 2, '#2e8bc0');
    for (let x = 3; x < 13; x++) dot(c, x, 5, O);
    dot(c, 3, 6, O); dot(c, 12, 6, O);
  },
  eraser: (c) => {
    px(c, 3, 5, 10, 7, '#e0703a');
    px(c, 4, 4, 8, 2, '#ffd23f');
    for (let x = 3; x < 13; x++) dot(c, x, 5, O);
    dot(c, 3, 6, O); dot(c, 12, 11, O);
  },
  dropper: (c) => {
    px(c, 7, 2, 2, 4, '#9e9e9e');
    px(c, 5, 6, 6, 2, '#9e9e9e');
    px(c, 4, 8, 4, 4, '#e8564f');
    px(c, 3, 11, 3, 3, '#e8564f');
    dot(c, 7, 2, O); dot(c, 4, 11, O);
  },
  hand: (c) => {
    px(c, 5, 3, 6, 10, '#ffd23f');
    px(c, 4, 5, 2, 6, '#ffd23f');
    px(c, 3, 7, 2, 4, '#ffd23f');
    px(c, 7, 2, 2, 3, '#ffd23f');
    for (let y = 3; y < 13; y++) dot(c, 5, y, O);
    dot(c, 11, 8, O);
  },
  land: (c) => {
    px(c, 2, 8, 12, 6, '#79c15c');
    px(c, 4, 5, 8, 4, '#79c15c');
    px(c, 6, 3, 4, 3, '#79c15c');
    px(c, 3, 10, 10, 2, '#e7d29a');
    dot(c, 2, 8, O); dot(c, 13, 13, O);
  },
  decor: (c) => {
    px(c, 7, 2, 2, 2, '#e8564f');
    px(c, 6, 4, 4, 2, '#ffd23f');
    px(c, 7, 6, 2, 6, '#58c25c');
    px(c, 5, 11, 6, 3, '#79c15c');
    dot(c, 7, 2, O);
  },
  props: (c) => {
    px(c, 3, 7, 10, 6, '#a0724a');
    px(c, 4, 4, 8, 4, '#e8564f');
    px(c, 6, 6, 2, 2, '#ffd23f');
    px(c, 9, 9, 2, 4, '#3fa7e0');
    dot(c, 3, 7, O); dot(c, 12, 12, O);
  },
  world: (c) => {
    px(c, 1, 6, 14, 8, '#3fa7e0');
    px(c, 2, 7, 12, 2, '#5ec4f0');
    px(c, 4, 4, 8, 3, '#79c15c');
    px(c, 6, 5, 4, 2, '#e7d29a');
    dot(c, 1, 6, O);
  },
  map: (c) => {
    px(c, 2, 3, 12, 11, '#9b6fd6');
    px(c, 4, 5, 4, 3, '#79c15c');
    px(c, 9, 7, 3, 4, '#3fa7e0');
    px(c, 5, 9, 5, 2, '#e7d29a');
    for (let x = 2; x < 14; x++) dot(c, x, 3, O);
  },
  help: (c) => {
    px(c, 4, 2, 8, 12, '#ffd23f');
    px(c, 6, 4, 4, 3, '#1d3d63');
    px(c, 6, 9, 4, 2, '#1d3d63');
    px(c, 7, 12, 2, 2, '#1d3d63');
    for (let x = 4; x < 12; x++) dot(c, x, 2, O);
  },
  settings: (c) => {
    px(c, 6, 2, 4, 4, '#9e9e9e');
    px(c, 5, 6, 6, 6, '#9e9e9e');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.round(7.5 + Math.cos(a) * 5);
      const y = Math.round(7.5 + Math.sin(a) * 5);
      dot(c, x, y, '#ffd23f');
    }
    dot(c, 6, 6, O);
  },
  pause: (c) => {
    px(c, 5, 3, 2, 10, '#ffd23f');
    px(c, 9, 3, 2, 10, '#ffd23f');
    dot(c, 5, 3, O); dot(c, 10, 12, O);
  },
  play: (c) => {
    px(c, 5, 3, 2, 10, '#58c25c');
    for (let y = 3; y < 13; y++) {
      const w = Math.min(y - 2, 13 - y);
      px(c, 6, y, w + 2, 1, '#58c25c');
    }
    dot(c, 5, 3, O);
  },
  eye: (c) => {
    px(c, 2, 6, 12, 5, '#3fa7e0');
    px(c, 5, 7, 6, 3, '#fff');
    px(c, 7, 8, 2, 2, '#1d3d63');
    dot(c, 2, 6, O); dot(c, 13, 10, O);
  },
  camera: (c) => {
    px(c, 3, 5, 10, 7, '#27507e');
    px(c, 6, 7, 4, 3, '#3fa7e0');
    px(c, 11, 6, 3, 2, '#ffd23f');
    dot(c, 3, 5, O); dot(c, 12, 11, O);
  },
  water: (c) => { px(c, 2, 4, 12, 10, '#3fa7e0'); dot(c, 2, 4, O); },
  sand: (c) => { px(c, 2, 4, 12, 10, '#e7d29a'); dot(c, 2, 4, O); },
  grass: (c) => { px(c, 2, 4, 12, 10, '#79c15c'); dot(c, 2, 4, O); },
  path: (c) => { px(c, 2, 4, 12, 10, '#c8a867'); dot(c, 2, 4, O); },
  bridge: (c) => {
    px(c, 2, 5, 12, 8, '#3fa7e0');
    px(c, 2, 6, 12, 6, '#8a5a33');
    for (let x = 2; x < 14; x += 3) dot(c, x, 6, O);
  },
  cliff: (c) => {
    px(c, 2, 4, 12, 10, '#9e9e9e');
    px(c, 2, 10, 12, 4, '#6e6e6e');
    dot(c, 2, 4, O);
  },
  undo: (c) => {
    for (let i = 0; i < 6; i++) dot(c, 10 - i, 4 + i, '#3fa7e0');
    px(c, 3, 10, 4, 2, '#3fa7e0');
    dot(c, 3, 10, O);
  },
  redo: (c) => {
    for (let i = 0; i < 6; i++) dot(c, 5 + i, 4 + i, '#58c25c');
    px(c, 9, 10, 4, 2, '#58c25c');
    dot(c, 12, 10, O);
  },
  clear: (c) => {
    px(c, 4, 3, 8, 10, '#e8564f');
    px(c, 6, 2, 4, 2, '#c04040');
    px(c, 5, 6, 6, 1, '#ffd23f');
    dot(c, 4, 3, O);
  },
  zoom: (c) => {
    px(c, 6, 2, 4, 12, '#9e9e9e');
    px(c, 2, 6, 12, 4, '#9e9e9e');
    px(c, 7, 7, 2, 2, '#ffd23f');
    dot(c, 6, 2, O);
  },
  size: (c) => {
    px(c, 2, 7, 12, 2, '#ffd23f');
    for (let i = 0; i < 5; i++) dot(c, 3 + i * 2, 5 - i, O);
    dot(c, 13, 5, O);
  },
  space: (c) => {
    dot(c, 4, 4, '#ffd23f'); dot(c, 8, 3, '#fff');
    dot(c, 12, 5, '#ffd23f'); dot(c, 6, 8, '#fff');
    dot(c, 3, 11, '#ffd23f'); dot(c, 10, 10, '#fff');
  },
  villager: (c) => {
    px(c, 6, 2, 4, 3, '#ffd23f');
    px(c, 5, 5, 6, 5, '#3fa7e0');
    px(c, 5, 10, 2, 4, '#8a5a33');
    px(c, 9, 10, 2, 4, '#8a5a33');
    dot(c, 6, 2, O);
  },
  fish: (c) => {
    px(c, 4, 6, 8, 4, '#e0703a');
    px(c, 2, 7, 3, 2, '#e0703a');
    px(c, 10, 6, 3, 4, '#e0703a');
    dot(c, 4, 6, O);
  },
  whale: (c) => {
    px(c, 2, 6, 10, 5, '#27507e');
    px(c, 10, 5, 4, 3, '#27507e');
    px(c, 4, 5, 2, 2, '#3fa7e0');
    dot(c, 2, 6, O);
  },
  ship: (c) => {
    px(c, 2, 9, 12, 3, '#8a5a33');
    px(c, 7, 3, 2, 7, '#a0724a');
    px(c, 5, 4, 6, 3, '#fff');
    dot(c, 2, 9, O);
  },
  foam: (c) => {
    px(c, 1, 8, 14, 5, '#3fa7e0');
    for (let x = 2; x < 14; x += 2) dot(c, x, 7, '#fff');
    dot(c, 1, 8, O);
  },
  repop: (c) => {
    px(c, 3, 3, 10, 10, '#58c25c');
    for (let i = 0; i < 4; i++) {
      dot(c, 5 + i, 5 + i, '#ffd23f');
      dot(c, 10 - i, 5 + i, '#ffd23f');
    }
    dot(c, 3, 3, O);
  },
};

function renderIcon(id: UiIconId): string {
  const cached = cache.get(id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = ICON_PX;
  canvas.height = ICON_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  drawers[id](ctx);
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}

export function getUiIconUrl(id: UiIconId): string {
  return renderIcon(id);
}

// BASE_URL (sempre terminado em barra) mantém os caminhos corretos quando o
// jogo é publicado num subdiretório, como /isle-builder/ no GitHub Pages.
const PNG_ICON_BASE = `${import.meta.env.BASE_URL}assets/ui/icons/`;

export function createIconImg(id: UiIconId, sizePx = 20): HTMLImageElement {
  const img = document.createElement('img');
  img.alt = id;
  img.width = sizePx;
  img.height = sizePx;
  img.draggable = false;
  img.className = 'ui-icon';
  img.style.imageRendering = 'pixelated';
  img.src = `${PNG_ICON_BASE}${id}.png`;
  img.onerror = () => {
    img.onerror = null;
    img.src = getUiIconUrl(id);
  };
  return img;
}

/** Logo PNG with procedural canvas fallback. */
export function createLogoElement(): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'isle-logo';
  root.style.cssText =
    'position:fixed;top:16px;left:16px;z-index:9999;' +
    'padding:4px 8px;border-radius:10px;' +
    'background:linear-gradient(180deg,#1d3d63,#16334f);' +
    'border:2px solid #0e2440;box-shadow:0 4px 12px rgba(0,10,30,.4);';

  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}assets/logo.png`;
  img.alt = 'Isle Builder';
  img.draggable = false;
  img.style.cssText = 'display:block;height:48px;width:auto;image-rendering:pixelated;';
  img.onerror = () => {
    img.remove();
    const canvas = document.createElement('canvas');
    canvas.width = 140;
    canvas.height = 36;
    canvas.style.cssText = 'display:block;image-rendering:pixelated;';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.font = 'bold 14px Fredoka, sans-serif';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('Isle', 28, 16);
      ctx.font = 'bold 11px Fredoka, sans-serif';
      ctx.fillStyle = '#eaf2fb';
      ctx.fillText('BUILDER', 28, 30);
      px(ctx, 4, 6, 4, 4, '#58c25c');
      px(ctx, 3, 10, 2, 6, '#79c15c');
      px(ctx, 8, 4, 2, 4, '#58c25c');
      px(ctx, 10, 8, 2, 5, '#79c15c');
      dot(ctx, 4, 6, O);
    }
    root.appendChild(canvas);
  };
  root.appendChild(img);
  return root;
}

export const TOOL_CURSORS: Record<string, string> = {
  brush: 'crosshair',
  line: 'crosshair',
  rect: 'crosshair',
  bucket: 'cell',
  eraser: 'crosshair',
  dropper: 'copy',
  hand: 'grab',
};
