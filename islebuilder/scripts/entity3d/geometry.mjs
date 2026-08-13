/**
 * Geometrias 3D low-poly de aldeões e animais marinhos.
 * Modelos olham para +Z (sul lógico) por padrão.
 */
import * as THREE from 'three';

function mat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.02,
  });
}

function box(root, w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  root.add(mesh);
  return mesh;
}

function cyl(root, rTop, rBot, h, color, x, y, z, segments = 8, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  root.add(mesh);
  return mesh;
}

function group(name) {
  const root = new THREE.Group();
  root.name = name;
  return root;
}

/** Aldeão pixel-chibi low-poly. */
export function buildVillager() {
  const root = group('villager');
  const skin = '#f5d0a9';
  const shirt = '#c44b4b';
  const pants = '#6b4423';
  const hair = '#4a3528';
  const shoe = '#2a1810';

  // pernas
  box(root, 0.22, 0.45, 0.22, pants, -0.14, 0, 0.02);
  box(root, 0.22, 0.45, 0.22, pants, 0.14, 0, 0.02);
  box(root, 0.24, 0.1, 0.28, shoe, -0.14, 0, 0.06);
  box(root, 0.24, 0.1, 0.28, shoe, 0.14, 0, 0.06);

  // tronco
  box(root, 0.7, 0.7, 0.4, shirt, 0, 0.45, 0);
  // braços
  box(root, 0.18, 0.55, 0.18, shirt, -0.48, 0.5, 0);
  box(root, 0.18, 0.55, 0.18, shirt, 0.48, 0.5, 0);
  box(root, 0.16, 0.14, 0.16, skin, -0.48, 0.45, 0);
  box(root, 0.16, 0.14, 0.16, skin, 0.48, 0.45, 0);

  // cabeça
  cyl(root, 0.32, 0.32, 0.42, skin, 0, 1.15, 0, 10);
  box(root, 0.72, 0.22, 0.55, hair, 0, 1.48, -0.02);
  box(root, 0.2, 0.18, 0.15, hair, -0.3, 1.35, 0.12);
  // olhos
  box(root, 0.08, 0.1, 0.05, '#2a1810', -0.12, 1.35, 0.3);
  box(root, 0.08, 0.1, 0.05, '#2a1810', 0.12, 1.35, 0.3);
  // boca
  box(root, 0.16, 0.04, 0.04, '#c68642', 0, 1.22, 0.3);

  return root;
}

/** Peixe tropical. */
export function buildFish() {
  const root = group('fish');
  const body = '#ff6b4a';
  const belly = '#ffd23f';
  const fin = '#4ecdc4';

  box(root, 0.35, 0.32, 0.7, body, 0, 0.05, 0);
  box(root, 0.28, 0.22, 0.35, belly, 0, 0, 0.1);
  box(root, 0.28, 0.26, 0.28, body, 0, 0.06, 0.42);
  box(root, 0.06, 0.06, 0.04, '#f5f0e8', 0.1, 0.14, 0.5);
  box(root, 0.05, 0.05, 0.04, '#2a1810', 0.1, 0.14, 0.52);
  box(root, 0.08, 0.35, 0.28, fin, 0, 0.05, -0.48);
  box(root, 0.06, 0.22, 0.18, fin, 0, 0.22, -0.35, 0.4, 0, 0);
  box(root, 0.06, 0.22, 0.3, fin, 0, 0.28, 0.05);
  box(root, 0.28, 0.06, 0.18, fin, 0.22, 0.12, 0.1);
  box(root, 0.28, 0.06, 0.18, fin, -0.22, 0.12, 0.1);

  return root;
}

/** Baleia. */
export function buildWhale() {
  const root = group('whale');
  const skin = '#1c5c93';
  const belly = '#4ecdc4';
  const dark = '#0d2b4a';

  box(root, 0.9, 0.7, 2.4, skin, 0, 0.15, 0);
  box(root, 0.7, 0.35, 1.8, belly, 0, 0, 0.1);
  // cabeça
  box(root, 0.85, 0.55, 0.7, skin, 0, 0.2, 1.35);
  box(root, 0.08, 0.08, 0.05, '#2a1810', 0.28, 0.35, 1.6);
  // cauda
  box(root, 0.25, 0.2, 0.55, dark, 0, 0.25, -1.4);
  box(root, 1.1, 0.12, 0.35, dark, 0, 0.35, -1.7);
  // dorsal
  box(root, 0.12, 0.45, 0.4, dark, 0, 0.7, 0.2);
  // jatos / sopro base
  cyl(root, 0.08, 0.1, 0.15, dark, 0, 0.75, 1.1, 6);

  return root;
}

/** Tubarão. */
export function buildShark() {
  const root = group('shark');
  const grey = '#8a9aaa';
  const belly = '#c0ccd8';
  const dark = '#5a6a7a';

  box(root, 0.45, 0.35, 1.5, grey, 0, 0.1, 0);
  box(root, 0.35, 0.18, 1.1, belly, 0, 0, 0.1);
  box(root, 0.32, 0.28, 0.55, grey, 0, 0.12, 0.9);
  box(root, 0.18, 0.16, 0.35, grey, 0, 0.12, 1.25);
  box(root, 0.06, 0.06, 0.04, '#2a1810', 0.12, 0.22, 1.15);
  box(root, 0.1, 0.45, 0.35, dark, 0, 0.2, -0.9);
  box(root, 0.08, 0.25, 0.25, dark, 0, 0.4, -0.75);
  box(root, 0.08, 0.4, 0.35, dark, 0, 0.4, 0.15, 0.2, 0, 0);
  box(root, 0.55, 0.06, 0.25, grey, 0.3, 0.12, 0.2);
  box(root, 0.55, 0.06, 0.25, grey, -0.3, 0.12, 0.2);

  return root;
}

/** Orca. */
export function buildOrca() {
  const root = group('orca');
  const black = '#1a1a22';
  const white = '#f5f0e8';

  box(root, 0.7, 0.55, 1.9, black, 0, 0.12, 0);
  box(root, 0.5, 0.28, 1.3, white, 0, 0, 0.15);
  // mancha branca olho
  box(root, 0.22, 0.18, 0.15, white, 0.28, 0.28, 0.7);
  box(root, 0.22, 0.18, 0.15, white, -0.28, 0.28, 0.7);
  box(root, 0.06, 0.06, 0.04, '#2a1810', 0.3, 0.3, 0.8);
  // cabeça
  box(root, 0.65, 0.45, 0.55, black, 0, 0.15, 1.05);
  // cauda
  box(root, 0.2, 0.18, 0.4, black, 0, 0.22, -1.1);
  box(root, 0.95, 0.1, 0.3, black, 0, 0.3, -1.35);
  // dorsal alta
  box(root, 0.1, 0.7, 0.35, black, 0, 0.55, 0.1);

  return root;
}

/** Peixe-espada. */
export function buildSwordfish() {
  const root = group('swordfish');
  const blue = '#3a7ec4';
  const silver = '#c0ccd8';
  const dark = '#2a4a6a';

  box(root, 0.35, 0.28, 1.1, blue, 0, 0.08, 0);
  box(root, 0.28, 0.14, 0.85, silver, 0, 0, 0.05);
  // espada
  box(root, 0.08, 0.08, 0.7, silver, 0, 0.14, 0.9);
  // olho
  box(root, 0.06, 0.06, 0.04, '#2a1810', 0.12, 0.18, 0.5);
  // cauda
  box(root, 0.08, 0.4, 0.3, dark, 0, 0.15, -0.7);
  // dorsal
  box(root, 0.06, 0.35, 0.4, dark, 0, 0.3, 0.1);
  // peitorais
  box(root, 0.4, 0.05, 0.2, blue, 0.25, 0.1, 0.1);
  box(root, 0.4, 0.05, 0.2, blue, -0.25, 0.1, 0.1);

  return root;
}

const REGISTRY = {
  villager: buildVillager,
  fish: buildFish,
  whale: buildWhale,
  shark: buildShark,
  orca: buildOrca,
  swordfish: buildSwordfish,
};

export function listEntity3dIds() {
  return Object.keys(REGISTRY);
}

export function buildEntity3d(id) {
  const fn = REGISTRY[id];
  if (!fn) throw new Error(`entity3d desconhecido: ${id}. Disponíveis: ${listEntity3dIds().join(', ')}`);
  return fn();
}
