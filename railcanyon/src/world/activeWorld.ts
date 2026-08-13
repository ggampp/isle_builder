import { DEFAULT_WORLD_ID, WORLD_MAPS, worldById, type WorldDef } from './maps.ts';
import { setTerrainProfile } from './heightfield.ts';
import { setWorldTowns } from './towns.ts';
import { setWorldObjectives } from '../game/objectives.ts';

let active: WorldDef = WORLD_MAPS[0]!;

export function getActiveWorld(): WorldDef {
  return active;
}

/** Ativa um mapa: terreno, cidades e objetivos. Chamar ANTES de montar a cena. */
export function setActiveWorld(id: string): WorldDef {
  const world = worldById(id) ?? worldById(DEFAULT_WORLD_ID) ?? WORLD_MAPS[0]!;
  active = world;
  setTerrainProfile(world.terrain);
  setWorldTowns(world.towns, world.layouts);
  setWorldObjectives(world.objectives);
  return world;
}

export { WORLD_MAPS, DEFAULT_WORLD_ID };
