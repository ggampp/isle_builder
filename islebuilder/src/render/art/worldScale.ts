import { TILE_SIZE } from '../../world/constants.ts';
import type { PropDefinition } from '../../props/catalog.ts';

/**
 * Escala lógica do mundo — separada da tela.
 * O tile é a unidade base; a câmera ortográfica mapeia mundo → tela no render.
 */
export const DESIGN_RESOLUTION = { width: 1280, height: 720 } as const;

/** Altura de referência do viewport em tiles (enquadramento ~jogo_exemplo.png a zoom 0.5). */
export const DESIGN_VIEW_HEIGHT_TILES = 45;

/** Converte tiles → unidades de mundo (1 tile = TILE_SIZE wu). */
export function tilesToWorld(tiles: number): number {
  return tiles * TILE_SIZE;
}

/**
 * Densidade de arte compartilhada: props (64px em 2 tiles) e terreno usam ~2 px/wu.
 * Evita grão da ilha parecer “bloco” grosso perto das árvores.
 */
export const ART_PIXELS_PER_WORLD_UNIT = 2;

/** Célula do atlas de máscara de terreno — 32px esticados em 1 tile (16wu). */
export const TERRAIN_MASK_CELL_PX = TILE_SIZE * ART_PIXELS_PER_WORLD_UNIT;

/** uFillScale para texturas de areia/grama casarem com a densidade dos sprites. */
export function terrainFillWorldScale(textureWidthPx: number, textureHeightPx: number): {
  x: number;
  y: number;
} {
  return {
    x: textureWidthPx / ART_PIXELS_PER_WORLD_UNIT,
    y: textureHeightPx / ART_PIXELS_PER_WORLD_UNIT,
  };
}

/**
 * Alturas visuais-alvo em tiles (referência: assets/status/jogo_exemplo.png).
 * Footprint/colisão continua em props.json — isto só define o quad desenhado.
 */
export const VISUAL_TILES = {
  villager: 1.25,
  tree: 2,
  decorSmall: 0.65,
  decorMedium: 1,
  utility: 1,
} as const;

function propVisualHeightTiles(def: PropDefinition): number {
  const footprint = Math.max(def.widthTiles, def.heightTiles);
  switch (def.category) {
    case 'vegetation':
      return Math.max(VISUAL_TILES.tree, def.heightTiles);
    case 'decor':
      if (
        def.id.includes('bush') ||
        def.id.includes('rock') ||
        def.id.includes('driftwood')
      ) {
        return VISUAL_TILES.decorMedium;
      }
      return VISUAL_TILES.decorSmall;
    case 'utility':
      return VISUAL_TILES.utility;
    case 'building':
    default:
      return footprint;
  }
}

/** Tamanho do quad de sprite em unidades de mundo (quadrado — célula do atlas é quadrada). */
export function propWorldSize(def: PropDefinition): { w: number; h: number } {
  const size = tilesToWorld(propVisualHeightTiles(def));
  return { w: size, h: size };
}

export type EntitySpriteKind =
  | 'villager'
  | 'fish'
  | 'whale'
  | 'shark'
  | 'orca'
  | 'swordfish'
  | 'rowboat'
  | 'galleon'
  | 'spray';

/** Tamanhos de agentes em unidades de mundo, derivados de tiles. */
export function entitySpriteSize(kind: EntitySpriteKind): { w: number; h: number } {
  const tw = tilesToWorld;
  switch (kind) {
    case 'villager': {
      const h = tw(VISUAL_TILES.villager);
      return { w: h * 0.82, h };
    }
    case 'fish':
      return { w: tw(0.75), h: tw(0.5) };
    case 'whale':
      return { w: tw(3), h: tw(1.4) };
    case 'shark':
      return { w: tw(1.6), h: tw(0.7) };
    case 'orca':
      return { w: tw(1.8), h: tw(0.8) };
    case 'swordfish':
      return { w: tw(1.5), h: tw(0.55) };
    case 'rowboat':
      return { w: tw(1.2), h: tw(0.85) };
    case 'galleon':
      return { w: tw(2.5), h: tw(1.6) };
    case 'spray':
      return { w: tw(0.75), h: tw(1.1) };
  }
}