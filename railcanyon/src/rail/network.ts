import { WATER_LEVEL, heightAt } from '../world/heightfield.ts';
import { PIECE_SPECS, pieceEnd, samplePiece } from './geometry.ts';
import type { PieceKind, Pose } from './geometry.ts';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlacedPiece {
  kind: PieceKind;
  start: Pose;
  end: Pose;
}

export interface TrackPath {
  /** Pontos igualmente espaçados ao longo da linha (~1 por metro de arco). */
  points: Vec3[];
  /** Distância acumulada até cada ponto. */
  distances: number[];
  totalLength: number;
}

export interface PlacementCheck {
  ok: boolean;
  reason: string;
}

/** Metros de arco entre pontos amostrados do caminho. */
const SAMPLE_STEP = 1.5;
/** Folga mínima do tabuleiro acima da água (vira ponte de cavalete). */
const BRIDGE_CLEARANCE = 3.4;
/** Altura do trilho acima do solo. */
const RAIL_LIFT = 0.14;
/** Rampa máxima aceita (subida por metro percorrido). */
const MAX_GRADE = 0.3;
const WORLD_LIMIT = 205;

/**
 * A linha férrea construída pelo jogador: uma sequência de peças a partir de
 * uma origem fixa. Toda a lógica é pura (só depende da heightfield), então
 * validação e caminho podem ser testados sem navegador.
 */
export class RailNetwork {
  readonly origin: Pose;
  private pieces: PlacedPiece[] = [];
  private cachedPath: TrackPath | null = null;

  constructor(origin: Pose) {
    this.origin = { ...origin };
  }

  get count(): number {
    return this.pieces.length;
  }

  get railhead(): Pose {
    const last = this.pieces[this.pieces.length - 1];
    return last ? { ...last.end } : { ...this.origin };
  }

  list(): ReadonlyArray<PlacedPiece> {
    return this.pieces;
  }

  kinds(): PieceKind[] {
    return this.pieces.map((p) => p.kind);
  }

  /** Verifica se a peça pode ser assentada na ponta atual da linha. */
  canPlace(kind: PieceKind): PlacementCheck {
    const start = this.railhead;
    const end = pieceEnd(start, kind);
    if (Math.abs(end.x) > WORLD_LIMIT || Math.abs(end.z) > WORLD_LIMIT) {
      return { ok: false, reason: 'Fora dos limites do vale' };
    }

    const trial = this.pieces.concat([{ kind, start, end }]);
    const path = buildPath(this.origin, trial);
    const newFrom = Math.max(0, path.points.length - Math.ceil(PIECE_SPECS[kind].length / SAMPLE_STEP) - 1);
    for (let i = newFrom + 1; i < path.points.length; i++) {
      const ds = path.distances[i] - path.distances[i - 1];
      if (ds <= 0) continue;
      const grade = Math.abs(path.points[i].y - path.points[i - 1].y) / ds;
      if (grade > MAX_GRADE) {
        return { ok: false, reason: 'Rampa íngreme demais' };
      }
    }
    return { ok: true, reason: '' };
  }

  place(kind: PieceKind): PlacementCheck {
    const check = this.canPlace(kind);
    if (!check.ok) return check;
    const start = this.railhead;
    this.pieces.push({ kind, start, end: pieceEnd(start, kind) });
    this.cachedPath = null;
    return check;
  }

  /** Remove a última peça; devolve o tipo removido (ou null se vazia). */
  undo(): PieceKind | null {
    const removed = this.pieces.pop();
    if (!removed) return null;
    this.cachedPath = null;
    return removed.kind;
  }

  /** Recria a linha a partir de uma lista de tipos (carregar jogo salvo). */
  restore(kinds: PieceKind[]): void {
    this.pieces = [];
    this.cachedPath = null;
    let pose = { ...this.origin };
    for (const kind of kinds) {
      const end = pieceEnd(pose, kind);
      this.pieces.push({ kind, start: { ...pose }, end });
      pose = end;
    }
  }

  path(): TrackPath {
    if (!this.cachedPath) this.cachedPath = buildPath(this.origin, this.pieces);
    return this.cachedPath;
  }
}

/**
 * Amostra as peças e resolve a altura do tabuleiro: acompanha o terreno, mas
 * mantém folga sobre a água e é suavizado, o que produz rampas suaves e um
 * vão de ponte sobre o rio.
 */
export function buildPath(origin: Pose, pieces: ReadonlyArray<PlacedPiece>): TrackPath {
  const poses: Pose[] = [{ ...origin }];
  for (const piece of pieces) {
    const steps = Math.max(2, Math.round(PIECE_SPECS[piece.kind].length / SAMPLE_STEP));
    poses.push(...samplePiece(piece.start, piece.kind, steps));
  }

  const ground = poses.map((p) => heightAt(p.x, p.z));
  const y = ground.map((g) => Math.max(g, WATER_LEVEL + BRIDGE_CLEARANCE));

  // Suavizar e reimpor o piso do terreno: o resultado é plano sobre o vão e
  // acompanha o relevo em terra firme.
  for (let pass = 0; pass < 24; pass++) {
    const prev = y.slice();
    for (let i = 1; i < y.length - 1; i++) {
      y[i] = (prev[i - 1] + prev[i] * 2 + prev[i + 1]) / 4;
    }
    for (let i = 0; i < y.length; i++) {
      y[i] = Math.max(y[i], ground[i], WATER_LEVEL + BRIDGE_CLEARANCE * (ground[i] < WATER_LEVEL ? 1 : 0));
    }
  }

  const points: Vec3[] = poses.map((p, i) => ({ x: p.x, y: y[i] + RAIL_LIFT, z: p.z }));
  const distances: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    distances.push(distances[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return { points, distances, totalLength: distances[distances.length - 1] ?? 0 };
}

/** Posição e direção a uma distância `s` ao longo do caminho. */
export function sampleAt(path: TrackPath, s: number): { position: Vec3; tangent: Vec3 } {
  const { points, distances } = path;
  if (points.length < 2) {
    const p = points[0] ?? { x: 0, y: 0, z: 0 };
    return { position: { ...p }, tangent: { x: 1, y: 0, z: 0 } };
  }
  const clamped = Math.min(Math.max(s, 0), path.totalLength);
  let lo = 0;
  let hi = distances.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (distances[mid] <= clamped) lo = mid;
    else hi = mid;
  }
  const span = distances[hi] - distances[lo];
  const t = span > 0 ? (clamped - distances[lo]) / span : 0;
  const a = points[lo];
  const b = points[hi];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return {
    position: { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t },
    tangent: { x: dx / len, y: dy / len, z: dz / len },
  };
}

/** Menor distância horizontal do caminho a um ponto, e o `s` correspondente. */
export function closestOnPath(path: TrackPath, x: number, z: number): { distance: number; s: number } {
  let best = Infinity;
  let bestS = 0;
  for (let i = 0; i < path.points.length; i++) {
    const p = path.points[i];
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best) {
      best = d;
      bestS = path.distances[i];
    }
  }
  return { distance: best, s: bestS };
}
