import { recipeOf } from '../puzzle/colors.ts';
import { dailyPuzzle, randomPuzzle, todayKey } from '../puzzle/daily.ts';
import type { DailyPuzzle } from '../puzzle/daily.ts';
import { isPlaceable } from '../puzzle/grid.ts';
import type { Mirror, Placements } from '../puzzle/grid.ts';
import { isSolved, simulate } from '../puzzle/simulate.ts';
import type { Simulation } from '../puzzle/simulate.ts';
import { BoardRenderer } from '../render/board.ts';
import { Hud } from '../ui/hud.ts';
import { loadProgress, saveProgress } from './progress.ts';

/** Ordem do clique numa célula: vazio → / → \ → vazio. */
const CYCLE: (Mirror | null)[] = ['slash', 'backslash', null];

export class Game {
  private hud: Hud;
  private board: BoardRenderer;
  private current: DailyPuzzle;
  private placements: Placements = new Map();
  private sim: Simulation;
  private hover: number | null = null;
  private helpOpen = false;
  private difficultyId: string;
  private message = '';
  private startedAt = performance.now();

  constructor(mount: HTMLElement) {
    const progress = loadProgress();
    this.difficultyId = progress.difficultyId;

    this.hud = new Hud(mount, {
      onClear: () => this.clearBoard(),
      onNewPuzzle: () => this.loadPuzzle(randomPuzzle(this.difficultyId)),
      onDifficulty: (id) => this.selectDifficulty(id),
      onHelp: (open) => {
        this.helpOpen = open;
        this.hud.setHelpOpen(open);
      },
    });
    this.board = new BoardRenderer(this.hud.canvas);

    this.current = dailyPuzzle(todayKey(), this.difficultyId);
    this.sim = simulate(this.current.puzzle, this.placements);
    // Retoma os espelhos do desafio de hoje, se houver.
    if (progress.dateKey === this.current.dateKey && progress.difficultyId === this.difficultyId) {
      for (const [index, mirror] of progress.placements) {
        if (isPlaceable(this.current.puzzle, index)) this.placements.set(index, mirror);
      }
    }
    this.refresh();

    this.hud.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.hud.canvas.addEventListener('pointerleave', () => { this.hover = null; });
    this.hud.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.hud.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', () => {
      this.board.resize(this.current.puzzle);
      this.draw();
    });

    const tick = (): void => {
      this.draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Ciclo de vida do tabuleiro ─────────────────────────────────────

  private loadPuzzle(next: DailyPuzzle): void {
    this.current = next;
    this.placements = new Map();
    this.message = '';
    this.startedAt = performance.now();
    this.refresh();
  }

  private selectDifficulty(id: string): void {
    if (id === this.difficultyId) return;
    this.difficultyId = id;
    this.loadPuzzle(dailyPuzzle(todayKey(), id));
  }

  private clearBoard(): void {
    this.placements.clear();
    this.message = 'Tabuleiro limpo.';
    this.refresh();
  }

  private refresh(): void {
    this.board.resize(this.current.puzzle);
    this.recompute();
  }

  private recompute(): void {
    const { puzzle } = this.current;
    this.sim = simulate(puzzle, this.placements);

    const solved = isSolved(puzzle, this.sim);
    if (solved && !this.message.startsWith('Resolvido')) {
      const seconds = Math.max(1, Math.round((performance.now() - this.startedAt) / 1000));
      this.message = `Resolvido em ${seconds}s com ${this.placements.size} espelho(s)! `
        + 'Toda a luz chegou onde devia.';
    } else if (!solved && this.message.startsWith('Resolvido')) {
      this.message = '';
    }

    if (this.current.isDaily && this.current.dateKey === todayKey()) {
      saveProgress({
        dateKey: this.current.dateKey,
        difficultyId: this.difficultyId,
        placements: [...this.placements],
        solved,
      });
    }

    const targets = puzzle.cells.filter((c) => c.kind === 'target').length;
    this.hud.update({
      dateKey: this.current.dateKey,
      difficultyId: this.difficultyId,
      difficultyLabel: this.current.difficulty.label,
      isDaily: this.current.isDaily,
      mirrorsUsed: this.placements.size,
      mirrorBudget: puzzle.mirrorBudget,
      targetsLit: this.sim.lit.size,
      targetsTotal: targets,
      message: this.message || this.hint(),
      solved,
    }, puzzle, this.sim);
  }

  /** Dica curta baseada no estado atual, no lugar de uma mensagem vazia. */
  private hint(): string {
    const { puzzle } = this.current;
    if (this.placements.size === 0) {
      return 'Clique numa célula vazia para pôr um espelho. Clique de novo para virá-lo.';
    }
    if (this.sim.wrong.size > 0) {
      const index = [...this.sim.wrong][0];
      const cell = puzzle.cells[index];
      if (cell.kind === 'target') {
        return `Um alvo pede <b>${recipeOf(cell.want)}</b>, mas está recebendo `
          + `<b>${recipeOf(this.sim.atCell[index])}</b>.`;
      }
    }
    const missing = puzzle.mirrorBudget - this.placements.size;
    if (missing <= 0) return 'Acabaram os espelhos — reposicione algum para abrir espaço.';
    return `Faltam ${this.sim.lit.size === 0 ? '' : 'ainda '}`
      + `${missing} espelho(s) no seu estoque.`;
  }

  // ── Interação ──────────────────────────────────────────────────────

  private cellFromEvent(e: PointerEvent | MouseEvent): number | null {
    const rect = this.hud.canvas.getBoundingClientRect();
    return this.board.cellFromPoint(
      e.clientX - rect.left, e.clientY - rect.top, this.current.puzzle);
  }

  private onPointerMove(e: PointerEvent): void {
    this.hover = this.cellFromEvent(e);
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.helpOpen) return;
    const index = this.cellFromEvent(e);
    if (index === null || !isPlaceable(this.current.puzzle, index)) return;

    const current = this.placements.get(index) ?? null;
    // Botão direito remove direto; o esquerdo percorre o ciclo.
    const next = e.button === 2 ? null : CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

    if (next === null) {
      this.placements.delete(index);
    } else {
      if (current === null && this.placements.size >= this.current.puzzle.mirrorBudget) {
        this.message = `Você só tem ${this.current.puzzle.mirrorBudget} espelhos — `
          + 'tire um do tabuleiro antes de pôr outro.';
        this.recompute();
        return;
      }
      this.placements.set(index, next);
    }
    if (this.message && !this.message.startsWith('Resolvido')) this.message = '';
    this.recompute();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      this.helpOpen = false;
      this.hud.setHelpOpen(false);
    }
    if (e.code === 'KeyC') this.clearBoard();
    if (e.code === 'KeyN') this.loadPuzzle(randomPuzzle(this.difficultyId));
  }

  private draw(): void {
    this.board.draw(
      this.current.puzzle, this.placements, this.sim,
      this.hover, performance.now() / 1000,
    );
  }
}
