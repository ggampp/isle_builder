import { recipeOf } from '../puzzle/colors.ts';
import { dailyPuzzle, randomPuzzle, todayKey } from '../puzzle/daily.ts';
import type { DailyPuzzle } from '../puzzle/daily.ts';
import { isPlaceable } from '../puzzle/grid.ts';
import type { Mirror, Placements } from '../puzzle/grid.ts';
import { isSolved, simulate } from '../puzzle/simulate.ts';
import type { Simulation } from '../puzzle/simulate.ts';
import { GameAudio } from '../audio/audio.ts';
import { GameLoop } from '../core/loop.ts';
import { Board3D } from '../render/board3d.ts';
import { Hud } from '../ui/hud.ts';
import { loadProgress, saveProgress } from './progress.ts';

const CYCLE: (Mirror | null)[] = ['slash', 'backslash', null];

export class Game {
  private hud: Hud;
  private board: Board3D;
  private audio = new GameAudio();
  private current: DailyPuzzle;
  private placements: Placements = new Map();
  private sim: Simulation;
  private hover: number | null = null;
  private helpOpen = false;
  private difficultyId: string;
  private message = '';
  private startedAt = performance.now();
  private loop: GameLoop;
  private lastLit = 0;
  private lastMixCells = 0;
  private lastPick: number | null = null;

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
      onMute: (muted) => this.audio.setMuted(muted),
    });
    this.board = new Board3D(this.hud.canvas);

    this.current = dailyPuzzle(todayKey(), this.difficultyId);
    this.sim = simulate(this.current.puzzle, this.placements);
    if (progress.dateKey === this.current.dateKey && progress.difficultyId === this.difficultyId) {
      for (const [index, mirror] of progress.placements) {
        if (isPlaceable(this.current.puzzle, index)) this.placements.set(index, mirror);
      }
    }

    this.loop = new GameLoop((_dt, time) => {
      this.hover = this.board.hoverCell();
      this.board.sync(this.current.puzzle, this.placements, this.sim, this.hover);
      this.board.update(_dt, time, isSolved(this.current.puzzle, this.sim));
      this.publishDiagnostics();
    });

    this.hud.canvas.addEventListener('pointerdown', () => this.audio.unlock());
    this.hud.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('keydown', (e) => this.onKey(e));

    void this.board.ready.then(() => {
      this.hud.setLoading(false);
      this.refresh();
      this.loop.start();
    });
  }

  private loadPuzzle(next: DailyPuzzle): void {
    this.current = next;
    this.placements = new Map();
    this.message = '';
    this.startedAt = performance.now();
    this.lastLit = 0;
    this.lastMixCells = 0;
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
    this.audio.play('click', 0.7);
    this.refresh();
  }

  private refresh(): void {
    this.board.rebuild(this.current.puzzle);
    this.recompute();
  }

  private mixCellCount(sim: Simulation): number {
    let n = 0;
    const { puzzle } = this.current;
    for (let i = 0; i < puzzle.cells.length; i++) {
      let dirs = 0;
      for (let d = 0; d < 4; d++) if (sim.incoming[i * 4 + d]) dirs += 1;
      if (dirs >= 2) n += 1;
    }
    return n;
  }

  private recompute(): void {
    const { puzzle } = this.current;
    this.sim = simulate(puzzle, this.placements);

    const solved = isSolved(puzzle, this.sim);
    if (solved && !this.message.startsWith('Resolvido')) {
      const seconds = Math.max(1, Math.round((performance.now() - this.startedAt) / 1000));
      this.message = `Resolvido em ${seconds}s com ${this.placements.size} espelho(s)! `
        + 'Toda a luz chegou onde devia.';
      this.audio.play('win', 0.85);
    } else if (!solved && this.message.startsWith('Resolvido')) {
      this.message = '';
    }

    if (this.sim.lit.size > this.lastLit) this.audio.play('target', 0.8);
    this.lastLit = this.sim.lit.size;
    const mixes = this.mixCellCount(this.sim);
    if (mixes > this.lastMixCells) this.audio.playMix();
    this.lastMixCells = mixes;

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

  private onPointerUp(e: PointerEvent): void {
    if (this.helpOpen || this.board.didDrag()) return;
    const index = this.board.pickCell();
    this.lastPick = index;
    if (index === null || !isPlaceable(this.current.puzzle, index)) return;

    const current = this.placements.get(index) ?? null;
    const next = e.button === 2 ? null : CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

    if (next === null) {
      this.placements.delete(index);
      this.audio.play('remove', 0.7);
    } else {
      if (current === null && this.placements.size >= this.current.puzzle.mirrorBudget) {
        this.message = `Você só tem ${this.current.puzzle.mirrorBudget} espelhos — `
          + 'tire um do tabuleiro antes de pôr outro.';
        this.audio.play('error', 0.8);
        this.recompute();
        return;
      }
      this.placements.set(index, next);
      this.audio.play(current === null ? 'place' : 'flip', 0.75);
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
    if (e.code === 'KeyM') {
      this.audio.setMuted(!this.audio.muted);
    }
  }

  private publishDiagnostics(): void {
    const diag = this.board.scene.diagnostics();
    (window as unknown as { __THREE_GAME_DIAGNOSTICS__: unknown }).__THREE_GAME_DIAGNOSTICS__ = {
      ...diag,
      imported: this.board.models.stats,
      puzzle: this.current.puzzle.difficulty,
      mirrors: this.placements.size,
      hover: this.hover,
      lastPick: this.lastPick,
    };
  }
}
