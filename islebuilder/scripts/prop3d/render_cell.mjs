/**
 * Raster ortográfico 3/4 (estilo top-down RPG) → PNG via Jimp.
 * Não precisa de WebGL: projeta solids box/cyl com z-buffer.
 */
import Jimp from 'jimp';

function parseHex(color) {
  const hex = color.replace('#', '');
  const n = parseInt(hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
    a: 255,
  };
}

/** Câmera 3/4 elevada: Y sobe na tela, XZ em isométrico suave. */
function project(x, y, z, opt) {
  const { scale, ox, oy, yaw, elev = 0.55 } = opt;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const rx = x * cy - z * sy;
  const rz = x * sy + z * cy;
  const sx = ox + rx * scale;
  const syPix = oy - y * scale * 0.95 - rz * scale * elev;
  const depth = rz * 0.7 + y * 0.3;
  return { sx, sy: syPix, depth };
}

function putPixel(img, zbuf, x, y, depth, rgba, w, h) {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || iy < 0 || ix >= w || iy >= h) return;
  const i = iy * w + ix;
  if (depth <= zbuf[i]) return;
  zbuf[i] = depth;
  img.setPixelColor(Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a), ix, iy);
}

function fillTriangle(img, zbuf, a, b, c, rgba, w, h) {
  // Bounding box
  const minX = Math.floor(Math.min(a.sx, b.sx, c.sx));
  const maxX = Math.ceil(Math.max(a.sx, b.sx, c.sx));
  const minY = Math.floor(Math.min(a.sy, b.sy, c.sy));
  const maxY = Math.ceil(Math.max(a.sy, b.sy, c.sy));
  const area = (b.sx - a.sx) * (c.sy - a.sy) - (b.sy - a.sy) * (c.sx - a.sx);
  if (Math.abs(area) < 1e-6) return;
  // Back-face (culling por sinal da área em tela — conservador)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = (b.sx - a.sx) * (y - a.sy) - (b.sy - a.sy) * (x - a.sx);
      const w1 = (c.sx - b.sx) * (y - b.sy) - (c.sy - b.sy) * (x - b.sx);
      const w2 = (a.sx - c.sx) * (y - c.sy) - (a.sy - c.sy) * (x - c.sx);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        const depth = (a.depth + b.depth + c.depth) / 3;
        putPixel(img, zbuf, x, y, depth, rgba, w, h);
      }
    }
  }
}

function emitBoxFaces(solid, opt, drawFace) {
  const { cx, cy, cz, w, h, d, color } = solid;
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const corners = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ].map(([x, y, z]) => project(x, y, z, opt));

  const faces = [
    [0, 1, 2, 3], // -Z
    [5, 4, 7, 6], // +Z
    [4, 0, 3, 7], // -X
    [1, 5, 6, 2], // +X
    [3, 2, 6, 7], // +Y top
    [4, 5, 1, 0], // -Y bottom
  ];
  const rgba = parseHex(color);
  for (const f of faces) {
    drawFace(corners[f[0]], corners[f[1]], corners[f[2]], corners[f[3]], rgba);
  }
}

function emitCylFaces(solid, opt, drawFace) {
  const { cx, cy, cz, rTop, rBot, h, color, segments = 8 } = solid;
  const rgba = parseHex(color);
  const hy = h / 2;
  const top = [];
  const bot = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    top.push(project(cx + Math.cos(a) * rTop, cy + hy, cz + Math.sin(a) * rTop, opt));
    bot.push(project(cx + Math.cos(a) * rBot, cy - hy, cz + Math.sin(a) * rBot, opt));
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    drawFace(bot[i], bot[j], top[j], top[i], rgba);
  }
  // tampas
  const tCenter = project(cx, cy + hy, cz, opt);
  const bCenter = project(cx, cy - hy, cz, opt);
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    drawFace(tCenter, top[i], top[j], top[i], rgba);
    drawFace(bCenter, bot[j], bot[i], bot[i], rgba);
  }
}

/**
 * @param {object[]} solids
 * @param {{ size?: number, yaw?: number, padding?: number }} opts
 * @returns {Promise<import('jimp')>}
 */
export async function renderSolidsToJimp(solids, opts = {}) {
  const size = opts.size ?? 256;
  const yaw = opts.yaw ?? 0.55;
  const elev = opts.elev ?? 0.55;
  const img = new Jimp(size, size, 0x00000000);
  const zbuf = new Float32Array(size * size);
  zbuf.fill(-Infinity);

  // Bounds preliminares com scale=1 para auto-fit
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const probe = { scale: 1, ox: 0, oy: 0, yaw, elev };
  const probePt = (x, y, z) => {
    const p = project(x, y, z, probe);
    minX = Math.min(minX, p.sx);
    maxX = Math.max(maxX, p.sx);
    minY = Math.min(minY, p.sy);
    maxY = Math.max(maxY, p.sy);
  };
  for (const s of solids) {
    if (s.type === 'box') {
      const hx = s.w / 2;
      const hy = s.h / 2;
      const hz = s.d / 2;
      for (const x of [s.cx - hx, s.cx + hx]) {
        for (const y of [s.cy - hy, s.cy + hy]) {
          for (const z of [s.cz - hz, s.cz + hz]) probePt(x, y, z);
        }
      }
    } else {
      const r = Math.max(s.rTop, s.rBot);
      for (const y of [s.cy - s.h / 2, s.cy + s.h / 2]) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          probePt(s.cx + Math.cos(a) * r, y, s.cz + Math.sin(a) * r);
        }
      }
    }
  }

  const pad = opts.padding ?? 8;
  const bw = Math.max(1e-3, maxX - minX);
  const bh = Math.max(1e-3, maxY - minY);
  const scale = Math.min((size - pad * 2) / bw, (size - pad * 2) / bh);
  const ox = size / 2 - ((minX + maxX) / 2) * scale;
  const oy = size / 2 - ((minY + maxY) / 2) * scale;
  const opt = { scale, ox, oy, yaw, elev };

  const drawFace = (a, b, c, d, rgba) => {
    fillTriangle(img, zbuf, a, b, c, rgba, size, size);
    fillTriangle(img, zbuf, a, c, d, rgba, size, size);
  };

  // Ordenação grosseira: solids mais "longe" primeiro (z-buffer corrige)
  const sorted = [...solids].sort((a, b) => a.cy - b.cy);
  for (const s of sorted) {
    if (s.type === 'box') emitBoxFaces(s, opt, drawFace);
    else emitCylFaces(s, opt, drawFace);
  }

  return img;
}
