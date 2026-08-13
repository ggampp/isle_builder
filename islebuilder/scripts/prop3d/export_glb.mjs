/**
 * Exporta GLB a partir da geometria prop3d (Node, sem WebGL).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Blob as NodeBlob } from 'node:buffer';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

let polyfilled = false;

function ensurePolyfills() {
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

export async function exportPropGlb(root, outPath) {
  ensurePolyfills();
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
