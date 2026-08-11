/** Estado cru de pointer/teclado/wheel, mesmo papel do InputManager do Isle Builder. */
export class InputManager {
  readonly keys = new Set<string>();
  pointerX = 0;
  pointerY = 0;
  deltaX = 0;
  deltaY = 0;
  wheelDelta = 0;
  private buttons = 0;
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private dragDistance = 0;
  private pendingClick: { x: number; y: number } | null = null;
  private pressedKeys: string[] = [];

  constructor(el: HTMLElement) {
    el.addEventListener('pointerdown', (e) => {
      this.buttons |= 1 << e.button;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (e.button === 0) {
        this.downX = e.clientX;
        this.downY = e.clientY;
        this.dragDistance = 0;
      }
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointerup', (e) => {
      this.buttons &= ~(1 << e.button);
      // Clique = pressionar e soltar praticamente no mesmo ponto; arrastar move a câmera.
      if (e.button === 0 && this.dragDistance < 5) {
        this.pendingClick = { x: this.downX, y: this.downY };
      }
    });
    el.addEventListener('pointermove', (e) => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      if (this.buttons !== 0) {
        this.deltaX += e.clientX - this.lastX;
        this.deltaY += e.clientY - this.lastY;
        this.dragDistance += Math.hypot(e.clientX - this.lastX, e.clientY - this.lastY);
      }
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelDelta += e.deltaY;
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressedKeys.push(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.buttons = 0;
    });
  }

  isButtonDown(button: number): boolean {
    return (this.buttons & (1 << button)) !== 0;
  }

  /** Devolve o clique pendente (sem arrasto) e o consome. */
  consumeClick(): { x: number; y: number } | null {
    const click = this.pendingClick;
    this.pendingClick = null;
    return click;
  }

  /** Teclas pressionadas desde o último frame (uma vez por pressionamento). */
  consumePressedKeys(): string[] {
    const keys = this.pressedKeys;
    this.pressedKeys = [];
    return keys;
  }

  /** Consome os acumuladores de drag/wheel — chamar uma vez por frame. */
  consumeFrameDeltas(): { dx: number; dy: number; wheel: number } {
    const out = { dx: this.deltaX, dy: this.deltaY, wheel: this.wheelDelta };
    this.deltaX = 0;
    this.deltaY = 0;
    this.wheelDelta = 0;
    return out;
  }
}
