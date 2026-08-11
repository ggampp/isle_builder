/**
 * Generate images via MuAPI (flux-schnell / flux-dev REST).
 * Reads MUAPIAPP_API_KEY from project .env — never commit the key.
 *
 * Usage:
 *   node scripts/generate_image_muapi.mjs --prompt "..." --output assets/concepts/out.png
 *   node scripts/generate_image_muapi.mjs --prompt "..." --model flux-dev --size 512*512
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const opts = {
    prompt: '',
    output: 'assets/concepts/muapi-output.png',
    model: 'flux-schnell',
    size: '512*512',
    pollMs: 2000,
    maxPolls: 60,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--prompt' || arg === '-p') opts.prompt = argv[++i] ?? '';
    else if (arg === '--output' || arg === '-o') opts.output = argv[++i] ?? opts.output;
    else if (arg === '--model' || arg === '-m') opts.model = argv[++i] ?? opts.model;
    else if (arg === '--size' || arg === '-s') opts.size = argv[++i] ?? opts.size;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

function usage() {
  console.log(`Usage: node scripts/generate_image_muapi.mjs --prompt "..." [options]

Options:
  --output, -o   Output path (default: assets/concepts/muapi-output.png)
  --model,  -m   flux-schnell | flux-dev (default: flux-schnell)
  --size,   -s   e.g. 512*512, 1024*1024 (default: 512*512)
`);
}

loadEnvFile(path.join(ROOT, '.env'));

const opts = parseArgs(process.argv);
if (opts.help || !opts.prompt) {
  usage();
  process.exit(opts.prompt ? 0 : 1);
}

const apiKey = process.env.MUAPIAPP_API_KEY ?? process.env.MUAPI_API_KEY;
if (!apiKey) {
  console.error('Error: set MUAPIAPP_API_KEY in .env');
  process.exit(1);
}

const endpoint = opts.model === 'flux-dev'
  ? 'https://api.muapi.ai/api/v1/flux-dev-image'
  : 'https://api.muapi.ai/api/v1/flux-schnell-image';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
};

const body = JSON.stringify({
  prompt: opts.prompt,
  size: opts.size,
  num_images: 1,
  seed: -1,
});

console.log(`Submitting ${opts.model} job...`);
const submitRes = await fetch(endpoint, { method: 'POST', headers, body });
if (!submitRes.ok) {
  const text = await submitRes.text();
  console.error(`Submit failed (${submitRes.status}): ${text}`);
  process.exit(1);
}

const submitJson = await submitRes.json();
const requestId = submitJson.request_id ?? submitJson.data?.id;
if (!requestId) {
  console.error('No request_id in response:', submitJson);
  process.exit(1);
}

console.log(`request_id=${requestId} status=${submitJson.status ?? 'submitted'}`);

let imageUrl = null;
for (let i = 0; i < opts.maxPolls; i++) {
  await new Promise((r) => setTimeout(r, opts.pollMs));
  const pollRes = await fetch(
    `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
    { headers: { 'x-api-key': apiKey } },
  );
  if (!pollRes.ok) {
    console.error(`Poll failed (${pollRes.status})`);
    continue;
  }
  const pollJson = await pollRes.json();
  const status = pollJson.status ?? pollJson.data?.status;
  process.stdout.write(`poll ${i + 1}: ${status}\n`);
  if (status === 'failed') {
    console.error('Generation failed:', pollJson.error ?? pollJson.data?.error ?? pollJson);
    process.exit(1);
  }
  const outputs = pollJson.outputs ?? pollJson.data?.outputs ?? [];
  if (status === 'completed' && outputs.length > 0) {
    imageUrl = outputs[0];
    break;
  }
}

if (!imageUrl) {
  console.error('Timed out waiting for image');
  process.exit(1);
}

const outPath = path.resolve(ROOT, opts.output);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const imgRes = await fetch(imageUrl);
if (!imgRes.ok) {
  console.error(`Download failed (${imgRes.status})`);
  process.exit(1);
}
const buf = Buffer.from(await imgRes.arrayBuffer());
fs.writeFileSync(outPath, buf);

console.log(`Image saved: ${outPath}`);
console.log(`CDN URL: ${imageUrl}`);