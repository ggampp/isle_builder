import type { PieceKind } from '../rail/geometry.ts';
import { isPieceKind } from '../rail/geometry.ts';
import type { BuildingKind } from '../world/buildings.ts';
import { isBuildingKind } from '../world/buildings.ts';

export const SAVE_KEY = 'canyon-rails-save-v1';

export interface SavedBuilding {
  kind: BuildingKind;
  x: number;
  z: number;
  rot: number;
}

export interface SaveData {
  version: 1;
  track: PieceKind[];
  buildings: SavedBuilding[];
  coins: number;
  score: number;
  xp: number;
  wagons: number;
  condition: number;
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Lê e valida o jogo salvo; devolve null se ausente ou corrompido. */
export function readSave(): SaveData | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1) return null;
    const track = Array.isArray(parsed.track)
      ? parsed.track.filter((k): k is PieceKind => typeof k === 'string' && isPieceKind(k))
      : [];
    const buildings = Array.isArray(parsed.buildings)
      ? parsed.buildings.filter((b): b is SavedBuilding =>
        !!b && typeof b.x === 'number' && typeof b.z === 'number'
        && typeof b.rot === 'number' && typeof b.kind === 'string' && isBuildingKind(b.kind))
      : [];
    return {
      version: 1,
      track,
      buildings,
      coins: numberOr(parsed.coins, 5960),
      score: numberOr(parsed.score, 0),
      xp: numberOr(parsed.xp, 0),
      wagons: Math.max(1, Math.min(8, Math.round(numberOr(parsed.wagons, 4)))),
      condition: Math.max(0, Math.min(100, numberOr(parsed.condition, 95))),
    };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // sem persistência disponível — o jogo segue funcionando em memória
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
