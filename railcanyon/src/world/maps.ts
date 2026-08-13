/**
 * Perfis de terreno e mapas jogáveis do Canyon Rails.
 * Cada mapa tem buttes, rio, pads de cidade, layouts e objetivos próprios.
 */

import type { BuildingKind } from './buildings.ts';

export interface ButteDef {
  x: number;
  z: number;
  r: number;
  h: number;
}

export interface TownPadDef {
  x: number;
  z: number;
  r: number;
  level: number;
}

export type RiverDef =
  | {
      kind: 'ring';
      baseRadius: number;
      amp1: number;
      phase1: number;
      amp2: number;
      phase2: number;
      noiseAmp: number;
      halfWidth: number;
    }
  | {
      kind: 'band';
      /** Eixo ao longo do qual o rio serpenteia. */
      along: 'x' | 'z';
      center: number;
      amp: number;
      freq: number;
      halfWidth: number;
      /** Segundo canal opcional (rio gêmeo). */
      twinCenter?: number;
    };

export interface TerrainProfile {
  buttes: readonly ButteDef[];
  townPads: readonly TownPadDef[];
  river: RiverDef;
  mesaLevel: number;
}

export interface TownDef {
  id: string;
  name: string;
  x: number;
  z: number;
  resource: string;
  resourceIcon: string;
  acrossRiver: boolean;
}

export interface TownBuilding {
  kind: BuildingKind;
  dx: number;
  dz: number;
  rot: number;
  variant: number;
}

export interface ObjectiveDefData {
  title: string;
  detail: string;
  reward: number;
  xp: number;
  /** Tipo de progresso — resolvido em objectives.ts. */
  goal:
    | { type: 'pieces'; count: number }
    | { type: 'connect'; townId: string }
    | { type: 'connectAny'; townIds: string[] }
    | { type: 'contractsAccepted'; count: number }
    | { type: 'contractsCompleted'; count: number }
    | { type: 'buildings'; count: number };
}

export interface WorldDef {
  id: string;
  name: string;
  blurb: string;
  accent: string;
  terrain: TerrainProfile;
  towns: readonly TownDef[];
  layouts: Readonly<Record<string, TownBuilding[]>>;
  lineOrigin: { x: number; z: number; heading: number };
  cameraFocus: { x: number; z: number; distance: number };
  objectives: readonly ObjectiveDefData[];
  welcome: string;
}

function townFromPad(
  pad: TownPadDef,
  id: string,
  name: string,
  resource: string,
  resourceIcon: string,
  acrossRiver: boolean,
): TownDef {
  return { id, name, x: pad.x, z: pad.z, resource, resourceIcon, acrossRiver };
}

const HOUSE_ROW = (
  extras: TownBuilding[] = [],
): TownBuilding[] => [
  { kind: 'house', dx: -12, dz: -9, rot: 0, variant: 0 },
  { kind: 'cottage', dx: -4, dz: -12, rot: 0.3, variant: 1 },
  { kind: 'cabin', dx: 7, dz: -10, rot: -0.2, variant: 2 },
  { kind: 'shed', dx: 14, dz: -3, rot: 1.5, variant: 0 },
  { kind: 'lamp', dx: 0, dz: -3, rot: 0, variant: 0 },
  { kind: 'bench', dx: 4, dz: 2, rot: 0.6, variant: 0 },
  ...extras,
];

// ── Mapa 1: Canyon Vale (clássico expandido) ──────────────────────────

const CANYON_PADS: TownPadDef[] = [
  { x: -92, z: -34, r: 30, level: 6.4 },
  { x: 96, z: -62, r: 30, level: 7.1 },
  { x: -12, z: 186, r: 28, level: 6.8 },
  { x: -130, z: 55, r: 26, level: 6.5 },
  { x: 55, z: 95, r: 26, level: 6.9 },
];

const CANYON_VALE: WorldDef = {
  id: 'canyon-vale',
  name: 'Canyon Vale',
  blurb: 'O vale clássico — cinco cidades em volta do desfiladeiro.',
  accent: '#c98a5a',
  terrain: {
    mesaLevel: 6,
    buttes: [
      { x: -60, z: -120, r: 26, h: 17 },
      { x: 95, z: -95, r: 20, h: 14 },
      { x: 130, z: 60, r: 24, h: 19 },
      { x: -140, z: 60, r: 18, h: 12 },
      { x: -20, z: 150, r: 22, h: 15 },
      { x: 40, z: -175, r: 16, h: 11 },
      { x: -185, z: -40, r: 20, h: 13 },
      { x: 185, z: -25, r: 17, h: 12 },
    ],
    townPads: CANYON_PADS,
    river: {
      kind: 'ring',
      baseRadius: 158,
      amp1: 16,
      phase1: 0.9,
      amp2: 7,
      phase2: 2.1,
      noiseAmp: 18,
      halfWidth: 13,
    },
  },
  towns: [
    townFromPad(CANYON_PADS[0]!, 'pine', 'Pine Hollow', 'Madeira', '🪵', false),
    townFromPad(CANYON_PADS[1]!, 'canyon', 'Canyon Town', 'Pedra', '🪨', false),
    townFromPad(CANYON_PADS[2]!, 'copper', 'Copper Creek', 'Cobre', '🔶', true),
    townFromPad(CANYON_PADS[3]!, 'millridge', 'Millridge', 'Grãos', '🌾', false),
    townFromPad(CANYON_PADS[4]!, 'redbluff', 'Red Bluff', 'Argila', '🧱', false),
  ],
  layouts: {
    pine: HOUSE_ROW([
      { kind: 'house', dx: -13, dz: 6, rot: 3.1, variant: 2 },
      { kind: 'cottage', dx: -3, dz: 11, rot: 3.3, variant: 0 },
      { kind: 'watertower', dx: 11, dz: 9, rot: 0, variant: 0 },
    ]),
    canyon: [
      { kind: 'manor', dx: -10, dz: -11, rot: 0.1, variant: 1 },
      { kind: 'house', dx: 2, dz: -13, rot: 0, variant: 0 },
      { kind: 'house', dx: 12, dz: -8, rot: -0.4, variant: 3 },
      { kind: 'shed', dx: -14, dz: 2, rot: 1.6, variant: 0 },
      { kind: 'cottage', dx: -6, dz: 10, rot: 3.0, variant: 2 },
      { kind: 'windmill', dx: 13, dz: 8, rot: 0.4, variant: 0 },
      { kind: 'lamp', dx: 3, dz: 0, rot: 0, variant: 0 },
      { kind: 'bench', dx: -2, dz: 4, rot: 2.4, variant: 0 },
    ],
    copper: [
      { kind: 'cabin', dx: -9, dz: -8, rot: 0.2, variant: 1 },
      { kind: 'cottage', dx: 3, dz: -10, rot: -0.3, variant: 2 },
      { kind: 'shed', dx: 11, dz: -2, rot: 1.4, variant: 0 },
      { kind: 'house', dx: -10, dz: 6, rot: 2.9, variant: 3 },
      { kind: 'watertower', dx: 9, dz: 9, rot: 0, variant: 0 },
      { kind: 'lamp', dx: 0, dz: 1, rot: 0, variant: 0 },
    ],
    millridge: HOUSE_ROW([
      { kind: 'windmill', dx: 10, dz: 8, rot: 0.2, variant: 0 },
      { kind: 'shed', dx: -10, dz: 8, rot: 1.2, variant: 0 },
    ]),
    redbluff: HOUSE_ROW([
      { kind: 'manor', dx: -8, dz: 8, rot: 2.8, variant: 2 },
      { kind: 'watertower', dx: 12, dz: 6, rot: 0, variant: 0 },
    ]),
  },
  lineOrigin: { x: CANYON_PADS[0]!.x + 8, z: CANYON_PADS[0]!.z + 2, heading: -0.16 },
  cameraFocus: { x: CANYON_PADS[0]!.x + 30, z: CANYON_PADS[0]!.z + 10, distance: 130 },
  welcome: 'Bem-vindo a Canyon Vale — ligue as cinco cidades do desfiladeiro.',
  objectives: [
    { title: 'Estenda a linha', detail: 'Assente 4 peças de trilho na ponta brilhante.', reward: 400, xp: 120, goal: { type: 'pieces', count: 4 } },
    { title: 'Ligue Canyon Town', detail: 'Leve os trilhos até Canyon Town, a leste.', reward: 900, xp: 260, goal: { type: 'connect', townId: 'canyon' } },
    { title: 'Aceite um contrato', detail: 'Abra Contratos e aceite uma entrega.', reward: 300, xp: 90, goal: { type: 'contractsAccepted', count: 1 } },
    { title: 'Entregue a carga', detail: 'Deixe o trem circular e concluir um contrato.', reward: 1200, xp: 400, goal: { type: 'contractsCompleted', count: 1 } },
    { title: 'Levante uma vila', detail: 'Construa 3 casas ou serviços perto da linha.', reward: 700, xp: 220, goal: { type: 'buildings', count: 3 } },
    { title: 'Cruze o desfiladeiro', detail: 'Ligue Copper Creek do outro lado do rio.', reward: 2500, xp: 900, goal: { type: 'connect', townId: 'copper' } },
    { title: 'Rede do vale', detail: 'Conecte Millridge ou Red Bluff à sua ferrovia.', reward: 1800, xp: 600, goal: { type: 'connectAny', townIds: ['millridge', 'redbluff'] } },
  ],
};

// ── Mapa 2: Red Buttes ────────────────────────────────────────────────

const RED_PADS: TownPadDef[] = [
  { x: -70, z: 40, r: 28, level: 6.6 },
  { x: 80, z: 50, r: 28, level: 7.0 },
  { x: 20, z: -90, r: 26, level: 6.8 },
  { x: -100, z: -80, r: 26, level: 6.4 },
  { x: 110, z: -140, r: 26, level: 6.7 },
  { x: -40, z: 175, r: 26, level: 6.5 },
];

const RED_BUTTES: WorldDef = {
  id: 'red-buttes',
  name: 'Red Buttes',
  blurb: 'Mesa avermelhada com seis postos — carvão, ferro e grãos.',
  accent: '#b5432f',
  terrain: {
    mesaLevel: 6.2,
    buttes: [
      { x: -40, z: -40, r: 30, h: 20 },
      { x: 70, z: -30, r: 22, h: 16 },
      { x: -110, z: 100, r: 24, h: 15 },
      { x: 140, z: 90, r: 20, h: 14 },
      { x: 0, z: 130, r: 18, h: 12 },
      { x: -160, z: -90, r: 22, h: 13 },
      { x: 160, z: -70, r: 19, h: 15 },
      { x: 40, z: 170, r: 16, h: 11 },
    ],
    townPads: RED_PADS,
    river: {
      kind: 'ring',
      baseRadius: 150,
      amp1: 22,
      phase1: 1.4,
      amp2: 10,
      phase2: 0.5,
      noiseAmp: 14,
      halfWidth: 12,
    },
  },
  towns: [
    townFromPad(RED_PADS[0]!, 'ember', 'Ember Rest', 'Carvão', '⬛', false),
    townFromPad(RED_PADS[1]!, 'ironspur', 'Iron Spur', 'Ferro', '⚙️', false),
    townFromPad(RED_PADS[2]!, 'dustford', 'Dustford', 'Areia', '🏜️', false),
    townFromPad(RED_PADS[3]!, 'mesagate', 'Mesa Gate', 'Pedra', '🪨', false),
    townFromPad(RED_PADS[4]!, 'sunridge', 'Sunridge', 'Grãos', '🌾', false),
    townFromPad(RED_PADS[5]!, 'oasis', 'Oasis Bend', 'Cobre', '🔶', true),
  ],
  layouts: {
    ember: HOUSE_ROW([{ kind: 'watertower', dx: 10, dz: 8, rot: 0, variant: 0 }, { kind: 'shed', dx: -11, dz: 7, rot: 1.1, variant: 0 }]),
    ironspur: HOUSE_ROW([{ kind: 'manor', dx: -9, dz: 8, rot: 2.9, variant: 1 }, { kind: 'windmill', dx: 11, dz: 6, rot: 0.3, variant: 0 }]),
    dustford: HOUSE_ROW([{ kind: 'cabin', dx: 9, dz: 8, rot: 0.4, variant: 2 }]),
    mesagate: HOUSE_ROW([{ kind: 'house', dx: -8, dz: 9, rot: 3.0, variant: 3 }, { kind: 'shed', dx: 12, dz: 4, rot: 1.3, variant: 0 }]),
    sunridge: HOUSE_ROW([{ kind: 'windmill', dx: 8, dz: 9, rot: 0, variant: 0 }, { kind: 'cottage', dx: -10, dz: 7, rot: 2.7, variant: 1 }]),
    oasis: [
      { kind: 'cabin', dx: -8, dz: -8, rot: 0.2, variant: 0 },
      { kind: 'cottage', dx: 4, dz: -9, rot: -0.2, variant: 1 },
      { kind: 'watertower', dx: 10, dz: 6, rot: 0, variant: 0 },
      { kind: 'lamp', dx: 0, dz: 0, rot: 0, variant: 0 },
      { kind: 'shed', dx: -10, dz: 6, rot: 1.5, variant: 0 },
    ],
  },
  lineOrigin: { x: RED_PADS[0]!.x + 8, z: RED_PADS[0]!.z + 2, heading: 0.4 },
  cameraFocus: { x: RED_PADS[0]!.x + 25, z: RED_PADS[0]!.z + 15, distance: 140 },
  welcome: 'Red Buttes — seis postos no planalto vermelho aguardam a ferrovia.',
  objectives: [
    { title: 'Deixe Ember Rest', detail: 'Assente 4 peças saindo da estação.', reward: 400, xp: 120, goal: { type: 'pieces', count: 4 } },
    { title: 'Ligue Iron Spur', detail: 'Conecte Iron Spur a leste.', reward: 1000, xp: 280, goal: { type: 'connect', townId: 'ironspur' } },
    { title: 'Primeiro contrato', detail: 'Aceite um contrato de entrega.', reward: 300, xp: 90, goal: { type: 'contractsAccepted', count: 1 } },
    { title: 'Entrega quente', detail: 'Conclua um contrato com o trem.', reward: 1300, xp: 420, goal: { type: 'contractsCompleted', count: 1 } },
    { title: 'Posto avançado', detail: 'Construa 3 edificações na rede.', reward: 700, xp: 220, goal: { type: 'buildings', count: 3 } },
    { title: 'Três cidades', detail: 'Conecte Dustford à linha.', reward: 1600, xp: 500, goal: { type: 'connect', townId: 'dustford' } },
    { title: 'Além do anel', detail: 'Cruze o canyon até Oasis Bend.', reward: 2800, xp: 950, goal: { type: 'connect', townId: 'oasis' } },
  ],
};

// ── Mapa 3: Salt Crossing (rio em faixa) ───────────────────────────────

const SALT_PADS: TownPadDef[] = [
  { x: -110, z: -70, r: 28, level: 6.5 },
  { x: 10, z: -85, r: 28, level: 6.8 },
  { x: 120, z: -60, r: 26, level: 7.0 },
  { x: -90, z: 80, r: 28, level: 6.6 },
  { x: 30, z: 95, r: 26, level: 6.9 },
  { x: 130, z: 70, r: 26, level: 6.7 },
];

const SALT_CROSSING: WorldDef = {
  id: 'salt-crossing',
  name: 'Salt Crossing',
  blurb: 'Dois lados de um rio serpenteante — seis cidades, muitas pontes.',
  accent: '#3a6a9a',
  terrain: {
    mesaLevel: 5.8,
    buttes: [
      { x: -150, z: -120, r: 22, h: 14 },
      { x: 150, z: -110, r: 20, h: 13 },
      { x: -160, z: 120, r: 24, h: 16 },
      { x: 155, z: 130, r: 21, h: 15 },
      { x: -40, z: -160, r: 18, h: 12 },
      { x: 50, z: 160, r: 19, h: 13 },
      { x: 0, z: 0, r: 14, h: 8 },
    ],
    townPads: SALT_PADS,
    river: {
      kind: 'band',
      along: 'x',
      center: 0,
      amp: 28,
      freq: 0.018,
      halfWidth: 14,
      twinCenter: undefined,
    },
  },
  towns: [
    townFromPad(SALT_PADS[0]!, 'harbor', 'Harbor Flats', 'Sal', '🧂', false),
    townFromPad(SALT_PADS[1]!, 'windspan', 'Windspan', 'Lã', '🧶', false),
    townFromPad(SALT_PADS[2]!, 'quarry', 'Quarry End', 'Pedra', '🪨', false),
    townFromPad(SALT_PADS[3]!, 'timberline', 'Timberline', 'Madeira', '🪵', true),
    townFromPad(SALT_PADS[4]!, 'farbridge', 'Far Bridge', 'Cobre', '🔶', true),
    townFromPad(SALT_PADS[5]!, 'northmill', 'North Mill', 'Grãos', '🌾', true),
  ],
  layouts: {
    harbor: HOUSE_ROW([{ kind: 'watertower', dx: 9, dz: 8, rot: 0, variant: 0 }, { kind: 'shed', dx: -11, dz: 5, rot: 1.2, variant: 0 }]),
    windspan: HOUSE_ROW([{ kind: 'windmill', dx: 10, dz: 7, rot: 0.2, variant: 0 }, { kind: 'cottage', dx: -9, dz: 8, rot: 2.8, variant: 1 }]),
    quarry: HOUSE_ROW([{ kind: 'manor', dx: -8, dz: 7, rot: 3.0, variant: 2 }, { kind: 'shed', dx: 11, dz: 5, rot: 1.4, variant: 0 }]),
    timberline: HOUSE_ROW([{ kind: 'cabin', dx: 8, dz: 8, rot: 0.3, variant: 1 }, { kind: 'watertower', dx: -10, dz: 6, rot: 0, variant: 0 }]),
    farbridge: HOUSE_ROW([{ kind: 'house', dx: -7, dz: 8, rot: 2.9, variant: 0 }, { kind: 'lamp', dx: 2, dz: 0, rot: 0, variant: 0 }]),
    northmill: HOUSE_ROW([{ kind: 'windmill', dx: 9, dz: 8, rot: 0.1, variant: 0 }, { kind: 'shed', dx: -10, dz: 6, rot: 1.1, variant: 0 }]),
  },
  lineOrigin: { x: SALT_PADS[0]!.x + 8, z: SALT_PADS[0]!.z + 2, heading: 0.05 },
  cameraFocus: { x: SALT_PADS[0]!.x + 35, z: SALT_PADS[0]!.z + 5, distance: 145 },
  welcome: 'Salt Crossing — o rio corta o planalto; construa pontes e una as margens.',
  objectives: [
    { title: 'Partida em Harbor', detail: 'Assente 4 peças de trilho.', reward: 400, xp: 120, goal: { type: 'pieces', count: 4 } },
    { title: 'Ligue Windspan', detail: 'Conecte Windspan ao longo da margem sul.', reward: 1000, xp: 280, goal: { type: 'connect', townId: 'windspan' } },
    { title: 'Aceite contrato', detail: 'Aceite uma entrega no quadro.', reward: 300, xp: 90, goal: { type: 'contractsAccepted', count: 1 } },
    { title: 'Entrega salgada', detail: 'Conclua um contrato.', reward: 1300, xp: 420, goal: { type: 'contractsCompleted', count: 1 } },
    { title: 'Construa na margem', detail: 'Coloque 3 edificações.', reward: 700, xp: 220, goal: { type: 'buildings', count: 3 } },
    { title: 'Cruze o rio', detail: 'Ligue Timberline do outro lado — a ponte nasce nos trilhos.', reward: 2600, xp: 900, goal: { type: 'connect', townId: 'timberline' } },
    { title: 'Rede das duas margens', detail: 'Conecte Far Bridge ou North Mill.', reward: 2200, xp: 750, goal: { type: 'connectAny', townIds: ['farbridge', 'northmill'] } },
  ],
};

export const WORLD_MAPS: readonly WorldDef[] = [CANYON_VALE, RED_BUTTES, SALT_CROSSING];

export function worldById(id: string): WorldDef | undefined {
  return WORLD_MAPS.find((w) => w.id === id);
}

export const DEFAULT_WORLD_ID = CANYON_VALE.id;
