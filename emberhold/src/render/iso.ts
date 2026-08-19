export const TILE_W = 64;
export const TILE_H = 32;

export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (wx - wy) * (TILE_W / 2),
    y: (wx + wy) * (TILE_H / 2),
  };
}

export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return {
    x: (b + a) / 2,
    y: (b - a) / 2,
  };
}

export function depth(wx: number, wy: number): number {
  return wx + wy;
}
