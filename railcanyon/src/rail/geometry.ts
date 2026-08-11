/**
 * Geometria pura das peças de trilho (sem THREE/DOM) — testável no Vitest.
 * Uma peça leva uma pose inicial a uma pose final: reta anda para frente,
 * curva descreve um arco de raio fixo.
 */

export interface Pose {
  x: number;
  z: number;
  /** direção no plano XZ: dir = (cos h, sin h). */
  heading: number;
}

export const PIECE_KINDS = ['straight', 'curveL', 'curveR', 'sharpL', 'sharpR'] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

export interface PieceSpec {
  label: string;
  icon: string;
  cost: number;
  /** Raio da curva em unidades de mundo (0 = reta). */
  radius: number;
  /** Giro em radianos; positivo = para a esquerda. */
  turn: number;
  /** Comprimento do arco percorrido. */
  length: number;
}

const DEG15 = Math.PI / 12;
const DEG30 = Math.PI / 6;

export const PIECE_SPECS: Record<PieceKind, PieceSpec> = {
  straight: { label: 'Trilho reto — 15 m', icon: '🛤️', cost: 50, radius: 0, turn: 0, length: 15 },
  curveL: { label: 'Curva suave à esquerda', icon: '↰', cost: 65, radius: 45, turn: DEG15, length: 45 * DEG15 },
  curveR: { label: 'Curva suave à direita', icon: '↱', cost: 65, radius: 45, turn: -DEG15, length: 45 * DEG15 },
  sharpL: { label: 'Curva fechada à esquerda', icon: '⤴️', cost: 80, radius: 24, turn: DEG30, length: 24 * DEG30 },
  sharpR: { label: 'Curva fechada à direita', icon: '⤵️', cost: 80, radius: 24, turn: -DEG30, length: 24 * DEG30 },
};

export function isPieceKind(value: string): value is PieceKind {
  return (PIECE_KINDS as readonly string[]).includes(value);
}

/** Pose a uma fração `t` ∈ [0,1] ao longo da peça iniciada em `start`. */
export function poseAlong(start: Pose, kind: PieceKind, t: number): Pose {
  const spec = PIECE_SPECS[kind];
  if (spec.turn === 0) {
    const d = spec.length * t;
    return {
      x: start.x + Math.cos(start.heading) * d,
      z: start.z + Math.sin(start.heading) * d,
      heading: start.heading,
    };
  }
  const side = Math.sign(spec.turn);
  const cx = start.x - Math.sin(start.heading) * spec.radius * side;
  const cz = start.z + Math.cos(start.heading) * spec.radius * side;
  const theta = spec.turn * t;
  const vx = start.x - cx;
  const vz = start.z - cz;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: cx + vx * cos - vz * sin,
    z: cz + vx * sin + vz * cos,
    heading: start.heading + theta,
  };
}

export function pieceEnd(start: Pose, kind: PieceKind): Pose {
  return poseAlong(start, kind, 1);
}

/** Amostra a peça em `steps` pontos (sem incluir o início, incluindo o fim). */
export function samplePiece(start: Pose, kind: PieceKind, steps: number): Pose[] {
  const out: Pose[] = [];
  for (let i = 1; i <= steps; i++) out.push(poseAlong(start, kind, i / steps));
  return out;
}

export function normalizeAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}
