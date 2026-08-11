/**
 * Camadas de terreno empilhadas por prioridade.
 * water < sand < grass < path; bridge só sobre água; cliff sobre terra.
 *
 * Usamos um objeto `as const` em vez de `const enum`: `const enum` não
 * atravessa bem os limites de módulo sob o `isolatedModules` do esbuild/Vite.
 */
export const TerrainLayer = {
  Water: 0,
  Sand: 1,
  Grass: 2,
  Path: 3,
  Bridge: 4,
  Cliff: 5,
} as const;

export type TerrainLayerValue = (typeof TerrainLayer)[keyof typeof TerrainLayer];

/** Terra sólida que gera costa (areia, grama, trilha, penhasco). Ponte fica sobre água. */
export function isLandLayer(layer: number): boolean {
  return layer >= TerrainLayer.Sand && layer !== TerrainLayer.Bridge;
}

/** Caminhável para simulação futura (terra + ponte). */
export function isWalkableLayer(layer: number): boolean {
  return isLandLayer(layer) || layer === TerrainLayer.Bridge;
}
