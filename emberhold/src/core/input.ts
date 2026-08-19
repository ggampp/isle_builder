import { screenToWorld } from '../render/iso.ts';
import type { Camera } from '../render/worldview.ts';
import type { BuildKind } from '../sim/types.ts';

export class Input {
  readonly keys = new Set<string>();
  stickX = 0;
  stickY = 0;
  pointer = { x: 0, y: 0 };
  left = false;
  right = false;
  private attackQueued = false;
  private magicQueued = false;
  private repairQueued = false;
  buildPick: BuildKind | null = null;
  zoomDelta = 0;

  constructor(canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space') this.attackQueued = true;
      if (e.code === 'KeyF') this.magicQueued = true;
      if (e.code === 'Digit1') this.buildPick = 'wall';
      if (e.code === 'Digit2') this.buildPick = 'tower';
      if (e.code === 'Digit3') this.buildPick = 'house';
      if (e.code === 'Digit4') this.buildPick = 'fortress';
      if (e.code === 'Escape') this.buildPick = null;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
    });
    canvas.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.closest('button, .panel, .pet-card, .help, .build-dock')) return;
      const r = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
      if (e.button === 2) {
        this.right = true;
        this.repairQueued = true;
      } else {
        this.left = true;
        this.attackQueued = true;
      }
    });
    window.addEventListener('pointerup', () => {
      this.left = false;
      this.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomDelta += e.deltaY > 0 ? -0.08 : 0.08;
    }, { passive: false });
  }

  axis(): { x: number; y: number } {
    let x = this.stickX;
    let y = this.stickY;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const isoX = (x + y);
    const isoY = (y - x);
    const len = Math.hypot(isoX, isoY);
    if (len > 1) return { x: isoX / len, y: isoY / len };
    return { x: isoX, y: isoY };
  }

  consumeAttack(): boolean {
    const hit = this.attackQueued;
    this.attackQueued = false;
    return hit;
  }

  consumeMagic(): boolean {
    const hit = this.magicQueued;
    this.magicQueued = false;
    return hit;
  }

  consumeRepair(): boolean {
    const hit = this.repairQueued;
    this.repairQueued = false;
    return hit;
  }

  consumeBuild(): BuildKind | null {
    const k = this.buildPick;
    this.buildPick = null;
    return k;
  }

  consumeZoom(cam: Camera): void {
    if (!this.zoomDelta) return;
    cam.zoom = Math.min(1.8, Math.max(0.7, cam.zoom + this.zoomDelta));
    this.zoomDelta = 0;
  }

  worldUnder(cam: Camera, canvas: HTMLCanvasElement): { x: number; y: number } {
    const scaleX = canvas.width / Math.max(1, canvas.clientWidth);
    const scaleY = canvas.height / Math.max(1, canvas.clientHeight);
    const sx = this.pointer.x * scaleX - canvas.width / 2;
    const sy = this.pointer.y * scaleY - canvas.height / 2;
    const local = screenToWorld(sx / cam.zoom, sy / cam.zoom);
    return { x: local.x + cam.x, y: local.y + cam.y };
  }
}
