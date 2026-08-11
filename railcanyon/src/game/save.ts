import type { PieceKind } from '../rail/geometry.ts';
import { isPieceKind } from '../rail/geometry.ts';
import type { SerializedLine } from '../rail/network.ts';
import type { BuildingKind } from '../world/buildings.ts';
import { isBuildingKind } from '../world/buildings.ts';

export const SAVE_KEY = 'canyon-rails-save-v1';

export interface SavedBuilding {
  kind: BuildingKind;
  x: number;
  z: number;
  rot: number;
}

export interface SavedTrain {
  lineId: number;
  wagons: number;
  condition: number;
}

export interface SaveData {
  version: 2;
  lines: SerializedLine[];
  buildings: SavedBuilding[];
  trains: SavedTrain[];
  blastedRocks: number[];
  coins: number;
  score: number;
  xp: number;
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lê e valida o jogo salvo; devolve null se ausente ou corrompido. Saves da
 * versão 1 (linha única, antes dos desvios) são migrados.
 */
export function readSave(): SaveData | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const version = parsed.version;
    if (version !== 1 && version !== 2) return null;

    const buildings = Array.isArray(parsed.buildings)
      ? (parsed.buildings as unknown[]).filter(isSavedBuilding)
      : [];
    const coins = numberOr(parsed.coins, 5960);
    const score = numberOr(parsed.score, 0);
    const xp = numberOr(parsed.xp, 0);

    if (version === 1) {
      const kinds = Array.isArray(parsed.track) ? readKinds(parsed.track) : [];
      return {
        version: 2,
        lines: [{ anchorLineId: null, anchorPoseIndex: 0, kinds }],
        buildings,
        trains: [{
          lineId: 0,
          wagons: clampInt(numberOr(parsed.wagons, 4), 1, 8),
          condition: clamp(numberOr(parsed.condition, 95), 0, 100),
        }],
        blastedRocks: [],
        coins,
        score,
        xp,
      };
    }

    const lines: SerializedLine[] = Array.isArray(parsed.lines)
      ? (parsed.lines as unknown[]).flatMap((entry, index) => {
        if (!isRecord(entry)) return [];
        const anchorLineId = index === 0 ? null : intOrNull(entry.anchorLineId);
        if (index > 0 && anchorLineId === null) return [];
        return [{
          anchorLineId,
          anchorPoseIndex: Math.max(0, Math.round(numberOr(entry.anchorPoseIndex, 0))),
          kinds: Array.isArray(entry.kinds) ? readKinds(entry.kinds) : [],
        }];
      })
      : [];

    const trains: SavedTrain[] = Array.isArray(parsed.trains)
      ? (parsed.trains as unknown[]).flatMap((entry) => {
        if (!isRecord(entry)) return [];
        return [{
          lineId: Math.max(0, Math.round(numberOr(entry.lineId, 0))),
          wagons: clampInt(numberOr(entry.wagons, 4), 1, 8),
          condition: clamp(numberOr(entry.condition, 95), 0, 100),
        }];
      })
      : [];

    const blastedRocks = Array.isArray(parsed.blastedRocks)
      ? (parsed.blastedRocks as unknown[])
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        .map((n) => Math.round(n))
      : [];

    return {
      version: 2,
      lines: lines.length > 0 ? lines : [{ anchorLineId: null, anchorPoseIndex: 0, kinds: [] }],
      buildings,
      trains: trains.length > 0 ? trains : [{ lineId: 0, wagons: 4, condition: 95 }],
      blastedRocks,
      coins,
      score,
      xp,
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

function readKinds(values: unknown[]): PieceKind[] {
  return values.filter((k): k is PieceKind => typeof k === 'string' && isPieceKind(k));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSavedBuilding(value: unknown): value is SavedBuilding {
  if (!isRecord(value)) return false;
  return typeof value.x === 'number' && typeof value.z === 'number'
    && typeof value.rot === 'number'
    && typeof value.kind === 'string' && isBuildingKind(value.kind);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function intOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
