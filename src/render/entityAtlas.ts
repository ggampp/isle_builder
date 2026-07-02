import * as THREE from 'three';
import { Palette } from './art/palette.ts';
import { blob, box, dot, px } from './art/pixelDraw.ts';

export const ENTITY_CELL_PX = 32;
export const ENTITY_ATLAS_COLS = 16;

export const EntitySprite = {
  Villager: 0,
  Fish: 1,
  Whale: 2,
  Shark: 3,
  Orca: 4,
  Swordfish: 5,
  Rowboat: 6,
  Galleon: 7,
  Spray: 8,
} as const;

export type EntitySpriteId = (typeof EntitySprite)[keyof typeof EntitySprite];

export interface EntityAtlasEntry {
  id: EntitySpriteId;
  row: number;
  frames: number;
}

export const ENTITY_LAYOUT: EntityAtlasEntry[] = [
  { id: EntitySprite.Villager, row: 0, frames: 4 },
  { id: EntitySprite.Fish, row: 1, frames: 4 },
  { id: EntitySprite.Whale, row: 2, frames: 4 },
  { id: EntitySprite.Shark, row: 3, frames: 4 },
  { id: EntitySprite.Orca, row: 4, frames: 4 },
  { id: EntitySprite.Swordfish, row: 5, frames: 4 },
  { id: EntitySprite.Rowboat, row: 6, frames: 2 },
  { id: EntitySprite.Galleon, row: 7, frames: 4 },
  { id: EntitySprite.Spray, row: 8, frames: 1 },
];

export interface EntityAtlas {
  texture: THREE.CanvasTexture;
  cols: number;
  rows: number;
  cellPx: number;
}

function drawVillager(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number, variant: number): void {
  const skin = ['#f5d0a9', '#e8b88a', '#c68642', '#8d5524'][variant] ?? '#f5d0a9';
  const shirt = ['#c44b4b', '#4a7ec4', '#4a9e5c', '#d4a832'][variant] ?? '#c44b4b';
  const hair = ['#4a3528', '#2a1810', '#8b6914', '#6b4423'][variant] ?? '#4a3528';
  const legL = frame % 2 === 0 ? 0 : 1;
  const legR = frame % 2 === 0 ? 1 : 0;
  const armSwing = frame % 2 === 0 ? 0 : 1;

  // shadow feet
  px(ctx, ox + 11, oy + 27, 10, 2, Palette.shadow);

  // legs
  px(ctx, ox + 12 + legL, oy + 22, 3, 6, Palette.woodDark);
  px(ctx, ox + 17 + legR, oy + 22, 3, 6, Palette.woodDark);
  dot(ctx, ox + 12 + legL, oy + 27, Palette.outline);
  dot(ctx, ox + 19 + legR, oy + 27, Palette.outline);

  // body
  box(ctx, ox + 11, oy + 14, 10, 9, shirt);
  px(ctx, ox + 13, oy + 16, 6, 2, skin);

  // arms
  px(ctx, ox + 8, oy + 15 + armSwing, 3, 6, shirt);
  px(ctx, ox + 21, oy + 15 + (1 - armSwing), 3, 6, shirt);
  px(ctx, ox + 8, oy + 20, 2, 2, skin);
  px(ctx, ox + 22, oy + 20, 2, 2, skin);

  // head
  blob(ctx, ox + 16, oy + 10, 5, skin, '#ffe0c0');
  px(ctx, ox + 13, oy + 6, 6, 3, hair);
  px(ctx, ox + 12, oy + 7, 2, 2, hair);
  // eyes
  dot(ctx, ox + 14, oy + 10, Palette.outline);
  dot(ctx, ox + 18, oy + 10, Palette.outline);
  px(ctx, ox + 15, oy + 12, 4, 1, '#c68642');
}

function drawFish(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number, hue: number): void {
  const colors = ['#ff6b4a', '#ffd23f', '#4ecdc4', '#ff6b8a'];
  const c = colors[Math.floor(hue * colors.length) % colors.length]!;
  const cDark = colors[(Math.floor(hue * colors.length) + 1) % colors.length]!;
  const tail = frame % 2 === 0 ? 0 : 1;

  px(ctx, ox + 6 + tail, oy + 13, 5, 8, c);
  px(ctx, ox + 10, oy + 12, 12, 10, c);
  px(ctx, ox + 20, oy + 14, 6, 6, c);
  px(ctx, ox + 11, oy + 14, 8, 3, cDark);
  dot(ctx, ox + 22, oy + 16, Palette.outline);
  px(ctx, ox + 21, oy + 15, 2, 2, Palette.flowerWhite);
  px(ctx, ox + 14, oy + 11, 4, 2, Palette.waterShallow);
}

function drawWhale(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  const wob = frame % 2;
  px(ctx, ox + 4, oy + 14 + wob, 22, 10, Palette.waterMid);
  px(ctx, ox + 2, oy + 16 + wob, 6, 6, Palette.waterMid);
  px(ctx, ox + 6, oy + 18 + wob, 16, 4, Palette.waterShallow);
  px(ctx, ox + 22, oy + 12 + wob, 4, 6, Palette.waterDeep);
  dot(ctx, ox + 8, oy + 15 + wob, Palette.outline);
  px(ctx, ox + 9, oy + 15 + wob, 2, 2, Palette.flowerWhite);
  px(ctx, ox + 24, oy + 10 + wob, 2, 4, Palette.waterDeep);
}

function drawShark(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  const wob = frame % 2;
  px(ctx, ox + 8, oy + 14 + wob, 16, 6, '#8a9aaa');
  px(ctx, ox + 22, oy + 12 + wob, 6, 4, '#8a9aaa');
  px(ctx, ox + 10, oy + 16 + wob, 10, 2, '#c0ccd8');
  px(ctx, ox + 20, oy + 11 + wob, 3, 3, '#8a9aaa');
  dot(ctx, ox + 21, oy + 12 + wob, Palette.outline);
  dot(ctx, ox + 12, oy + 13 + wob, Palette.outline);
}

function drawOrca(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  const wob = frame % 2;
  px(ctx, ox + 6, oy + 13 + wob, 18, 8, Palette.outline);
  px(ctx, ox + 8, oy + 15 + wob, 14, 4, Palette.flowerWhite);
  px(ctx, ox + 20, oy + 12 + wob, 4, 5, Palette.outline);
  px(ctx, ox + 10, oy + 14 + wob, 3, 2, Palette.flowerWhite);
  dot(ctx, ox + 11, oy + 14 + wob, Palette.outline);
}

function drawSwordfish(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  const wob = frame % 2;
  px(ctx, ox + 6, oy + 15 + wob, 16, 5, '#5a8ab0');
  px(ctx, ox + 20, oy + 14 + wob, 8, 2, '#8a8a8a');
  px(ctx, ox + 10, oy + 14 + wob, 8, 2, Palette.waterShallow);
  px(ctx, ox + 8, oy + 13 + wob, 4, 3, '#5a8ab0');
  dot(ctx, ox + 14, oy + 16 + wob, Palette.outline);
}

function drawRowboat(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  px(ctx, ox + 6, oy + 20, 20, 5, Palette.woodDark);
  px(ctx, ox + 8, oy + 18, 16, 4, Palette.wood);
  px(ctx, ox + 14, oy + 10 + (frame % 2), 2, 12, Palette.woodDark);
  px(ctx, ox + 10, oy + 12 + (frame % 2), 8, 2, Palette.wood);
  dot(ctx, ox + 15, oy + 10, Palette.outline);
}

function drawGalleon(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number): void {
  px(ctx, ox + 4, oy + 22, 24, 5, Palette.woodDark);
  px(ctx, ox + 6, oy + 20, 20, 3, Palette.wood);
  px(ctx, ox + 14, oy + 6, 3, 18, Palette.woodDark);
  const sail = 6 + (frame % 2);
  px(ctx, ox + 17, oy + 7, sail, 12, Palette.flowerWhite);
  px(ctx, ox + 17, oy + 7, sail, 2, Palette.wallDark);
  px(ctx, ox + 10, oy + 12, 5, 8, Palette.flowerWhite);
  px(ctx, ox + 24, oy + 4, 3, 4, Palette.roofRed);
  px(ctx, ox + 8, oy + 24, 4, 2, Palette.waterShallow);
  px(ctx, ox + 20, oy + 24, 6, 2, Palette.waterShallow);
}

function drawSpray(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  px(ctx, ox + 13, oy + 4, 6, 12, '#ffffff');
  px(ctx, ox + 10, oy + 8, 3, 6, '#ffffffcc');
  px(ctx, ox + 19, oy + 8, 3, 6, '#ffffffcc');
  px(ctx, ox + 12, oy + 2, 2, 4, '#ffffff');
  px(ctx, ox + 18, oy + 2, 2, 4, '#ffffff');
}

function drawEntityFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  spriteId: EntitySpriteId,
  frame: number,
  variant: number,
): void {
  switch (spriteId) {
    case EntitySprite.Villager: drawVillager(ctx, ox, oy, frame, variant); break;
    case EntitySprite.Fish: drawFish(ctx, ox, oy, frame, variant); break;
    case EntitySprite.Whale: drawWhale(ctx, ox, oy, frame); break;
    case EntitySprite.Shark: drawShark(ctx, ox, oy, frame); break;
    case EntitySprite.Orca: drawOrca(ctx, ox, oy, frame); break;
    case EntitySprite.Swordfish: drawSwordfish(ctx, ox, oy, frame); break;
    case EntitySprite.Rowboat: drawRowboat(ctx, ox, oy, frame); break;
    case EntitySprite.Galleon: drawGalleon(ctx, ox, oy, frame); break;
    case EntitySprite.Spray: drawSpray(ctx, ox, oy); break;
  }
}

let cached: EntityAtlas | null = null;

export function invalidateEntityAtlasCache(): void {
  cached = null;
}

export async function loadEntityAtlasFromImage(url: string): Promise<EntityAtlas> {
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cols = ENTITY_ATLAS_COLS;
      const rows = ENTITY_LAYOUT.length;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(buildEntityAtlas());
        return;
      }
      ctx.drawImage(img, 0, 0);

      // MuAPI often draws a house for "villager" — keep procedural human on row 0.
      const villager = ENTITY_LAYOUT.find((e) => e.id === EntitySprite.Villager)!;
      for (let f = 0; f < villager.frames; f++) {
        const cellX = f * ENTITY_CELL_PX;
        const cellY = villager.row * ENTITY_CELL_PX;
        ctx.clearRect(cellX, cellY, ENTITY_CELL_PX, ENTITY_CELL_PX);
        drawEntityFrame(ctx, cellX, cellY, EntitySprite.Villager, f, f % 4);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.premultiplyAlpha = false;
      cached = { texture, cols, rows, cellPx: ENTITY_CELL_PX };
      resolve(cached);
    };
    img.onerror = () => {
      console.warn(`Failed to load entity atlas from ${url}, falling back to procedural.`);
      resolve(buildEntityAtlas());
    };
    img.src = url;
  });
}

export function buildEntityAtlas(): EntityAtlas {
  if (cached) return cached;

  const rows = ENTITY_LAYOUT.length;
  const cols = ENTITY_ATLAS_COLS;
  const canvas = document.createElement('canvas');
  canvas.width = cols * ENTITY_CELL_PX;
  canvas.height = rows * ENTITY_CELL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const entry of ENTITY_LAYOUT) {
    for (let f = 0; f < entry.frames; f++) {
      const cellX = f * ENTITY_CELL_PX;
      const cellY = entry.row * ENTITY_CELL_PX;
      ctx.clearRect(cellX, cellY, ENTITY_CELL_PX, ENTITY_CELL_PX);
      drawEntityFrame(ctx, cellX, cellY, entry.id, f, f % 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.premultiplyAlpha = false;

  cached = { texture, cols, rows, cellPx: ENTITY_CELL_PX };
  return cached;
}

export function entityFrameUv(
  atlas: EntityAtlas,
  spriteId: EntitySpriteId,
  frame: number,
): { u0: number; v0: number; u1: number; v1: number } {
  const entry = ENTITY_LAYOUT.find((e) => e.id === spriteId)!;
  const f = frame % entry.frames;
  const u0 = f / atlas.cols;
  const u1 = (f + 1) / atlas.cols;
  const v0 = entry.row / atlas.rows;
  const v1 = (entry.row + 1) / atlas.rows;
  return { u0, v0, u1, v1 };
}

export function applyFrameToMap(
  map: THREE.Texture,
  atlas: EntityAtlas,
  spriteId: EntitySpriteId,
  frame: number,
): void {
  const uv = entityFrameUv(atlas, spriteId, frame);
  map.repeat.set(uv.u1 - uv.u0, uv.v1 - uv.v0);
  map.offset.set(uv.u0, (atlas.rows - 1 - entryRow(spriteId)) / atlas.rows);
  map.needsUpdate = true;
}

function entryRow(spriteId: EntitySpriteId): number {
  return ENTITY_LAYOUT.find((e) => e.id === spriteId)!.row;
}

export function createEntityMaterial(
  atlas: EntityAtlas,
  spriteId: EntitySpriteId,
  frame: number,
  extra?: Partial<THREE.MeshBasicMaterialParameters>,
): THREE.MeshBasicMaterial {
  const map = atlas.texture.clone();
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  applyFrameToMap(map, atlas, spriteId, frame);
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    alphaTest: 0.01,
    ...extra,
  });
}

export function updateEntityMaterialFrame(
  mat: THREE.MeshBasicMaterial,
  atlas: EntityAtlas,
  spriteId: EntitySpriteId,
  frame: number,
): void {
  if (!mat.map) return;
  applyFrameToMap(mat.map, atlas, spriteId, frame);
}

export function disposeEntityMaterial(mat: THREE.Material): void {
  if (mat instanceof THREE.MeshBasicMaterial && mat.map) {
    mat.map.dispose();
  }
  mat.dispose();
}
