import './styles.css';
import type { WeaponDef, WeaponId } from '../weapons/catalog.ts';
import { WEAPONS } from '../weapons/catalog.ts';

export interface HudState {
  weapon: WeaponDef;
  integrity: number;
  score: number;
  paused: boolean;
  locked: boolean;
  collapsed: boolean;
  muted: boolean;
}

export class Hud {
  readonly canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private titleEl: HTMLElement;
  private meterFill: HTMLElement;
  private scoreEl: HTMLElement;
  private overlay: HTMLElement;
  private overlayText: HTMLElement;
  private slots = new Map<WeaponId, HTMLButtonElement>();
  private onSelect: (id: WeaponId) => void;
  private onReset: () => void;
  private onMute: () => void;

  constructor(
    parent: HTMLElement,
    handlers: {
      onSelect: (id: WeaponId) => void;
      onReset: () => void;
      onMute: () => void;
      onFire: (down: boolean) => void;
    },
  ) {
    this.onSelect = handlers.onSelect;
    this.onReset = handlers.onReset;
    this.onMute = handlers.onMute;

    this.root = document.createElement('div');
    this.root.id = 'hud';
    parent.appendChild(this.root);

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'view';
    this.root.appendChild(this.canvas);

    this.titleEl = el('div', 'weapon-title', 'Shotgun');
    this.root.appendChild(this.titleEl);

    const meter = el('div', 'integrity');
    meter.innerHTML = '<span>vila</span>';
    this.meterFill = el('div', 'integrity-fill');
    meter.appendChild(this.meterFill);
    this.root.appendChild(meter);

    this.scoreEl = el('div', 'score', '0');
    this.root.appendChild(this.scoreEl);

    const bar = el('div', 'hotbar');
    for (const w of WEAPONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.dataset.id = w.id;
      btn.innerHTML = `<span class="num">${w.slot}</span>
        <span class="ico" aria-hidden="true">${iconFor(w.id)}</span>
        <span class="lab">${w.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelect(w.id);
      });
      bar.appendChild(btn);
      this.slots.set(w.id, btn);
    }
    this.root.appendChild(bar);

    const tools = el('div', 'tools');
    tools.appendChild(this.toolBtn('R', 'reset', () => this.onReset()));
    tools.appendChild(this.toolBtn('M', 'som', () => this.onMute()));
    this.root.appendChild(tools);

    const fire = document.createElement('button');
    fire.type = 'button';
    fire.className = 'fire-btn';
    fire.textContent = 'FOGO';
    fire.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlers.onFire(true);
    });
    fire.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      handlers.onFire(false);
    });
    fire.addEventListener('pointercancel', () => handlers.onFire(false));
    this.root.appendChild(fire);

    this.overlay = el('div', 'overlay');
    this.overlayText = el('p', 'overlay-copy', 'Clique para entrar na praça');
    const hint = el('p', 'overlay-hint', 'WASD move · mouse mira · 1–5 armas · R reconstrói · Esc solta o mouse · coreto à esquerda');
    this.overlay.appendChild(this.overlayText);
    this.overlay.appendChild(hint);
    this.root.appendChild(this.overlay);

    const cross = el('div', 'crosshair');
    this.root.appendChild(cross);
  }

  private toolBtn(key: string, label: string, fn: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tool';
    b.innerHTML = `<kbd>${key}</kbd> ${label}`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  }

  render(state: HudState): void {
    this.titleEl.textContent = state.weapon.label;
    this.meterFill.style.width = `${Math.round(state.integrity * 100)}%`;
    this.scoreEl.textContent = String(state.score).padStart(4, '0');
    for (const [id, btn] of this.slots) {
      btn.classList.toggle('active', id === state.weapon.id);
    }
    this.overlay.classList.toggle('hidden', state.locked && !state.paused && !state.collapsed);
    if (state.collapsed) {
      this.overlayText.textContent = 'O pórtico caiu. R para reconstruir.';
    } else if (state.paused || !state.locked) {
      this.overlayText.textContent = 'Clique para entrar na praça';
    }
  }
}

function iconFor(id: WeaponId): string {
  switch (id) {
    case 'bullet': return '•';
    case 'shotgun': return '≡';
    case 'rifle': return '—';
    case 'bomb': return '*';
    case 'laser': return '▸';
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
