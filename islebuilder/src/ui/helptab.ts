import { createIconImg, type UiIconId } from './uiIcons.ts';

export class HelpTab {
  constructor(host: HTMLDivElement) {
    host.innerHTML = '';

    const toolsTitle = document.createElement('div');
    toolsTitle.className = 'sec-title';
    toolsTitle.textContent = 'FERRAMENTAS';
    host.appendChild(toolsTitle);

    const tools: [UiIconId, string, string][] = [
      ['brush', 'Pincel', 'B'],
      ['line', 'Linha', 'L'],
      ['rect', 'Retângulo', 'R'],
      ['bucket', 'Preenchimento', 'G'],
      ['eraser', 'Borracha', 'E'],
      ['dropper', 'Conta-gotas', 'I'],
      ['hand', 'Mover câmera', 'H'],
    ];
    for (const [icon, label, key] of tools) {
      host.appendChild(this.createRow(icon, label, key));
    }

    const camTitle = document.createElement('div');
    camTitle.className = 'sec-title';
    camTitle.textContent = 'CÂMERA E EDIÇÃO';
    host.appendChild(camTitle);

    host.appendChild(this.createRow('zoom', 'Zoom', 'Scroll'));
    host.appendChild(this.createRow('undo', 'Desfazer', 'Ctrl+Z'));
    host.appendChild(this.createRow('redo', 'Refazer', 'Ctrl+Y'));
    host.appendChild(this.createRow('eye', 'Esconder interface', 'Tab'));

    const footer = document.createElement('div');
    footer.className = 'help-footer';
    footer.textContent = 'Isle Builder v0.7 — Sprint 07';
    host.appendChild(footer);
  }

  private createRow(iconId: UiIconId, label: string, key: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'hrow';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'emoji';
    iconWrap.appendChild(createIconImg(iconId, 16));

    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = label;

    const keyEl = document.createElement('div');
    keyEl.className = 'key';
    keyEl.textContent = key;

    row.append(iconWrap, lbl, keyEl);
    return row;
  }
}
