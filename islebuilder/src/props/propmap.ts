import type { PropDefinition } from './catalog.ts';

export interface PlacedProp {
  uid: string;
  defId: string;
  tileX: number;
  tileY: number;
  /** Multiplicador visual do tamanho do sprite (1 = padrão). Não afeta o footprint. */
  scale?: number;
  /** Espelha o sprite horizontalmente — variação visual barata para vegetação/decor. */
  flip?: boolean;
}

export interface PropChange {
  uid: string;
  before: PlacedProp | null;
  after: PlacedProp | null;
}

let nextUid = 1;

export function createPropUid(): string {
  return `p${nextUid++}`;
}

/** Resets uid counter — for tests only. */
export function resetPropUidCounter(): void {
  nextUid = 1;
}

export class PropMap {
  private readonly byUid = new Map<string, PlacedProp>();
  private readonly byTile = new Map<string, string[]>();

  onPropChanged?: (change: PropChange) => void;

  all(): IterableIterator<PlacedProp> {
    return this.byUid.values();
  }

  get(uid: string): PlacedProp | undefined {
    return this.byUid.get(uid);
  }

  getAtTile(tileX: number, tileY: number): PlacedProp | undefined {
    const uids = this.byTile.get(`${tileX},${tileY}`);
    if (!uids || uids.length === 0) return undefined;
    return this.byUid.get(uids[uids.length - 1]!);
  }

  /** Topmost prop whose footprint contains the tile. */
  findAt(tileX: number, tileY: number, getDef: (id: string) => PropDefinition | undefined): PlacedProp | undefined {
    let best: PlacedProp | undefined;
    let bestSort = -Infinity;
    for (const prop of this.byUid.values()) {
      const def = getDef(prop.defId);
      if (!def) continue;
      const minX = prop.tileX;
      const minY = prop.tileY;
      const maxX = prop.tileX + def.widthTiles - 1;
      const maxY = prop.tileY + def.heightTiles - 1;
      if (tileX >= minX && tileX <= maxX && tileY >= minY && tileY <= maxY) {
        const sortY = prop.tileY + def.heightTiles - 1;
        if (sortY >= bestSort) {
          bestSort = sortY;
          best = prop;
        }
      }
    }
    return best;
  }

  add(prop: PlacedProp, def: PropDefinition): void {
    this.byUid.set(prop.uid, prop);
    for (let dy = 0; dy < def.heightTiles; dy++) {
      for (let dx = 0; dx < def.widthTiles; dx++) {
        const key = `${prop.tileX + dx},${prop.tileY + dy}`;
        const list = this.byTile.get(key) ?? [];
        list.push(prop.uid);
        this.byTile.set(key, list);
      }
    }
    this.onPropChanged?.({ uid: prop.uid, before: null, after: prop });
  }

  remove(uid: string, def: PropDefinition): PlacedProp | undefined {
    const prop = this.byUid.get(uid);
    if (!prop) return undefined;
    this.byUid.delete(uid);
    for (let dy = 0; dy < def.heightTiles; dy++) {
      for (let dx = 0; dx < def.widthTiles; dx++) {
        const key = `${prop.tileX + dx},${prop.tileY + dy}`;
        const list = this.byTile.get(key);
        if (list) {
          const idx = list.indexOf(uid);
          if (idx >= 0) list.splice(idx, 1);
          if (list.length === 0) this.byTile.delete(key);
        }
      }
    }
    this.onPropChanged?.({ uid, before: prop, after: null });
    return prop;
  }

  clear(): void {
    const snapshot = [...this.byUid.values()];
    this.byUid.clear();
    this.byTile.clear();
    for (const prop of snapshot) {
      this.onPropChanged?.({ uid: prop.uid, before: prop, after: null });
    }
  }

  snapshot(): PlacedProp[] {
    return [...this.byUid.values()].map((p) => ({ ...p }));
  }

  restore(props: PlacedProp[], getDef: (id: string) => PropDefinition | undefined): void {
    this.byUid.clear();
    this.byTile.clear();
    for (const prop of props) {
      const def = getDef(prop.defId);
      if (!def) continue;
      this.byUid.set(prop.uid, prop);
      for (let dy = 0; dy < def.heightTiles; dy++) {
        for (let dx = 0; dx < def.widthTiles; dx++) {
          const key = `${prop.tileX + dx},${prop.tileY + dy}`;
          const list = this.byTile.get(key) ?? [];
          list.push(prop.uid);
          this.byTile.set(key, list);
        }
      }
    }
  }
}
