import { HistoryManager } from './history.ts';

export interface PreviewTile {
  x: number;
  y: number;
  layer: number;
}

export interface Tool {
  onDown(worldX: number, worldY: number, layer: number): void;
  onDrag(worldX: number, worldY: number, layer: number): void;
  onUp(worldX: number, worldY: number, layer: number): void;
  onCancel(): void;
  getPreview(worldX: number, worldY: number, layer: number): PreviewTile[];
}

export class ToolSystem {
  private currentTool: Tool | null = null;
  private isDown = false;
  private lastWorld = { x: 0, y: 0 };
  private history: HistoryManager;

  constructor(history: HistoryManager) {
    this.history = history;
  }

  setTool(tool: Tool): void {
    if (this.isDown && this.currentTool) {
      this.currentTool.onCancel();
      this.history.endStroke();
    }
    this.currentTool = tool;
    this.isDown = false;
  }

  get activeTool(): Tool | null {
    return this.currentTool;
  }

  update(isButtonDown: boolean, worldX: number, worldY: number, layer: number): void {
    if (!this.currentTool) return;

    this.lastWorld.x = worldX;
    this.lastWorld.y = worldY;

    if (isButtonDown && !this.isDown) {
      this.isDown = true;
      this.history.beginStroke();
      this.currentTool.onDown(worldX, worldY, layer);
    } else if (isButtonDown && this.isDown) {
      this.currentTool.onDrag(worldX, worldY, layer);
    } else if (!isButtonDown && this.isDown) {
      this.isDown = false;
      this.currentTool.onUp(worldX, worldY, layer);
      this.history.endStroke();
    }
  }

  getPreview(layer: number): PreviewTile[] {
    if (!this.currentTool) return [];
    return this.currentTool.getPreview(this.lastWorld.x, this.lastWorld.y, layer);
  }
}
