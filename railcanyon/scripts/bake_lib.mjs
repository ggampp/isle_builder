/**
 * Utilitários mid-poly (nível B) para bake de GLBs no Canyon Rails.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Blob as NodeBlob } from 'node:buffer';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

let polyfilled = false;

export function ensureNodeGlbPolyfills() {
  if (polyfilled) return;
  globalThis.Blob = NodeBlob;
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    onerror = null;
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((buf) => {
          this.result = buf;
          if (typeof this.onloadend === 'function') this.onloadend();
        })
        .catch((err) => {
          if (typeof this.onerror === 'function') this.onerror(err);
        });
    }
  };
  polyfilled = true;
}

export function mat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.82,
    metalness: 0.04,
  });
}

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cyl(rTop, rBot, h, color, x, y, z, segments = 16, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cone(r, h, color, x, y, z, segments = 14) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  return mesh;
}

/** Telhado piramidal mid-poly. */
export function roof(w, h, d, color, y) {
  const geo = new THREE.CylinderGeometry(0, Math.SQRT1_2, h, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, 1, d);
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.position.y = y + h / 2;
  mesh.castShadow = true;
  return mesh;
}

/** Janela com moldura, vidro e travessa (mullion). */
export function windowDetail(w, h, x, y, z, trim = '#6b4a2f', glass = '#8fc6e8') {
  const g = new THREE.Group();
  g.add(box(w + 0.16, h + 0.16, 0.1, trim, x, y, z));
  g.add(box(w, h, 0.06, glass, x, y, z + 0.03));
  g.add(box(0.06, h * 0.92, 0.07, trim, x, y, z + 0.05));
  g.add(box(w * 0.92, 0.06, 0.07, trim, x, y, z + 0.05));
  // peitoril
  g.add(box(w + 0.28, 0.08, 0.22, trim, x, y - h / 2 - 0.02, z + 0.06));
  return g;
}

/** Porta com painéis e maçaneta. */
export function doorDetail(w, h, x, y, z, trim = '#6b4a2f', panel = '#8a5a34') {
  const g = new THREE.Group();
  g.add(box(w + 0.14, h + 0.1, 0.12, trim, x, y, z));
  g.add(box(w, h, 0.1, panel, x, y, z + 0.02));
  g.add(box(w * 0.7, h * 0.28, 0.04, trim, x, y + h * 0.22, z + 0.08));
  g.add(box(w * 0.7, h * 0.28, 0.04, trim, x, y - h * 0.18, z + 0.08));
  g.add(box(0.08, 0.08, 0.12, '#c9a26a', x + w * 0.32, y, z + 0.12));
  return g;
}

/** Foundation de pedra com cantos. */
export function stoneBase(w, d, h, color = '#9a8a78', dark = '#7a6a58') {
  const g = new THREE.Group();
  g.add(box(w, h, d, color, 0, 0, 0));
  const inset = 0.18;
  for (const [sx, sz] of [
    [-w / 2 + inset, -d / 2 + inset],
    [w / 2 - inset, -d / 2 + inset],
    [-w / 2 + inset, d / 2 - inset],
    [w / 2 - inset, d / 2 - inset],
  ]) {
    g.add(box(0.35, h + 0.08, 0.35, dark, sx, 0, sz));
  }
  return g;
}

export async function exportGlb(root, outPath) {
  ensureNodeGlbPolyfills();
  const scene = new THREE.Scene();
  scene.add(root);
  const exporter = new GLTFExporter();
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true });
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(arrayBuffer));
  return arrayBuffer.byteLength;
}
