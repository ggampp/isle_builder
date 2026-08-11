import type { Tilemap } from '../world/tilemap.ts';
import { CHUNK_SIZE } from '../world/constants.ts';
import type { PropMap, PlacedProp, PropChange } from '../props/propmap.ts';
import { getPropDefinition } from '../props/catalog.ts';

export interface HistoryCommand {
  undo(): void;
  redo(): void;
}

export class StrokeCommand implements HistoryCommand {
  private changes = new Map<string, { x: number; y: number; oldLayer: number; newLayer: number }>();
  private readonly tilemap: Tilemap;

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
  }

  addChange(x: number, y: number, oldLayer: number, newLayer: number): void {
    const key = `${x},${y}`;
    const existing = this.changes.get(key);
    if (existing) {
      existing.newLayer = newLayer;
    } else {
      this.changes.set(key, { x, y, oldLayer, newLayer });
    }
  }

  get hasChanges(): boolean {
    for (const change of this.changes.values()) {
      if (change.oldLayer !== change.newLayer) return true;
    }
    return false;
  }

  undo(): void {
    for (const change of this.changes.values()) {
      if (change.oldLayer !== change.newLayer) {
        this.tilemap.setLayer(change.x, change.y, change.oldLayer);
      }
    }
  }

  redo(): void {
    for (const change of this.changes.values()) {
      if (change.oldLayer !== change.newLayer) {
        this.tilemap.setLayer(change.x, change.y, change.newLayer);
      }
    }
  }
}

export class PropStrokeCommand implements HistoryCommand {
  private changes = new Map<string, PropChange>();
  private readonly propMap: PropMap;

  constructor(propMap: PropMap) {
    this.propMap = propMap;
  }

  addChange(change: PropChange): void {
    const existing = this.changes.get(change.uid);
    if (existing) {
      existing.after = change.after;
    } else {
      this.changes.set(change.uid, { uid: change.uid, before: change.before, after: change.after });
    }
  }

  get hasChanges(): boolean {
    for (const c of this.changes.values()) {
      if (JSON.stringify(c.before) !== JSON.stringify(c.after)) return true;
    }
    return false;
  }

  undo(): void {
    for (const c of this.changes.values()) {
      const defBefore = c.before ? getPropDefinition(c.before.defId) : undefined;
      const defAfter = c.after ? getPropDefinition(c.after.defId) : undefined;
      if (c.after && defAfter) this.propMap.remove(c.after.uid, defAfter);
      if (c.before && defBefore) this.propMap.add(c.before, defBefore);
    }
  }

  redo(): void {
    for (const c of this.changes.values()) {
      const defBefore = c.before ? getPropDefinition(c.before.defId) : undefined;
      const defAfter = c.after ? getPropDefinition(c.after.defId) : undefined;
      if (c.before && defBefore) this.propMap.remove(c.before.uid, defBefore);
      if (c.after && defAfter) this.propMap.add(c.after, defAfter);
    }
  }
}

export class ClearCommand implements HistoryCommand {
  private chunksSnapshot: { cx: number; cy: number; layers: Uint8Array }[] = [];
  private propsSnapshot: PlacedProp[] = [];
  private readonly tilemap: Tilemap;
  private readonly propMap: PropMap;

  constructor(tilemap: Tilemap, propMap: PropMap) {
    this.tilemap = tilemap;
    this.propMap = propMap;
    for (const chunk of tilemap.allChunks()) {
      this.chunksSnapshot.push({
        cx: chunk.cx,
        cy: chunk.cy,
        layers: new Uint8Array(chunk.layers),
      });
    }
    this.propsSnapshot = propMap.snapshot();
  }

  undo(): void {
    this.tilemap.clear();
    for (const snapshot of this.chunksSnapshot) {
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const layer = snapshot.layers[ly * CHUNK_SIZE + lx];
          if (layer > 0) {
            this.tilemap.setLayer(snapshot.cx * CHUNK_SIZE + lx, snapshot.cy * CHUNK_SIZE + ly, layer);
          }
        }
      }
    }
    this.propMap.restore(this.propsSnapshot, getPropDefinition);
  }

  redo(): void {
    this.propMap.clear();
    this.tilemap.clear();
  }
}

class CompositeCommand implements HistoryCommand {
  private readonly commands: HistoryCommand[];

  constructor(commands: HistoryCommand[]) {
    this.commands = commands;
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i]!.undo();
    }
  }

  redo(): void {
    for (const cmd of this.commands) cmd.redo();
  }
}

export class HistoryManager {
  private undoStack: HistoryCommand[] = [];
  private redoStack: HistoryCommand[] = [];
  private currentStroke: StrokeCommand | null = null;
  private currentPropStroke: PropStrokeCommand | null = null;
  private readonly tilemap: Tilemap;
  private readonly propMap: PropMap;

  constructor(tilemap: Tilemap, propMap: PropMap) {
    this.tilemap = tilemap;
    this.propMap = propMap;

    this.tilemap.onTileChanged = (x, y, oldLayer, newLayer) => {
      if (this.currentStroke) {
        this.currentStroke.addChange(x, y, oldLayer, newLayer);
      }
    };

    this.propMap.onPropChanged = (change) => {
      if (this.currentPropStroke) {
        this.currentPropStroke.addChange(change);
      }
    };
  }

  chainTileCallback(cb: (x: number, y: number, oldLayer: number, newLayer: number) => void): void {
    const prev = this.tilemap.onTileChanged?.bind(this.tilemap);
    this.tilemap.onTileChanged = (x, y, oldLayer, newLayer) => {
      prev?.(x, y, oldLayer, newLayer);
      cb(x, y, oldLayer, newLayer);
    };
  }

  chainPropCallback(cb: (change: PropChange) => void): void {
    const prev = this.propMap.onPropChanged?.bind(this.propMap);
    this.propMap.onPropChanged = (change) => {
      prev?.(change);
      cb(change);
    };
  }

  beginStroke(): void {
    this.currentStroke = new StrokeCommand(this.tilemap);
    this.currentPropStroke = new PropStrokeCommand(this.propMap);
  }

  endStroke(): void {
    const cmds: HistoryCommand[] = [];
    if (this.currentStroke?.hasChanges) cmds.push(this.currentStroke);
    if (this.currentPropStroke?.hasChanges) cmds.push(this.currentPropStroke);

    if (cmds.length === 1) {
      this.undoStack.push(cmds[0]!);
      this.redoStack = [];
    } else if (cmds.length > 1) {
      this.undoStack.push(new CompositeCommand(cmds));
      this.redoStack = [];
    }

    this.currentStroke = null;
    this.currentPropStroke = null;
  }

  clearMap(): void {
    let hasContent = false;
    for (const _ of this.tilemap.allChunks()) { hasContent = true; break; }
    if (!hasContent) {
      for (const _ of this.propMap.all()) { hasContent = true; break; }
    }
    if (!hasContent) return;

    const command = new ClearCommand(this.tilemap, this.propMap);
    command.redo();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    this.withRecordingDisabled(() => cmd.undo());
    this.redoStack.push(cmd);
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    this.withRecordingDisabled(() => cmd.redo());
    this.undoStack.push(cmd);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private withRecordingDisabled(fn: () => void): void {
    const prevTile = this.tilemap.onTileChanged;
    const prevProp = this.propMap.onPropChanged;
    this.tilemap.onTileChanged = undefined;
    this.propMap.onPropChanged = undefined;
    fn();
    this.tilemap.onTileChanged = prevTile;
    this.propMap.onPropChanged = prevProp;
  }
}
