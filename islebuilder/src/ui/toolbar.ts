import { createIconImg, TOOL_CURSORS, type UiIconId } from './uiIcons.ts';

export type ToolId = 'brush' | 'line' | 'rect' | 'bucket' | 'eraser' | 'dropper' | 'hand';

export interface ToolbarCallbacks {
  onToolChanged: (tool: ToolId) => void;
  onRadiusChanged: (radius: number) => void;
  onSpaceChanged: (space: number) => void;
}

export class Toolbar {
  private selectedToolId: ToolId = 'brush';
  private readonly toolButtons = new Map<ToolId, HTMLButtonElement>();
  private callbacks: ToolbarCallbacks;

  private radiusInput: HTMLInputElement;
  private spaceInput: HTMLInputElement;

  constructor(parent: HTMLElement, callbacks: ToolbarCallbacks) {
    this.callbacks = callbacks;
    const root = document.createElement('div');
    root.className = 'toolbar-root';
    root.style.cssText =
      'position:fixed;top:50%;left:16px;transform:translateY(-50%);' +
      'display:flex;flex-direction:column;gap:16px;z-index:9999;';

    const toolsPanel = document.createElement('div');
    toolsPanel.className = 'isle-panel';
    toolsPanel.style.display = 'flex';
    toolsPanel.style.flexDirection = 'column';
    toolsPanel.style.gap = '6px';

    const tools: { id: ToolId; icon: UiIconId; title: string }[] = [
      { id: 'brush', icon: 'brush', title: 'Brush (B)' },
      { id: 'line', icon: 'line', title: 'Line (L)' },
      { id: 'rect', icon: 'rect', title: 'Rectangle (R)' },
      { id: 'bucket', icon: 'bucket', title: 'Bucket (G)' },
      { id: 'eraser', icon: 'eraser', title: 'Eraser (E)' },
      { id: 'dropper', icon: 'dropper', title: 'Dropper (I)' },
      { id: 'hand', icon: 'hand', title: 'Hand (H)' },
    ];

    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.className = 'icon-btn';
      btn.title = tool.title;
      btn.appendChild(createIconImg(tool.icon, 22));
      btn.addEventListener('click', () => this.setTool(tool.id));
      this.toolButtons.set(tool.id, btn);
      toolsPanel.appendChild(btn);
    }

    const slidersPanel = document.createElement('div');
    slidersPanel.className = 'isle-panel';
    slidersPanel.style.display = 'flex';
    slidersPanel.style.flexDirection = 'column';
    slidersPanel.style.gap = '6px';

    this.radiusInput = document.createElement('input');
    const radiusRow = this.createSliderRow('size', 'SIZE', 10, 30, 10, this.radiusInput, (val) => this.callbacks.onRadiusChanged(val));

    this.spaceInput = document.createElement('input');
    const spaceRow = this.createSliderRow('space', 'SPACE', 1, 10, 1, this.spaceInput, (val) => this.callbacks.onSpaceChanged(val));

    slidersPanel.append(radiusRow, spaceRow);
    root.append(toolsPanel, slidersPanel);
    parent.appendChild(root);

    this.updateButtons();
  }

  setTool(tool: ToolId): void {
    this.selectedToolId = tool;
    this.updateButtons();
    this.callbacks.onToolChanged(tool);
  }

  get activeTool(): ToolId {
    return this.selectedToolId;
  }

  get activeCursor(): string {
    return TOOL_CURSORS[this.selectedToolId] ?? 'default';
  }

  private updateButtons(): void {
    for (const [key, btn] of this.toolButtons) {
      btn.classList.toggle('active', key === this.selectedToolId);
    }
  }

  private createSliderRow(
    iconId: UiIconId,
    label: string,
    min: number,
    max: number,
    defaultVal: number,
    inputEl: HTMLInputElement,
    onChange: (val: number) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'srow';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'emoji';
    iconWrap.appendChild(createIconImg(iconId, 18));

    const middle = document.createElement('div');

    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = label;

    const track = document.createElement('div');
    track.className = 'track';

    const fill = document.createElement('div');
    fill.className = 'track-fill';

    const knob = document.createElement('div');
    knob.className = 'track-knob';

    inputEl.type = 'range';
    inputEl.className = 'hidden-slider';
    inputEl.min = min.toString();
    inputEl.max = max.toString();
    inputEl.value = defaultVal.toString();

    const valEl = document.createElement('div');
    valEl.className = 'val';

    const updateVisuals = () => {
      const v = Number(inputEl.value);
      valEl.textContent = v.toString();
      const pct = ((v - min) / (max - min)) * 100;
      fill.style.width = `${pct}%`;
      knob.style.left = `${pct}%`;
    };

    inputEl.addEventListener('input', () => {
      updateVisuals();
      onChange(Number(inputEl.value));
    });

    updateVisuals();

    track.append(fill, knob, inputEl);
    middle.append(lbl, track);
    row.append(iconWrap, middle, valEl);

    return row;
  }
}
