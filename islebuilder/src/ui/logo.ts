import { createLogoElement } from './uiIcons.ts';

export class Logo {
  readonly element: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.element = createLogoElement();
    parent.appendChild(this.element);
  }
}
