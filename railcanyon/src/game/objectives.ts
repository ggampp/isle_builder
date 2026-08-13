/** Objetivos-tutorial encadeados por mapa. */

import type { ObjectiveDefData } from '../world/maps.ts';
import { WORLD_MAPS } from '../world/maps.ts';

export interface ObjectiveProgress {
  piecesPlaced: number;
  connectedTowns: string[];
  contractsAccepted: number;
  contractsCompleted: number;
  buildingsPlaced: number;
}

export interface ObjectiveDef {
  title: string;
  detail: string;
  reward: number;
  xp: number;
  progress: (p: ObjectiveProgress) => number;
}

function compileGoal(goal: ObjectiveDefData['goal']): (p: ObjectiveProgress) => number {
  switch (goal.type) {
    case 'pieces':
      return (p) => p.piecesPlaced / goal.count;
    case 'connect':
      return (p) => (p.connectedTowns.includes(goal.townId) ? 1 : 0);
    case 'connectAny':
      return (p) => (goal.townIds.some((id) => p.connectedTowns.includes(id)) ? 1 : 0);
    case 'contractsAccepted':
      return (p) => Math.min(1, p.contractsAccepted / goal.count);
    case 'contractsCompleted':
      return (p) => Math.min(1, p.contractsCompleted / goal.count);
    case 'buildings':
      return (p) => p.buildingsPlaced / goal.count;
  }
}

function compileObjectives(data: readonly ObjectiveDefData[]): ObjectiveDef[] {
  return data.map((o) => ({
    title: o.title,
    detail: o.detail,
    reward: o.reward,
    xp: o.xp,
    progress: compileGoal(o.goal),
  }));
}

/** Lista ativa — trocada por `setWorldObjectives`. */
export let OBJECTIVES: ObjectiveDef[] = compileObjectives(WORLD_MAPS[0]!.objectives);

export function setWorldObjectives(data: readonly ObjectiveDefData[]): void {
  OBJECTIVES = compileObjectives(data);
}

export class ObjectiveTracker {
  index = 0;

  get current(): ObjectiveDef | null {
    return OBJECTIVES[this.index] ?? null;
  }

  check(progress: ObjectiveProgress): ObjectiveDef | null {
    const current = this.current;
    if (!current) return null;
    if (current.progress(progress) >= 1) {
      this.index++;
      return current;
    }
    return null;
  }

  fraction(progress: ObjectiveProgress): number {
    const current = this.current;
    if (!current) return 1;
    return Math.max(0, Math.min(1, current.progress(progress)));
  }
}
