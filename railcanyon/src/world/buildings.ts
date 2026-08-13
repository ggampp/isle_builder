import * as THREE from 'three';
import { cloneBuildingModel } from '../render/modelLoader.ts';

export const BUILDING_KINDS = [
  'house', 'cottage', 'manor', 'cabin', 'watertower', 'windmill', 'shed', 'lamp', 'bench',
] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export interface BuildingSpec {
  label: string;
  icon: string;
  cost: number;
  /** Raio ocupado no terreno (colisão e validação de encosta). */
  footprint: number;
  score: number;
  xp: number;
  /** Descrição do efeito no jogo, mostrada na dica do painel. */
  perk: string;
}

export const BUILDING_SPECS: Record<BuildingKind, BuildingSpec> = {
  house: { label: 'Casa', icon: '🏠', cost: 180, footprint: 4, score: 60, xp: 30, perk: '+2 de carga por entrega' },
  cottage: { label: 'Casinha', icon: '🏚️', cost: 120, footprint: 3.5, score: 40, xp: 20, perk: '+2 de carga por entrega' },
  manor: { label: 'Casa grande', icon: '🏡', cost: 450, footprint: 5, score: 150, xp: 70, perk: '+2 de carga por entrega' },
  cabin: { label: 'Cabana de madeira', icon: '🛖', cost: 220, footprint: 4, score: 70, xp: 35, perk: '+6 de lenha máxima' },
  watertower: { label: 'Torre d’água', icon: '🗼', cost: 300, footprint: 4, score: 90, xp: 45, perk: 'Desgaste do trem 20% menor' },
  windmill: { label: 'Moinho de vento', icon: '🌀', cost: 380, footprint: 4.5, score: 110, xp: 55, perk: '+8 moedas por minuto' },
  shed: { label: 'Armazém', icon: '📦', cost: 180, footprint: 4, score: 50, xp: 25, perk: '+8 de carga por entrega' },
  lamp: { label: 'Poste de luz', icon: '💡', cost: 60, footprint: 1.6, score: 15, xp: 8, perk: 'Decoração — pontos' },
  bench: { label: 'Banco de praça', icon: '🪑', cost: 90, footprint: 1.8, score: 20, xp: 10, perk: 'Decoração — pontos' },
};

export function isBuildingKind(value: string): value is BuildingKind {
  return (BUILDING_KINDS as readonly string[]).includes(value);
}

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roof(w: number, h: number, d: number, color: string, y: number): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0, Math.SQRT1_2, h, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, 1, d);
  const mesh = new THREE.Mesh(geo, lambert(color));
  mesh.position.y = y + h / 2;
  mesh.castShadow = true;
  return mesh;
}

const WALL_COLORS = ['#f0e2c4', '#e6d3ae', '#dcc39c'];
const ROOF_COLORS = ['#3f6dc0', '#b5432f', '#4a7a44', '#8a5a34'];

/** Grupo da construção (GLB pré-carregado se houver, senão procedural). `userData.spin` marca partes animadas. */
export function createBuilding(kind: BuildingKind, variant = 0): THREE.Group {
  const fromAsset = cloneBuildingModel(kind);
  if (fromAsset) return fromAsset;

  const g = new THREE.Group();
  const wall = WALL_COLORS[variant % WALL_COLORS.length];
  const tile = ROOF_COLORS[variant % ROOF_COLORS.length];

  switch (kind) {
    case 'cottage':
      g.add(box(4.3, 0.25, 3.6, '#9a8a78', 0, 0));
      g.add(box(4.1, 2.55, 3.4, wall, 0, 0.25));
      g.add(roof(3.3, 1.55, 2.9, tile, 2.8));
      g.add(box(0.9, 1.5, 0.14, '#6b4a2f', 0, 0.3, 1.78));
      g.add(box(0.95, 0.95, 0.1, '#8fc6e8', -1.2, 1.4, 1.75));
      g.add(box(0.95, 0.95, 0.1, '#8fc6e8', 1.2, 1.4, 1.75));
      g.add(box(0.45, 1.0, 0.45, tile, -1.3, 2.8, -0.6));
      break;
    case 'house':
      g.add(box(5.7, 0.28, 4.3, '#9a8a78', 0, 0));
      g.add(box(5.5, 3.15, 4.1, wall, 0, 0.28));
      g.add(roof(4.2, 1.85, 3.4, tile, 3.4));
      g.add(box(1.05, 1.9, 0.14, '#6b4a2f', -1.3, 0.35, 2.12));
      g.add(box(1.1, 1.1, 0.1, '#8fc6e8', 1.35, 1.55, 2.1));
      g.add(box(0.1, 1.0, 1.0, '#8fc6e8', 2.8, 1.55, 0));
      g.add(box(0.5, 1.3, 0.5, tile, 1.8, 3.4, -0.8));
      break;
    case 'manor':
      g.add(box(7.3, 0.3, 5.3, '#9a8a78', 0, 0));
      g.add(box(7.1, 3.4, 5.1, wall, 0, 0.3));
      g.add(box(3.5, 2.5, 4.7, wall, 1.65, 3.7));
      g.add(roof(5.3, 2.05, 4.0, tile, 3.7));
      g.add(roof(2.8, 1.3, 2.4, tile, 6.2));
      g.add(box(1.0, 2.6, 1.0, '#b5432f', -2.55, 3.7));
      g.add(box(1.3, 2.1, 0.15, '#6b4a2f', -1.85, 0.35, 2.62));
      g.add(box(1.1, 1.15, 0.1, '#8fc6e8', 0.6, 1.7, 2.6));
      g.add(box(1.1, 1.15, 0.1, '#8fc6e8', 2.2, 1.7, 2.6));
      break;
    case 'cabin': {
      const logs = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 7), lambert(i % 2 ? '#7d5433' : '#6b4a2f'));
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.4 + i * 0.62, 0);
        log.castShadow = true;
        logs.add(log);
      }
      g.add(logs);
      g.add(box(5, 0.6, 3.6, '#6b4a2f', 0, 0));
      g.add(roof(3.6, 1.4, 2.6, '#8a5a34', 3.5));
      break;
    }
    case 'watertower': {
      for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
        const leg = box(0.32, 4.4, 0.32, '#5c4632', lx, 0, lz);
        leg.rotation.set(lz * 0.03, 0, -lx * 0.03);
        g.add(leg);
      }
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 2.6, 12), lambert('#7d5433'));
      tank.position.y = 5.7;
      tank.castShadow = true;
      g.add(tank);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 12), lambert('#3f6dc0'));
      cap.position.y = 7.5;
      cap.castShadow = true;
      g.add(cap);
      break;
    }
    case 'windmill': {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 6.4, 8), lambert('#e6d3ae'));
      tower.position.y = 3.2;
      tower.castShadow = true;
      g.add(tower);
      g.add(roof(1.6, 1.2, 1.6, '#b5432f', 6.4));
      const blades = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const blade = box(0.28, 3.2, 0.7, '#f2e6cc');
        blade.position.set(0, 1.6, 0);
        const arm = new THREE.Group();
        arm.add(blade);
        arm.rotation.z = (i * Math.PI) / 2;
        blades.add(arm);
      }
      blades.position.set(0, 5.6, 1.3);
      blades.userData.spin = true;
      g.add(blades);
      break;
    }
    case 'shed':
      g.add(box(6, 2.4, 4.2, '#8a5a34'));
      g.add(box(6.4, 0.5, 4.6, '#5c4632', 0, 2.4));
      g.add(box(2.2, 1.8, 0.2, '#6b4a2f', 0, 0, 2.2));
      break;
    case 'lamp': {
      g.add(box(0.22, 3.6, 0.22, '#3a3a42'));
      const head = box(0.7, 0.7, 0.7, '#f5d98a', 0, 3.6);
      (head.material as THREE.MeshLambertMaterial).emissive = new THREE.Color('#6b5a1f');
      g.add(head);
      break;
    }
    case 'bench':
      g.add(box(2.4, 0.18, 0.7, '#8a5a34', 0, 0.5));
      g.add(box(2.4, 0.7, 0.16, '#8a5a34', 0, 0.68, -0.32));
      g.add(box(0.16, 0.5, 0.6, '#5c4632', -1, 0));
      g.add(box(0.16, 0.5, 0.6, '#5c4632', 1, 0));
      break;
  }
  return g;
}

/** Materiais translúcidos verde/vermelho para o preview de colocação. */
export function makeGhost(group: THREE.Group, valid: boolean): void {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = false;
    obj.material = new THREE.MeshBasicMaterial({
      color: valid ? '#6fe06a' : '#e8544a',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
  });
}
