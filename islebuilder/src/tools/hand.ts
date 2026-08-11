import type { Tool, PreviewTile } from './toolsystem.ts';

export class HandTool implements Tool {
  onDown(): void {}
  onDrag(): void {}
  onUp(): void {}
  onCancel(): void {}
  getPreview(): PreviewTile[] { return []; }
}
