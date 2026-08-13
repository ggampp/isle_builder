/**
 * Geometrias 3D low-poly dos props do Isle Builder (estilo Canyon Rails).
 * Cada builder devolve { root, solids } — root → GLB; solids → raster 2D opcional.
 */
import * as THREE from 'three';

export function mat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.02,
  });
}

export function solidBox(cx, cy, cz, w, h, d, color) {
  return { type: 'box', cx, cy, cz, w, h, d, color };
}

export function solidCyl(cx, cy, cz, rTop, rBot, h, color, segments = 8) {
  return { type: 'cyl', cx, cy, cz, rTop, rBot, h, color, segments };
}

function addBox(root, solids, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  root.add(mesh);
  solids.push(solidBox(x, y + h / 2, z, w, h, d, color));
}

function addCyl(root, solids, rTop, rBot, h, color, x, y, z, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  root.add(mesh);
  solids.push(solidCyl(x, y + h / 2, z, rTop, rBot, h, color, segments));
}

function addCone(root, solids, r, h, color, x, y, z, segments = 8) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  root.add(mesh);
  solids.push(solidCyl(x, y + h / 2, z, 0.01, r, h, color, segments));
}

function group(name) {
  const root = new THREE.Group();
  root.name = name;
  return { root, solids: [] };
}

/** Coqueiro. */
export function buildTreePalm() {
  const { root, solids } = group('tree_palm');
  const trunkDark = '#6b4a2f';
  const trunkMid = '#8a5a34';
  const trunkLight = '#a0724a';
  const leaf = '#3f9b4f';
  const leafDark = '#2d7a3a';
  const leafLite = '#58c25c';
  const coconut = '#7d5433';

  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const y = i * 0.42;
    const x = t * t * 0.55;
    const r = 0.28 - t * 0.08;
    const col = i % 2 === 0 ? trunkMid : trunkDark;
    addCyl(root, solids, r * 0.92, r, 0.44, col, x, y, 0, 7);
    if (i > 0 && i % 2 === 0) {
      addCyl(root, solids, r * 1.05, r * 1.05, 0.06, trunkLight, x, y + 0.18, 0, 7);
    }
  }

  const crownX = 0.55;
  const crownY = segs * 0.42;
  addCyl(root, solids, 0.22, 0.35, 0.35, trunkDark, crownX, crownY - 0.1, 0, 6);

  const fronds = [
    { yaw: 0, col: leaf, len: 2.1 },
    { yaw: 0.7, col: leafDark, len: 2.0 },
    { yaw: 1.4, col: leafLite, len: 1.9 },
    { yaw: 2.1, col: leaf, len: 2.15 },
    { yaw: 2.8, col: leafDark, len: 1.95 },
    { yaw: 3.5, col: leaf, len: 2.05 },
    { yaw: 4.2, col: leafLite, len: 1.85 },
    { yaw: 5.0, col: leafDark, len: 2.0 },
  ];
  for (const f of fronds) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, f.len), mat(f.col));
    mesh.position.set(
      crownX + Math.sin(f.yaw) * (f.len * 0.38),
      crownY + 0.2,
      Math.cos(f.yaw) * (f.len * 0.38),
    );
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = f.yaw;
    mesh.rotation.x = -0.45;
    mesh.castShadow = true;
    root.add(mesh);
    solids.push(
      solidBox(
        crownX + Math.sin(f.yaw) * (f.len * 0.38),
        crownY + 0.12,
        Math.cos(f.yaw) * (f.len * 0.38),
        0.5,
        0.35,
        f.len * 0.6,
        f.col,
      ),
    );
  }

  for (const [dx, dz] of [
    [0.15, 0.12],
    [-0.1, 0.15],
    [0.05, -0.14],
  ]) {
    addCyl(root, solids, 0.12, 0.12, 0.18, coconut, crownX + dx, crownY - 0.25, dz, 6);
  }

  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildRoundTree(id, leafColor, fruitColor = null) {
  const { root, solids } = group(id);
  addCyl(root, solids, 0.22, 0.28, 1.6, '#6b4a2f', 0, 0, 0, 7);
  addCyl(root, solids, 1.1, 1.25, 1.4, leafColor, 0, 1.5, 0, 8);
  addCyl(root, solids, 0.85, 0.95, 1.0, leafColor, 0, 2.4, 0, 8);
  if (fruitColor) {
    for (const [dx, dy, dz] of [
      [0.5, 2.0, 0.3],
      [-0.4, 2.2, -0.2],
      [0.2, 2.5, -0.5],
    ]) {
      addCyl(root, solids, 0.12, 0.12, 0.16, fruitColor, dx, dy, dz, 6);
    }
  }
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildPine() {
  const { root, solids } = group('tree_pine');
  addCyl(root, solids, 0.2, 0.26, 1.4, '#5c4632', 0, 0, 0, 7);
  addCone(root, solids, 1.35, 1.5, '#2d6b3a', 0, 1.2, 0, 8);
  addCone(root, solids, 1.05, 1.3, '#348045', 0, 2.2, 0, 8);
  addCone(root, solids, 0.7, 1.1, '#3f9b4f', 0, 3.1, 0, 8);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildBush(id, size) {
  const { root, solids } = group(id);
  const r = size * 0.55;
  addCyl(root, solids, r, r * 1.1, size * 0.7, '#3f9b4f', 0, 0, 0, 8);
  addCyl(root, solids, r * 0.7, r * 0.8, size * 0.45, '#58c25c', size * 0.25, size * 0.25, size * 0.15, 7);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildRock(id, size) {
  const { root, solids } = group(id);
  addBox(root, solids, size * 1.1, size * 0.55, size * 0.9, '#8a8680', 0, 0, 0);
  addBox(root, solids, size * 0.7, size * 0.4, size * 0.6, '#9a9690', size * 0.2, size * 0.35, size * 0.1);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildFlower(id, petal) {
  const { root, solids } = group(id);
  addCyl(root, solids, 0.04, 0.04, 0.55, '#3f9b4f', 0, 0, 0, 5);
  addCyl(root, solids, 0.18, 0.18, 0.12, petal, 0, 0.5, 0, 8);
  addCyl(root, solids, 0.07, 0.07, 0.08, '#f5d98a', 0, 0.58, 0, 6);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildHouse(id, wall, roof) {
  const { root, solids } = group(id);
  addBox(root, solids, 2.6, 1.8, 2.2, wall, 0, 0, 0);
  addBox(root, solids, 2.9, 0.15, 2.5, '#5c4632', 0, 0, 0);
  // Telhado duas águas
  const left = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.18, 1.5), mat(roof));
  left.position.set(0, 2.15, -0.55);
  left.rotation.x = 0.4;
  left.castShadow = true;
  root.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.18, 1.5), mat(roof));
  right.position.set(0, 2.15, 0.55);
  right.rotation.x = -0.4;
  right.castShadow = true;
  root.add(right);
  solids.push(solidBox(0, 2.2, 0, 2.9, 0.9, 2.5, roof));
  addBox(root, solids, 0.55, 1.1, 0.08, '#6b4a2f', 0, 0, 1.12);
  addBox(root, solids, 0.45, 0.45, 0.06, '#8fc6e8', -0.7, 0.9, 1.12);
  addBox(root, solids, 0.45, 0.45, 0.06, '#8fc6e8', 0.7, 0.9, 1.12);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildBarn() {
  const { root, solids } = group('barn');
  addBox(root, solids, 4.2, 2.4, 2.8, '#b5432f', 0, 0, 0);
  addBox(root, solids, 4.5, 0.2, 3.1, '#5c4632', 0, 0, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 3.4), mat('#6b4a2f'));
  roof.position.set(0, 2.9, 0);
  roof.castShadow = true;
  root.add(roof);
  solids.push(solidBox(0, 2.9, 0, 4.6, 0.2, 3.4, '#6b4a2f'));
  addBox(root, solids, 1.4, 1.8, 0.1, '#8a5a34', 0, 0, 1.42);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildShop() {
  const { root, solids } = group('shop');
  addBox(root, solids, 3.8, 2.0, 2.6, '#e6d3ae', 0, 0, 0);
  addBox(root, solids, 4.0, 0.9, 0.2, '#3a6a9a', 0, 1.5, 1.35);
  addBox(root, solids, 0.9, 1.4, 0.1, '#6b4a2f', -0.8, 0, 1.32);
  addBox(root, solids, 1.2, 0.8, 0.08, '#8fc6e8', 0.9, 0.8, 1.32);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildWell() {
  const { root, solids } = group('well');
  addCyl(root, solids, 0.85, 0.95, 0.9, '#8a8680', 0, 0, 0, 10);
  addCyl(root, solids, 0.7, 0.7, 0.15, '#4a6a8a', 0, 0.85, 0, 10);
  addBox(root, solids, 0.12, 1.4, 0.12, '#6b4a2f', -0.7, 0.9, 0);
  addBox(root, solids, 0.12, 1.4, 0.12, '#6b4a2f', 0.7, 0.9, 0);
  addBox(root, solids, 1.6, 0.12, 0.12, '#6b4a2f', 0, 2.2, 0);
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

function buildSimple(id, kind) {
  const { root, solids } = group(id);
  switch (kind) {
    case 'crate':
      addBox(root, solids, 0.9, 0.7, 0.9, '#c9a26a', 0, 0, 0);
      break;
    case 'barrel':
      addCyl(root, solids, 0.4, 0.45, 0.85, '#8a5a34', 0, 0, 0, 10);
      addCyl(root, solids, 0.42, 0.42, 0.08, '#5c4632', 0, 0.35, 0, 10);
      break;
    case 'bucket':
      addCyl(root, solids, 0.28, 0.32, 0.45, '#7a8a9a', 0, 0, 0, 8);
      break;
    case 'sign':
      addCyl(root, solids, 0.06, 0.06, 1.1, '#6b4a2f', 0, 0, 0, 5);
      addBox(root, solids, 0.7, 0.45, 0.08, '#e6d3ae', 0, 1.0, 0);
      break;
    case 'lantern':
      addCyl(root, solids, 0.05, 0.05, 1.2, '#5c4632', 0, 0, 0, 5);
      addBox(root, solids, 0.35, 0.4, 0.35, '#f5d98a', 0, 1.1, 0);
      break;
    case 'fence':
      addBox(root, solids, 1.2, 0.12, 0.1, '#8a5a34', 0, 0.55, 0);
      addCyl(root, solids, 0.07, 0.07, 0.85, '#6b4a2f', -0.5, 0, 0, 5);
      addCyl(root, solids, 0.07, 0.07, 0.85, '#6b4a2f', 0.5, 0, 0, 5);
      break;
    case 'umbrella':
      addCyl(root, solids, 0.05, 0.05, 1.5, '#e6d3ae', 0, 0, 0, 5);
      addCone(root, solids, 0.95, 0.35, '#e85d4c', 0, 1.45, 0, 10);
      break;
    case 'chair':
      addBox(root, solids, 0.55, 0.12, 0.55, '#8a5a34', 0, 0.4, 0);
      addBox(root, solids, 0.55, 0.55, 0.08, '#8a5a34', 0, 0.5, -0.24);
      addCyl(root, solids, 0.05, 0.05, 0.4, '#6b4a2f', 0.22, 0, 0.22, 5);
      addCyl(root, solids, 0.05, 0.05, 0.4, '#6b4a2f', -0.22, 0, 0.22, 5);
      break;
    case 'stool':
      addCyl(root, solids, 0.28, 0.28, 0.1, '#8a5a34', 0, 0.4, 0, 8);
      addCyl(root, solids, 0.06, 0.06, 0.45, '#6b4a2f', 0, 0, 0, 5);
      break;
    case 'hay':
      addCyl(root, solids, 0.45, 0.45, 0.7, '#d4b56a', 0, 0, 0, 10);
      break;
    case 'sack':
      addCyl(root, solids, 0.35, 0.4, 0.55, '#c9a26a', 0, 0, 0, 8);
      break;
    case 'mushroom':
      addCyl(root, solids, 0.08, 0.1, 0.25, '#e6d3ae', 0, 0, 0, 6);
      addCyl(root, solids, 0.28, 0.3, 0.16, '#e85d4c', 0, 0.22, 0, 8);
      break;
    case 'shell':
      addBox(root, solids, 0.35, 0.12, 0.28, '#f2e6cc', 0, 0, 0);
      break;
    case 'starfish':
      addBox(root, solids, 0.4, 0.06, 0.12, '#e89a5c', 0, 0, 0);
      addBox(root, solids, 0.12, 0.06, 0.4, '#e89a5c', 0, 0, 0);
      break;
    case 'driftwood':
      addCyl(root, solids, 0.12, 0.1, 1.0, '#8a5a34', 0, 0, 0, 6);
      break;
    case 'coral':
      addCyl(root, solids, 0.08, 0.12, 0.55, '#e88aaa', 0, 0, 0, 6);
      addCyl(root, solids, 0.06, 0.08, 0.4, '#f0a0b8', 0.15, 0.2, 0.05, 5);
      break;
    case 'pebble':
      addBox(root, solids, 0.25, 0.12, 0.2, '#9a9690', 0, 0, 0);
      break;
    case 'grass':
      addBox(root, solids, 0.08, 0.45, 0.08, '#3f9b4f', -0.1, 0, 0);
      addBox(root, solids, 0.08, 0.55, 0.08, '#58c25c', 0.05, 0, 0.05);
      addBox(root, solids, 0.08, 0.4, 0.08, '#2d7a3a', 0.12, 0, -0.08);
      break;
    case 'fern':
      addBox(root, solids, 0.5, 0.08, 0.15, '#2d7a3a', 0, 0.35, 0);
      addCyl(root, solids, 0.04, 0.04, 0.4, '#3f9b4f', 0, 0, 0, 5);
      break;
    case 'clover':
      addCyl(root, solids, 0.03, 0.03, 0.25, '#3f9b4f', 0, 0, 0, 5);
      addCyl(root, solids, 0.12, 0.12, 0.05, '#58c25c', 0, 0.25, 0, 6);
      break;
    case 'lily':
      addCyl(root, solids, 0.45, 0.45, 0.06, '#3f9b4f', 0, 0, 0, 10);
      addCyl(root, solids, 0.1, 0.1, 0.08, '#f5f0e6', 0, 0.05, 0, 6);
      break;
    case 'wheelbarrow':
      addBox(root, solids, 0.9, 0.35, 0.55, '#8a5a34', 0, 0.25, 0);
      addCyl(root, solids, 0.22, 0.22, 0.1, '#5c4632', 0.45, 0.15, 0, 8);
      break;
    case 'lounger':
      addBox(root, solids, 1.6, 0.12, 0.55, '#e85d4c', 0, 0.25, 0);
      addBox(root, solids, 0.5, 0.4, 0.55, '#e85d4c', -0.55, 0.35, 0);
      break;
    case 'shovel':
      addCyl(root, solids, 0.04, 0.04, 1.1, '#6b4a2f', 0, 0, 0, 5);
      addBox(root, solids, 0.28, 0.35, 0.06, '#7a8a9a', 0, 0, 0);
      break;
    case 'bottle':
      addCyl(root, solids, 0.1, 0.14, 0.45, '#8fc6e8', 0, 0, 0, 8);
      addCyl(root, solids, 0.06, 0.06, 0.15, '#8fc6e8', 0, 0.45, 0, 6);
      break;
    case 'rope':
      addCyl(root, solids, 0.28, 0.28, 0.25, '#c9a26a', 0, 0, 0, 10);
      break;
    case 'pail':
      addCyl(root, solids, 0.28, 0.32, 0.4, '#d0d4d8', 0, 0, 0, 8);
      break;
    case 'can':
      addCyl(root, solids, 0.2, 0.22, 0.35, '#4a8aca', 0, 0, 0, 8);
      addBox(root, solids, 0.35, 0.08, 0.08, '#4a8aca', 0.25, 0.25, 0);
      break;
    case 'fork':
      addCyl(root, solids, 0.04, 0.04, 1.0, '#6b4a2f', 0, 0, 0, 5);
      addBox(root, solids, 0.35, 0.25, 0.05, '#7a8a9a', 0, 0.95, 0);
      break;
    case 'lights':
      addCyl(root, solids, 0.03, 0.03, 0.05, '#f5d98a', -0.6, 1.2, 0, 5);
      addCyl(root, solids, 0.03, 0.03, 0.05, '#f5d98a', 0, 1.15, 0, 5);
      addCyl(root, solids, 0.03, 0.03, 0.05, '#f5d98a', 0.6, 1.2, 0, 5);
      addBox(root, solids, 1.4, 0.04, 0.04, '#5c4632', 0, 1.25, 0);
      break;
    default:
      addBox(root, solids, 0.6, 0.6, 0.6, '#c9a26a', 0, 0, 0);
  }
  return { root, solids, bottomAlign: true, cellPx: 64 };
}

const REGISTRY = {
  tree_palm: buildTreePalm,
  tree_oak: () => buildRoundTree('tree_oak', '#3f9b4f'),
  tree_apple: () => buildRoundTree('tree_apple', '#3f9b4f', '#e85d4c'),
  tree_cherry: () => buildRoundTree('tree_cherry', '#f0a0b8', '#e85d4c'),
  tree_pine: buildPine,
  bush_small: () => buildBush('bush_small', 0.9),
  bush_large: () => buildBush('bush_large', 1.35),
  rock_small: () => buildRock('rock_small', 0.7),
  rock_large: () => buildRock('rock_large', 1.2),
  flower_red: () => buildFlower('flower_red', '#e85d4c'),
  flower_yellow: () => buildFlower('flower_yellow', '#f5d98a'),
  flower_white: () => buildFlower('flower_white', '#f5f0e6'),
  flower_pink: () => buildFlower('flower_pink', '#f0a0b8'),
  tulip: () => buildFlower('tulip', '#e85d4c'),
  daisy: () => buildFlower('daisy', '#f5f0e6'),
  house_red: () => buildHouse('house_red', '#e6d3ae', '#b5432f'),
  house_blue: () => buildHouse('house_blue', '#e6d3ae', '#3a6a9a'),
  house_green: () => buildHouse('house_green', '#e6d3ae', '#3f9b4f'),
  house_yellow: () => buildHouse('house_yellow', '#e6d3ae', '#d4b56a'),
  barn: buildBarn,
  shop: buildShop,
  well: buildWell,
  crate: () => buildSimple('crate', 'crate'),
  barrel: () => buildSimple('barrel', 'barrel'),
  bucket_item: () => buildSimple('bucket_item', 'bucket'),
  shovel: () => buildSimple('shovel', 'shovel'),
  fork_tool: () => buildSimple('fork_tool', 'fork'),
  sign_post: () => buildSimple('sign_post', 'sign'),
  lantern: () => buildSimple('lantern', 'lantern'),
  fence: () => buildSimple('fence', 'fence'),
  fence_corner: () => buildSimple('fence_corner', 'fence'),
  umbrella: () => buildSimple('umbrella', 'umbrella'),
  chair: () => buildSimple('chair', 'chair'),
  lounger: () => buildSimple('lounger', 'lounger'),
  rope_coil: () => buildSimple('rope_coil', 'rope'),
  sack: () => buildSimple('sack', 'sack'),
  watering_can: () => buildSimple('watering_can', 'can'),
  bottle: () => buildSimple('bottle', 'bottle'),
  milk_pail: () => buildSimple('milk_pail', 'pail'),
  stool: () => buildSimple('stool', 'stool'),
  wheelbarrow: () => buildSimple('wheelbarrow', 'wheelbarrow'),
  hay_bale: () => buildSimple('hay_bale', 'hay'),
  light_string: () => buildSimple('light_string', 'lights'),
  shell: () => buildSimple('shell', 'shell'),
  starfish: () => buildSimple('starfish', 'starfish'),
  grass_tuft: () => buildSimple('grass_tuft', 'grass'),
  mushroom: () => buildSimple('mushroom', 'mushroom'),
  clover: () => buildSimple('clover', 'clover'),
  fern: () => buildSimple('fern', 'fern'),
  pebble: () => buildSimple('pebble', 'pebble'),
  driftwood: () => buildSimple('driftwood', 'driftwood'),
  coral_piece: () => buildSimple('coral_piece', 'coral'),
  lily: () => buildSimple('lily', 'lily'),
};

export function listProp3dIds() {
  return Object.keys(REGISTRY);
}

export function buildProp3d(id) {
  const fn = REGISTRY[id];
  if (!fn) throw new Error(`prop3d desconhecido: ${id}. Disponíveis: ${listProp3dIds().join(', ')}`);
  return fn();
}
