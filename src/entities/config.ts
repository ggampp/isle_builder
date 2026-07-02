/** Simulation caps and tuning — see sprints/SPRINT_06_simulacao.md */
export const SIM_CONFIG = {
  fixedDt: 1 / 30,
  maxVillagers: 200,
  maxFish: 150,
  maxLargeMarine: 8,
  maxShips: 6,
  /** Target agents per terrain unit (tiles). */
  villagerPerGrassTile: 1 / 60,
  fishPerDeepWaterTile: 1 / 90,
  marinePerDeepWaterTile: 1 / 800,
  shipPerDeepWaterTile: 1 / 1200,
  spawnIntervalSec: 2,
  villagerSpeed: 22,
  fishSpeed: 28,
  whaleSpeed: 12,
  sharkSpeed: 18,
  shipSpeed: 16,
  boatSpeed: 8,
  lodAnimSkipFar: 3,
  lodAnimSkipVeryFar: 8,
  lodDistanceNear: 280,
  lodDistanceFar: 560,
} as const;
