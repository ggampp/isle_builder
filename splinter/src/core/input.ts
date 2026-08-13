export class Input {
  readonly keys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  firing = false;
  locked = false;
  private queued = false;
  private canvas: HTMLElement;
  private lookPointer: number | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.firing = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.lookPointer = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.locked || this.lookPointer !== e.pointerId) return;
      this.mouseDX += e.clientX - this.lastX;
      this.mouseDY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerId === this.lookPointer) this.lookPointer = null;
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.locked || e.button !== 0) return;
      const t = e.target;
      if (t instanceof HTMLElement && t.closest('button')) return;
      this.firing = true;
      this.queued = true;
    });
    window.addEventListener('pointerup', () => { this.firing = false; });
    window.addEventListener('pointercancel', () => { this.firing = false; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.firing = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  isHolding(): boolean {
    return this.firing || this.queued;
  }

  consumeQueued(): void {
    this.queued = false;
  }

  consumeLook(): { dx: number; dy: number } {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  setFiring(down: boolean): void {
    this.firing = down;
    if (down) this.queued = true;
  }

  requestLock(): void {
    this.canvas.requestPointerLock();
  }
}
