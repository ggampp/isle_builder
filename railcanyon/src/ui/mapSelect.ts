import { WORLD_MAPS, type WorldDef } from '../world/maps.ts';
import { readSave } from '../game/save.ts';
import './styles.css';

/**
 * Tela inicial: escolhe um dos mapas jogáveis.
 * Devolve o id do mapa selecionado.
 */
export function showMapSelect(parent: HTMLElement): Promise<string> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'map-select';
    const sky = `${import.meta.env.BASE_URL}assets/textures/canyon-sky.png`;
    overlay.style.backgroundImage =
      `linear-gradient(160deg, rgba(232,168,106,0.45), rgba(138,90,52,0.62)), url("${sky}")`;
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
    overlay.innerHTML = `
      <div class="map-select-card">
        <div class="map-select-brand">
          <span class="logo">🚂<img src="${import.meta.env.BASE_URL}assets/ui/logo.png" alt="" onerror="this.remove()"></span>
          <div>
            <h1>Canyon Rails</h1>
            <p>Escolha um mapa para construir sua ferrovia</p>
          </div>
        </div>
        <div class="map-select-grid" id="map-grid"></div>
      </div>
    `;
    parent.appendChild(overlay);

    const grid = overlay.querySelector('#map-grid')!;
    for (const world of WORLD_MAPS) {
      grid.appendChild(makeCard(world, () => {
        overlay.remove();
        resolve(world.id);
      }));
    }
  });
}

function makeCard(world: WorldDef, onPick: () => void): HTMLElement {
  const save = readSave(world.id);
  const hasSave = !!(save && save.lines.some((l) => l.kinds.length > 0));
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'map-card clickable';
  btn.style.setProperty('--accent', world.accent);
  btn.innerHTML = `
    <div class="map-card-accent"></div>
    <h2>${world.name}</h2>
    <p>${world.blurb}</p>
    <div class="map-card-meta">
      <span>${world.towns.length} cidades</span>
      <span>${hasSave ? '● Continuar' : '○ Nova partida'}</span>
    </div>
  `;
  btn.addEventListener('click', onPick);
  return btn;
}
