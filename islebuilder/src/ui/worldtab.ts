import { createIconImg, type UiIconId } from './uiIcons.ts';

export interface WorldTabCallbacks {
  onSpeedChanged: (speed: number) => void;
  onDensityChanged: (type: 'villagers' | 'fish' | 'whales' | 'ships', value: number) => void;
  onToggleFoam: (enabled: boolean) => void;
  onToggleAutoRepopulate: (enabled: boolean) => void;
  onRepopulateNow: () => void;
}

export class WorldTab {
  constructor(host: HTMLDivElement, callbacks: WorldTabCallbacks) {
    host.innerHTML = '';

    const popTitle = document.createElement('div');
    popTitle.className = 'sec-title';
    popTitle.textContent = 'POPULAÇÃO DO MUNDO';
    host.appendChild(popTitle);

    host.appendChild(this.createSliderRow('villager', 'Aldeões', 75, (v) => callbacks.onDensityChanged('villagers', v)));
    host.appendChild(this.createSliderRow('fish', 'Peixes e cardumes', 60, (v) => callbacks.onDensityChanged('fish', v)));
    host.appendChild(this.createSliderRow('whale', 'Baleias e tubarões', 40, (v) => callbacks.onDensityChanged('whales', v)));
    host.appendChild(this.createSliderRow('ship', 'Navios e botes', 30, (v) => callbacks.onDensityChanged('ships', v)));

    const speedTitle = document.createElement('div');
    speedTitle.className = 'sec-title';
    speedTitle.textContent = 'VELOCIDADE DA SIMULAÇÃO';
    host.appendChild(speedTitle);

    const chipsRow = document.createElement('div');
    chipsRow.className = 'chips';

    const speeds = [
      { label: '0.5×', value: 0.5 },
      { label: '1×', value: 1.0 },
      { label: '2×', value: 2.0 },
    ];
    const chipEls: HTMLDivElement[] = [];

    for (const speed of speeds) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      if (speed.value === 1.0) chip.classList.add('on');
      chip.textContent = speed.label;
      chip.addEventListener('click', () => {
        for (const c of chipEls) c.classList.remove('on');
        chip.classList.add('on');
        callbacks.onSpeedChanged(speed.value);
      });
      chipEls.push(chip);
      chipsRow.appendChild(chip);
    }
    host.appendChild(chipsRow);

    const envTitle = document.createElement('div');
    envTitle.className = 'sec-title';
    envTitle.textContent = 'AMBIENTE';
    host.appendChild(envTitle);

    host.appendChild(this.createToggleRow('Espuma e ondas na costa', true, (v) => callbacks.onToggleFoam(v)));
    host.appendChild(this.createToggleRow('Repovoar fauna automaticamente', true, (v) => callbacks.onToggleAutoRepopulate(v)));

    const repopulateBtn = document.createElement('button');
    repopulateBtn.className = 'pill-btn green';
    repopulateBtn.innerHTML = `Repovoar mundo agora<small>redistribui aldeões, fauna e navios</small>`;
    repopulateBtn.addEventListener('click', () => callbacks.onRepopulateNow());
    host.appendChild(repopulateBtn);
  }

  private createSliderRow(iconId: UiIconId, label: string, defaultPct: number, onChange: (val: number) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'srow';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'emoji';
    iconWrap.appendChild(createIconImg(iconId, 18));

    const middle = document.createElement('div');
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = label;

    const track = document.createElement('div');
    track.className = 'track';

    const fill = document.createElement('div');
    fill.className = 'track-fill';

    const knob = document.createElement('div');
    knob.className = 'track-knob';

    const inputEl = document.createElement('input');
    inputEl.type = 'range';
    inputEl.className = 'hidden-slider';
    inputEl.min = '0';
    inputEl.max = '100';
    inputEl.value = defaultPct.toString();

    const valEl = document.createElement('div');
    valEl.className = 'val';

    const updateVisuals = () => {
      const v = Number(inputEl.value);
      valEl.textContent = `${v}%`;
      fill.style.width = `${v}%`;
      knob.style.left = `${v}%`;
    };

    inputEl.addEventListener('input', () => {
      updateVisuals();
      onChange(Number(inputEl.value) / 100);
    });

    updateVisuals();

    track.append(fill, knob, inputEl);
    middle.append(lbl, track);
    row.append(iconWrap, middle, valEl);

    return row;
  }

  private createToggleRow(label: string, defaultOn: boolean, onChange: (on: boolean) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'trow';

    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = label;

    const toggle = document.createElement('div');
    toggle.className = 'switch';
    if (defaultOn) toggle.classList.add('on');

    let isOn = defaultOn;
    row.addEventListener('click', () => {
      isOn = !isOn;
      toggle.classList.toggle('on', isOn);
      onChange(isOn);
    });

    row.append(lbl, toggle);
    return row;
  }
}
