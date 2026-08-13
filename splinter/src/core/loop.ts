/** Loop rAF com delta clampado. */
export class GameLoop {
  private update: (dt: number) => void;
  private last = 0;
  private running = false;

  constructor(update: (dt: number) => void) {
    this.update = update;
  }

  start(): void {
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.update(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
  }
}
