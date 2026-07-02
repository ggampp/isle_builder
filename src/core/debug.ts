const FPS_SAMPLE_SECONDS = 0.5;

/** Overlay de FPS; só cria DOM/listeners quando `enabled` (gated por modo dev). */
export class DebugOverlay {
  private readonly el: HTMLDivElement | null;
  private frames = 0;
  private accumSeconds = 0;

  constructor(enabled: boolean) {
    if (!enabled) {
      this.el = null;
      return;
    }
    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:fixed;top:8px;left:8px;padding:4px 8px;' +
      'background:rgba(0,0,0,.55);color:#7CFC9A;font:12px monospace;' +
      'border-radius:4px;z-index:9999;pointer-events:none;white-space:pre;';
    this.el.textContent = 'FPS: --';
    document.body.appendChild(this.el);
  }

  update(dt: number): void {
    if (!this.el) return;
    this.frames += 1;
    this.accumSeconds += dt;
    if (this.accumSeconds >= FPS_SAMPLE_SECONDS) {
      const fps = Math.round(this.frames / this.accumSeconds);
      this.el.textContent = `FPS: ${fps}`;
      this.frames = 0;
      this.accumSeconds = 0;
    }
  }
}
