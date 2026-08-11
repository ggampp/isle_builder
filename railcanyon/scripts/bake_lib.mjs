/**
 * Utilitários compartilhados para bake de GLBs no Canyon Rails (Node).
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
    roughness: 0.85,
    metalness: 0.05,
  });
}

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Telhado piramidal low-poly (4 faces). */
export function roof(w, h, d, color, y) {
  const geo = new THREE.CylinderGeometry(0, Math.SQRT1_2, h, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, 1, d);
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.position.y = y + h / 2;
  mesh.castShadow = true;
  return mesh;
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
