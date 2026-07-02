/**
 * Captura unificada de mouse/teclado. Não interpreta ferramentas de jogo —
 * apenas expõe estado bruto (posição, botões, wheel, drag de pan) para quem
 * consumir (câmera, ferramentas de desenho nas próximas sprints).
 */
export class InputManager {
  /** Posição do cursor em coordenadas de tela (CSS px, relativas ao canvas). */
  readonly pointer = { x: 0, y: 0 };

  private readonly target: HTMLElement;
  private readonly buttons = new Set<number>();
  private readonly keys = new Set<string>();
  private wheelAccum = 0;
  private readonly dragAccum = { x: 0, y: 0 };
  private dragActive = false;
  /** Quando true, clique esquerdo também inicia pan (ferramenta Mão). */
  private forcePanEnabled = false;
  private lastPointer = { x: 0, y: 0 };

  constructor(target: HTMLElement) {
    this.target = target;
    target.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    target.addEventListener('wheel', this.onWheel, { passive: false });
    target.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  dispose(): void {
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.target.removeEventListener('wheel', this.onWheel);
    this.target.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isButtonDown(button: number): boolean {
    return this.buttons.has(button);
  }

  isPanActive(): boolean {
    return this.dragActive;
  }

  /** Ativa pan por clique esquerdo (usado pela ferramenta Mão). */
  setForcePan(enabled: boolean): void {
    this.forcePanEnabled = enabled;
    if (!enabled && this.dragActive && !this.buttons.has(1)) {
      const spaceHeld = this.keys.has('Space');
      if (!spaceHeld || !this.buttons.has(0)) {
        this.dragActive = false;
      }
    }
  }

  /** Acumulado de deltaY da wheel desde o último consumo; zera ao ler. */
  consumeWheelDelta(): number {
    const delta = this.wheelAccum;
    this.wheelAccum = 0;
    return delta;
  }

  /** Delta de arrasto (pan) em px de tela desde o último consumo; null se parado. */
  consumeDragDelta(): { x: number; y: number } | null {
    if (this.dragAccum.x === 0 && this.dragAccum.y === 0) return null;
    const delta = { x: this.dragAccum.x, y: this.dragAccum.y };
    this.dragAccum.x = 0;
    this.dragAccum.y = 0;
    return delta;
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.buttons.add(e.button);
    this.updatePointer(e);
    const isMiddleClick = e.button === 1;
    const isSpaceDrag = e.button === 0 && this.keys.has('Space');
    const isHandDrag = e.button === 0 && this.forcePanEnabled;
    if (isMiddleClick || isSpaceDrag || isHandDrag) {
      this.dragActive = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    this.updatePointer(e);
    if (this.dragActive) {
      this.dragAccum.x += e.clientX - this.lastPointer.x;
      this.dragAccum.y += e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    this.buttons.delete(e.button);
    if (e.button === 1 || e.button === 0) {
      this.dragActive = false;
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.wheelAccum += e.deltaY;
    this.updatePointer(e);
  };

  private readonly onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') e.preventDefault();
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.buttons.clear();
    this.keys.clear();
    this.dragActive = false;
  };

  private updatePointer(e: MouseEvent): void {
    const rect = this.target.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  }
}
