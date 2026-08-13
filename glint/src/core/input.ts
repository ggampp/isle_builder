export class Input {
  readonly keys = new Set<string>();
  stickX = 0;
  stickZ = 0;
  private attackQueued = false;
  private attackHeld = false;

  constructor(canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space') this.attackQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.attackHeld = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.closest('button')) return;
      this.attackQueued = true;
      this.attackHeld = true;
    });
    window.addEventListener('pointerup', () => { this.attackHeld = false; });
    window.addEventListener('pointercancel', () => { this.attackHeld = false; });
  }

  axis(): { x: number; z: number } {
    let x = this.stickX;
    let z = this.stickZ;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  consumeAttack(): boolean {
    const hit = this.attackQueued || this.attackHeld;
    this.attackQueued = false;
    return hit;
  }

  queueAttack(): void {
    this.attackQueued = true;
  }
}
