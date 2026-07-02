import { Palette } from './palette.ts';

/** Fill a rectangle (pixel block). */
export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Single outline pixel. */
export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  px(ctx, x, y, 1, 1, color);
}

/** Filled rect with 1px outline on top-left highlight and bottom-right shadow. */
export function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = Palette.outline,
): void {
  px(ctx, x, y, w, h, fill);
  for (let i = 0; i < w; i++) dot(ctx, x + i, y, outline);
  for (let i = 0; i < h; i++) dot(ctx, x, y + i, outline);
  for (let i = 1; i < w; i++) dot(ctx, x + i, y + h - 1, outline);
  for (let i = 1; i < h; i++) dot(ctx, x + w - 1, y + i, outline);
}

/** Soft circular blob (pixel clusters). */
export function blob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  highlight?: string,
): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const isHighlight = highlight && dx + dy < -1;
        px(ctx, cx + dx, cy + dy, 1, 1, isHighlight ? highlight : fill);
      }
    }
  }
}

/** Triangle roof cap. */
export function roof(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  for (let row = 0; row < h; row++) {
    const inset = Math.floor((row / h) * (w / 2));
    px(ctx, x + inset, y + row, w - inset * 2, 1, color);
    dot(ctx, x + inset, y + row, Palette.outline);
    dot(ctx, x + w - inset - 1, y + row, Palette.outline);
  }
  dot(ctx, x + w / 2, y, Palette.outline);
}

/** Stem + leaf pair for flowers. */
export function stem(ctx: CanvasRenderingContext2D, ox: number, oy: number, h: number): void {
  px(ctx, ox + 23, oy + 48 - h, 2, h - 6, Palette.leafDark);
  px(ctx, ox + 19, oy + 48 - h + 8, 5, 2, Palette.leaf);
  px(ctx, ox + 25, oy + 48 - h + 14, 5, 2, Palette.leafDark);
}
