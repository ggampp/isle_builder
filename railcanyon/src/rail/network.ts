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
  /** Pontos ao longo da linha (1 por pose amostrada). */
  points: Vec3[];
  /** Distância acumulada até cada ponto. */
  distances: number[];
  totalLength: number;
}

export interface PlacementCheck {
  ok: boolean;
  reason: string;
}

/** Ponto de derivação de um desvio: índice de pose na linha-mãe. */
export interface Anchor {
  lineId: number;
  poseIndex: number;
}

export interface Line {
  id: number;
  name: string;
  /** null na linha principal. */
  anchor: Anchor | null;
  origin: Pose;
  pieces: PlacedPiece[];
}

export interface SerializedLine {
  anchorLineId: number | null;
  anchorPoseIndex: number;
  kinds: PieceKind[];
}

/** Devolve true se o ponto está obstruído (pedra, por exemplo). */
export type ObstacleCheck = (x: number, z: number) => boolean;

/** Metros de arco entre poses amostradas. */
const SAMPLE_STEP = 1.5;
/** Folga mínima do tabuleiro acima da água (vira ponte de cavalete). */
const BRIDGE_CLEARANCE = 3.4;
/** Altura do trilho acima do solo. */
const RAIL_LIFT = 0.14;
/** Rampa máxima aceita (subida por metro percorrido). */
const MAX_GRADE = 0.3;
const WORLD_LIMIT = 205;

function stepsFor(kind: PieceKind): number {
  return Math.max(2, Math.round(PIECE_SPECS[kind].length / SAMPLE_STEP));
}

/**
 * A malha ferroviária construída pelo jogador: uma linha principal mais os
 * desvios, cada um ancorado numa pose de outra linha. Toda a lógica é pura
 * (só depende da heightfield), então pode ser testada sem navegador.
 */
export class RailNetwork {
  private lines: Line[] = [];
  private nextId = 1;
  private pathCache = new Map<number, TrackPath>();
  activeLineId = 0;

  constructor(origin: Pose) {
    this.lines.push({
      id: 0,
      name: 'Linha principal',
      anchor: null,
      origin: { ...origin },
      pieces: [],
    });
  }

  get count(): number {
    return this.lines.reduce((total, line) => total + line.pieces.length, 0);
  }

  get lineCount(): number {
    return this.lines.length;
  }

  list(): ReadonlyArray<Line> {
    return this.lines;
  }

  line(id: number): Line | undefined {
    return this.lines.find((l) => l.id === id);
  }

  /** Nome da linha (para a HUD). */
  lineName(id: number): string {
    return this.line(id)?.name ?? 'Linha';
  }

  get activeLine(): Line {
    return this.line(this.activeLineId) ?? this.lines[0];
  }

  setActiveLine(id: number): void {
    if (this.line(id)) this.activeLineId = id;
  }

  /** Alterna para a próxima linha, em ordem de criação. */
  cycleActiveLine(): number {
    const index = this.lines.findIndex((l) => l.id === this.activeLineId);
    this.activeLineId = this.lines[(index + 1) % this.lines.length].id;
    return this.activeLineId;
  }

  get railhead(): Pose {
    const line = this.activeLine;
    const last = line.pieces[line.pieces.length - 1];
    return last ? { ...last.end } : { ...line.origin };
  }

  /** Poses de uma linha, já incluindo o trecho herdado da linha-mãe. */
  posesFor(id: number): Pose[] {
    const line = this.line(id);
    if (!line) return [];
    const poses: Pose[] = line.anchor
      ? this.posesFor(line.anchor.lineId).slice(0, line.anchor.poseIndex + 1)
      : [{ ...line.origin }];
    if (line.anchor && poses.length === 0) poses.push({ ...line.origin });
    for (const piece of line.pieces) {
      poses.push(...samplePiece(piece.start, piece.kind, stepsFor(piece.kind)));
    }
    return poses;
  }

  path(id: number = this.activeLineId): TrackPath {
    const cached = this.pathCache.get(id);
    if (cached) return cached;
    const built = buildPathFromPoses(this.posesFor(id));
    this.pathCache.set(id, built);
    return built;
  }

  private invalidate(): void {
    this.pathCache.clear();
  }

  /** Verifica se a peça pode ser assentada na ponta da linha ativa. */
  canPlace(kind: PieceKind, obstacle?: ObstacleCheck): PlacementCheck {
    const line = this.activeLine;
    const start = this.railhead;
    const end = pieceEnd(start, kind);
    if (Math.abs(end.x) > WORLD_LIMIT || Math.abs(end.z) > WORLD_LIMIT) {
      return { ok: false, reason: 'Fora dos limites do vale' };
    }

    const newPoses = samplePiece(start, kind, stepsFor(kind));
    if (obstacle) {
      for (const pose of newPoses) {
        if (obstacle(pose.x, pose.z)) {
          return { ok: false, reason: 'Pedra no caminho — use a dinamite' };
        }
      }
    }

    const trial = this.posesFor(line.id).concat(newPoses);
    const path = buildPathFromPoses(trial);
    const from = path.points.length - newPoses.length;
    for (let i = Math.max(1, from); i < path.points.length; i++) {
      const ds = path.distances[i] - path.distances[i - 1];
      if (ds <= 0) continue;
      const grade = Math.abs(path.points[i].y - path.points[i - 1].y) / ds;
      if (grade > MAX_GRADE) return { ok: false, reason: 'Rampa íngreme demais' };
    }
    return { ok: true, reason: '' };
  }

  place(kind: PieceKind, obstacle?: ObstacleCheck): PlacementCheck {
    const check = this.canPlace(kind, obstacle);
    if (!check.ok) return check;
    const start = this.railhead;
    this.activeLine.pieces.push({ kind, start, end: pieceEnd(start, kind) });
    this.invalidate();
    return check;
  }

  /**
   * Remove a última peça da linha ativa. Recusa se um desvio depender do
   * trecho removido; devolve o tipo removido ou null.
   */
  undo(): { kind: PieceKind | null; reason: string } {
    const line = this.activeLine;
    const last = line.pieces[line.pieces.length - 1];
    if (!last) return { kind: null, reason: 'Não há peças para desfazer nesta linha.' };

    const remaining = this.posesFor(line.id).length - stepsFor(last.kind);
    const dependent = this.lines.some((other) =>
      other.anchor?.lineId === line.id && other.anchor.poseIndex >= remaining);
    if (dependent) {
      return { kind: null, reason: 'Há um desvio saindo desse trecho.' };
    }

    line.pieces.pop();
    this.invalidate();
    return { kind: last.kind, reason: '' };
  }

  /** Cria um desvio saindo de uma pose de uma linha existente. */
  addBranch(parentLineId: number, poseIndex: number): number | null {
    const poses = this.posesFor(parentLineId);
    if (poseIndex < 1 || poseIndex >= poses.length) return null;
    const id = this.nextId++;
    this.lines.push({
      id,
      name: `Desvio ${id}`,
      anchor: { lineId: parentLineId, poseIndex },
      origin: { ...poses[poseIndex] },
      pieces: [],
    });
    this.activeLineId = id;
    this.invalidate();
    return id;
  }

  /** Pose mais próxima de um ponto, em qualquer linha (para criar desvios). */
  nearestPose(x: number, z: number): { lineId: number; poseIndex: number; distance: number } | null {
    let best: { lineId: number; poseIndex: number; distance: number } | null = null;
    for (const line of this.lines) {
      const poses = this.posesFor(line.id);
      for (let i = 0; i < poses.length; i++) {
        const d = Math.hypot(poses[i].x - x, poses[i].z - z);
        if (!best || d < best.distance) best = { lineId: line.id, poseIndex: i, distance: d };
      }
    }
    return best;
  }

  serialize(): SerializedLine[] {
    return this.lines.map((line) => ({
      anchorLineId: line.anchor ? line.anchor.lineId : null,
      anchorPoseIndex: line.anchor ? line.anchor.poseIndex : 0,
      kinds: line.pieces.map((p) => p.kind),
    }));
  }

  /** Recria a malha inteira a partir de um jogo salvo. */
  restore(serialized: SerializedLine[]): void {
    const origin = this.lines[0].origin;
    this.lines = [{ id: 0, name: 'Linha principal', anchor: null, origin, pieces: [] }];
    this.nextId = 1;
    this.activeLineId = 0;
    this.invalidate();

    serialized.forEach((data, index) => {
      let lineId = 0;
      if (index > 0) {
        if (data.anchorLineId === null) return;
        const created = this.addBranch(data.anchorLineId, data.anchorPoseIndex);
        if (created === null) return;
        lineId = created;
      }
      this.activeLineId = lineId;
      for (const kind of data.kinds) this.place(kind);
    });
    this.activeLineId = 0;
  }
}

/**
 * Resolve a altura do tabuleiro sobre as poses: acompanha o terreno, mantém
 * folga sobre a água e é suavizado — daí saem rampas suaves e o vão plano da
 * ponte sobre o rio, sem nenhum caso especial de "aqui é ponte".
 */
export function buildPathFromPoses(poses: ReadonlyArray<Pose>): TrackPath {
  const ground = poses.map((p) => heightAt(p.x, p.z));
  const y = ground.map((g) => Math.max(g, WATER_LEVEL + BRIDGE_CLEARANCE));

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
