/**
 * Ícones SVG do painel Construir — estilo isométrico low-poly do Canyon Rails.
 * Data-URLs sem depender de Canvas (funciona em Vitest/Node e no browser).
 */
import type { PieceKind } from '../rail/geometry.ts';
import type { BuildingKind } from '../world/buildings.ts';

type ToolKind = 'dynamite' | 'siding';

const cache = new Map<string, string>();

function svg(body: string, bg = 'url(#sky)'): string {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8ec8ef"/>
        <stop offset="54%" stop-color="#8ec8ef"/>
        <stop offset="54%" stop-color="#6fae5c"/>
        <stop offset="100%" stop-color="#5a9648"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" fill="${bg}" rx="6"/>
    ${body}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function render(key: string, body: string, bg?: string): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const url = svg(body, bg);
  cache.set(key, url);
  return url;
}

const TRACK: Record<PieceKind, string> = {
  straight: render('track:straight', `
    <path d="M14 50 L50 18" stroke="#8a5a34" stroke-width="7" stroke-linecap="round"/>
    <path d="M14 47 L50 15" stroke="#d8dde3" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M14 53 L50 21" stroke="#d8dde3" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M48 12 L56 18 L46 20 Z" fill="#ffd76a" stroke="#3a2a18" stroke-width="1"/>
  `),
  curveL: render('track:curveL', `
    <path d="M14 52 Q36 38 46 14" fill="none" stroke="#8a5a34" stroke-width="7" stroke-linecap="round"/>
    <path d="M14 49 Q36 35 46 11" fill="none" stroke="#d8dde3" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M14 55 Q36 41 46 17" fill="none" stroke="#d8dde3" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M42 10 L52 16 L40 18 Z" fill="#ffd76a" stroke="#3a2a18" stroke-width="1"/>
  `),
  curveR: render('track:curveR', `
    <path d="M14 44 Q30 22 52 28" fill="none" stroke="#8a5a34" stroke-width="7" stroke-linecap="round"/>
    <path d="M14 41 Q30 19 52 25" fill="none" stroke="#d8dde3" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M14 47 Q30 25 52 31" fill="none" stroke="#d8dde3" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M50 22 L58 28 L48 30 Z" fill="#ffd76a" stroke="#3a2a18" stroke-width="1"/>
  `),
  sharpL: render('track:sharpL', `
    <path d="M14 52 Q28 40 30 16" fill="none" stroke="#4a83e8" stroke-width="8" stroke-linecap="round"/>
    <path d="M14 52 Q28 40 30 16" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M26 12 L36 10 L30 20 Z" fill="#ffd76a" stroke="#3a2a18" stroke-width="1"/>
  `),
  sharpR: render('track:sharpR', `
    <path d="M14 40 Q28 20 50 34" fill="none" stroke="#4a83e8" stroke-width="8" stroke-linecap="round"/>
    <path d="M14 40 Q28 20 50 34" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M48 30 L58 34 L48 40 Z" fill="#ffd76a" stroke="#3a2a18" stroke-width="1"/>
  `),
};

const BUILDING: Record<BuildingKind, string> = {
  cottage: render('building:cottage', `
    <polygon points="16,42 34,34 48,42 48,54 16,54" fill="#e6d3ae" stroke="#3a2a18" stroke-width="1.4"/>
    <polygon points="16,42 34,28 48,42" fill="#b5432f" stroke="#3a2a18" stroke-width="1.4"/>
    <rect x="28" y="44" width="6" height="10" fill="#6b4a2f"/>
    <rect x="38" y="30" width="5" height="9" fill="#8a5a34" stroke="#3a2a18" stroke-width="1"/>
    <rect x="20" y="44" width="5" height="5" fill="#8fc6e8" stroke="#3a2a18" stroke-width="1"/>
  `),
  house: render('building:house', `
    <polygon points="12,44 36,34 52,44 52,56 12,56" fill="#f0e2c4" stroke="#3a2a18" stroke-width="1.4"/>
    <polygon points="12,44 36,24 52,44" fill="#3f6dc0" stroke="#3a2a18" stroke-width="1.4"/>
    <rect x="20" y="46" width="7" height="10" fill="#6b4a2f"/>
    <rect x="36" y="42" width="7" height="7" fill="#8fc6e8" stroke="#3a2a18" stroke-width="1"/>
  `),
  manor: render('building:manor', `
    <polygon points="8,48 40,36 56,48 56,58 8,58" fill="#e6d3ae" stroke="#3a2a18" stroke-width="1.4"/>
    <polygon points="8,48 40,28 56,48" fill="#b5432f" stroke="#3a2a18" stroke-width="1.4"/>
    <polygon points="28,36 44,28 52,36 52,46 28,46" fill="#f0e2c4" stroke="#3a2a18" stroke-width="1.2"/>
    <polygon points="28,36 44,20 52,36" fill="#b5432f" stroke="#3a2a18" stroke-width="1.2"/>
    <rect x="14" y="30" width="6" height="16" fill="#8a5a34" stroke="#3a2a18" stroke-width="1"/>
  `),
  cabin: render('building:cabin', `
    <polygon points="14,44 36,34 50,44 50,56 14,56" fill="#7d5433" stroke="#3a2a18" stroke-width="1.4"/>
    <polygon points="14,44 36,26 50,44" fill="#8a5a34" stroke="#3a2a18" stroke-width="1.4"/>
    <path d="M16 48 H48 M16 51 H48 M16 54 H48" stroke="#4a3020" stroke-width="1.2"/>
    <rect x="28" y="46" width="6" height="10" fill="#4a3020"/>
  `),
  watertower: render('building:watertower', `
    <line x1="22" y1="56" x2="26" y2="30" stroke="#5c4632" stroke-width="2.5"/>
    <line x1="42" y1="56" x2="38" y2="30" stroke="#5c4632" stroke-width="2.5"/>
    <line x1="28" y1="56" x2="30" y2="30" stroke="#5c4632" stroke-width="2"/>
    <line x1="36" y1="56" x2="34" y2="30" stroke="#5c4632" stroke-width="2"/>
    <ellipse cx="32" cy="28" rx="14" ry="8" fill="#7d5433" stroke="#3a2a18" stroke-width="1.3"/>
    <polygon points="18,28 32,16 46,28" fill="#3f6dc0" stroke="#3a2a18" stroke-width="1.3"/>
  `),
  windmill: render('building:windmill', `
    <polygon points="26,54 38,48 38,22 26,28" fill="#e6d3ae" stroke="#3a2a18" stroke-width="1.3"/>
    <polygon points="26,28 38,22 44,18 32,14" fill="#b5432f" stroke="#3a2a18" stroke-width="1.3"/>
    <line x1="38" y1="24" x2="54" y2="12" stroke="#f2e6cc" stroke-width="4" stroke-linecap="round"/>
    <line x1="38" y1="24" x2="52" y2="38" stroke="#f2e6cc" stroke-width="4" stroke-linecap="round"/>
    <line x1="38" y1="24" x2="22" y2="12" stroke="#f2e6cc" stroke-width="4" stroke-linecap="round"/>
    <line x1="38" y1="24" x2="24" y2="38" stroke="#f2e6cc" stroke-width="4" stroke-linecap="round"/>
    <circle cx="38" cy="24" r="3.5" fill="#5c4632"/>
  `),
  shed: render('building:shed', `
    <polygon points="10,44 36,34 54,44 54,56 10,56" fill="#8a5a34" stroke="#3a2a18" stroke-width="1.4"/>
    <polygon points="10,44 36,26 54,44" fill="#5c4632" stroke="#3a2a18" stroke-width="1.4"/>
    <rect x="28" y="44" width="10" height="12" fill="#6b4a2f"/>
    <rect x="14" y="46" width="6" height="6" fill="#c9a26a" stroke="#3a2a18" stroke-width="1"/>
  `),
  lamp: render('building:lamp', `
    <rect x="30" y="22" width="4" height="30" fill="#3a3a42"/>
    <rect x="24" y="50" width="16" height="4" fill="#3a3a42"/>
    <rect x="25" y="16" width="14" height="10" rx="2" fill="#f5d98a" stroke="#3a2a18" stroke-width="1"/>
    <rect x="28" y="18" width="8" height="6" fill="#ffe9a8"/>
  `, 'url(#sky)'),
  bench: render('building:bench', `
    <rect x="14" y="40" width="36" height="6" rx="1" fill="#c9a26a" stroke="#3a2a18" stroke-width="1.2"/>
    <rect x="14" y="30" width="36" height="10" rx="1" fill="#8a5a34" stroke="#3a2a18" stroke-width="1.2"/>
    <rect x="16" y="46" width="5" height="8" fill="#5c4632"/>
    <rect x="43" y="46" width="5" height="8" fill="#5c4632"/>
  `),
};

const TOOL: Record<ToolKind, string> = {
  siding: render('tool:siding', `
    <path d="M10 46 L54 20" stroke="#d8dde3" stroke-width="3" stroke-linecap="round"/>
    <path d="M28 36 L52 46" stroke="#d8dde3" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" cy="36" r="6" fill="#4a83e8" stroke="#fff" stroke-width="2"/>
  `),
  dynamite: render('tool:dynamite', `
    <rect x="22" y="30" width="18" height="22" rx="3" fill="#c04040" stroke="#3a2a18" stroke-width="1.3"/>
    <rect x="22" y="30" width="18" height="6" fill="#e05656"/>
    <path d="M36 30 Q42 22 48 16" fill="none" stroke="#3a2a18" stroke-width="2"/>
    <circle cx="48" cy="16" r="4" fill="#ffb020"/>
    <circle cx="48" cy="16" r="2" fill="#fff3a0"/>
  `),
};

export function trackIconUrl(kind: PieceKind): string {
  return TRACK[kind];
}

export function buildingIconUrl(kind: BuildingKind): string {
  return BUILDING[kind];
}

export function toolIconUrl(kind: ToolKind): string {
  return TOOL[kind];
}
