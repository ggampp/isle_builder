import propsJson from './props.json';
import type { PropAtlas } from '../render/art/propsAtlas.ts';

export type PropCategory = 'decor' | 'vegetation' | 'utility' | 'building';

export interface PropDefinition {
  id: string;
  name: string;
  category: PropCategory;
  widthTiles: number;
  heightTiles: number;
  anchorX: number;
  anchorY: number;
  shadowScale: number;
  requiresWalkable: boolean;
  scatter: boolean;
  atlasIndex: number;
}

interface PropJsonEntry {
  id: string;
  name: string;
  category: PropCategory;
  widthTiles: number;
  heightTiles: number;
  anchorX: number;
  anchorY: number;
  shadowScale: number;
  requiresWalkable: boolean;
  scatter: boolean;
}

const raw = propsJson as PropJsonEntry[];

export const PROP_CATALOG: PropDefinition[] = raw.map((entry, index) => ({
  ...entry,
  atlasIndex: index,
}));

const byId = new Map<string, PropDefinition>();
for (const def of PROP_CATALOG) {
  byId.set(def.id, def);
}

export function getPropDefinition(id: string): PropDefinition | undefined {
  return byId.get(id);
}

export function getPropsByCategory(category: PropCategory): PropDefinition[] {
  return PROP_CATALOG.filter((p) => p.category === category);
}

export function getDecorScatterProps(): PropDefinition[] {
  return PROP_CATALOG.filter((p) => p.scatter);
}

export function getCatalogPropCount(): number {
  return PROP_CATALOG.length;
}

/** UV rect in the props atlas for a definition. */
export function propUvRect(def: PropDefinition, atlas: PropAtlas): { u0: number; v0: number; u1: number; v1: number } {
  const col = def.atlasIndex % atlas.cols;
  const row = Math.floor(def.atlasIndex / atlas.cols);
  return {
    u0: col / atlas.cols,
    v0: row / atlas.rows,
    u1: (col + 1) / atlas.cols,
    v1: (row + 1) / atlas.rows,
  };
}
