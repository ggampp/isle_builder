import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Jimp from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

export const STYLE_PREFIX =
  'Cute Stardew Valley island builder pixel art. Top-down orthographic game sprite. ' +
  'ONE isolated object only, centered on plain white background. ' +
  'NO island platform, NO grass patch, NO dirt circle, NO water, NO scene, NO multiple objects, ' +
  'NO text, NO watermark, NO logo. Dark outline #2a1810, light from top-left. ';

export function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function getApiKey() {
  return process.env.MUAPIAPP_API_KEY ?? process.env.MUAPI_API_KEY ?? null;
}

export async function muapiGenerate({ prompt, model = 'flux-schnell', size = '512*512', pollMs = 2000, maxPolls = 90 }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('MUAPIAPP_API_KEY missing in .env');

  const endpoint =
    model === 'flux-dev'
      ? 'https://api.muapi.ai/api/v1/flux-dev-image'
      : 'https://api.muapi.ai/api/v1/flux-schnell-image';

  const submitRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ prompt, size, num_images: 1, seed: -1 }),
  });
  if (!submitRes.ok) {
    throw new Error(`MuAPI submit ${submitRes.status}: ${await submitRes.text()}`);
  }

  const submitJson = await submitRes.json();
  const requestId = submitJson.request_id ?? submitJson.data?.id;
  if (!requestId) throw new Error(`No request_id: ${JSON.stringify(submitJson)}`);

  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollMs);
    const pollRes = await fetch(`https://api.muapi.ai/api/v1/predictions/${requestId}/result`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!pollRes.ok) continue;
    const pollJson = await pollRes.json();
    const status = pollJson.status ?? pollJson.data?.status;
    const outputs = pollJson.outputs ?? pollJson.data?.outputs ?? [];
    if (status === 'failed') {
      throw new Error(`MuAPI failed: ${pollJson.error ?? pollJson.data?.error ?? 'unknown'}`);
    }
    if (status === 'completed' && outputs.length > 0) {
      return { url: outputs[0], requestId };
    }
  }
  throw new Error(`MuAPI timeout for ${requestId}`);
}

export async function downloadUrl(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}: ${url}`);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Remove near-white background and trim to content bounding box. */
export function removeWhiteBg(img, threshold = 228) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  return trimTransparent(img);
}

export function trimTransparent(img) {
  let minX = img.bitmap.width;
  let minY = img.bitmap.height;
  let maxX = 0;
  let maxY = 0;
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    if (this.bitmap.data[idx + 3] > 8) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  });
  if (maxX <= minX || maxY <= minY) return img;
  return img.crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
}

/** Fit sprite into square cell, bottom-aligned for tall objects. */
export async function processSpriteToCell(srcPath, destPath, cellPx, { bottomAlign = false } = {}) {
  let img = await Jimp.read(srcPath);
  img = removeWhiteBg(img);
  if (img.bitmap.width > cellPx || img.bitmap.height > cellPx) {
    img.scaleToFit(cellPx, cellPx, Jimp.RESIZE_NEAREST_NEIGHBOR);
  }
  const cell = new Jimp(cellPx, cellPx, 0x00000000);
  const x = Math.floor((cellPx - img.bitmap.width) / 2);
  const y = bottomAlign
    ? cellPx - img.bitmap.height - 2
    : Math.floor((cellPx - img.bitmap.height) / 2);
  cell.composite(img, x, y);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  await cell.writeAsync(destPath);
  return destPath;
}

export async function generateAndProcess({ id, prompt, rawDir, outDir, cellPx, bottomAlign = false, skipExisting = true }) {
  const rawPath = path.join(rawDir, `${id}.png`);
  const outPath = path.join(outDir, `${id}.png`);

  if (skipExisting && fs.existsSync(outPath)) {
    console.log(`[skip] ${id}`);
    return outPath;
  }

  console.log(`[gen] ${id}`);
  const { url } = await muapiGenerate({ prompt: STYLE_PREFIX + prompt });
  await downloadUrl(url, rawPath);
  await processSpriteToCell(rawPath, outPath, cellPx, { bottomAlign });
  console.log(`[done] ${id}`);
  return outPath;
}