/** Objetivos-tutorial encadeados, no espírito do card "Objective" do vídeo. */

export interface ObjectiveProgress {
  /** Peças de trilho assentadas desde o início da partida. */
  piecesPlaced: number;
  connectedTowns: string[];
  contractsAccepted: number;
  contractsCompleted: number;
  buildingsPlaced: number;
}

export interface ObjectiveDef {
  title: string;
  detail: string;
  reward: number;
  xp: number;
  /** Fração concluída em [0,1]. */
  progress: (p: ObjectiveProgress) => number;
}

export const OBJECTIVES: ObjectiveDef[] = [
  {
    title: 'Estenda a linha',
    detail: 'Escolha uma peça de trilho no painel Construir e assente 4 peças na ponta brilhante.',
    reward: 400,
    xp: 120,
    progress: (p) => p.piecesPlaced / 4,
  },
  {
    title: 'Ligue Canyon Town',
    detail: 'Leve os trilhos até Canyon Town, a leste, para conectar a estação.',
    reward: 900,
    xp: 260,
    progress: (p) => (p.connectedTowns.includes('canyon') ? 1 : 0),
  },
  {
    title: 'Aceite um contrato',
    detail: 'Abra Contratos no rodapé e aceite uma entrega de uma cidade conectada.',
    reward: 300,
    xp: 90,
    progress: (p) => Math.min(1, p.contractsAccepted),
  },
  {
    title: 'Entregue a carga',
    detail: 'Deixe o trem circular: ele carrega e entrega sozinho ao parar nas estações.',
    reward: 1200,
    xp: 400,
    progress: (p) => Math.min(1, p.contractsCompleted),
  },
  {
    title: 'Levante uma vila',
    detail: 'Construa 3 casas ou serviços perto da linha para valorizar a rede.',
    reward: 700,
    xp: 220,
    progress: (p) => p.buildingsPlaced / 3,
  },
  {
    title: 'Cruze o desfiladeiro',
    detail: 'Estenda a linha sobre o rio — a ponte de cavalete nasce sozinha — e ligue Copper Creek.',
    reward: 2500,
    xp: 900,
    progress: (p) => (p.connectedTowns.includes('copper') ? 1 : 0),
  },
];

export class ObjectiveTracker {
  index = 0;

  get current(): ObjectiveDef | null {
    return OBJECTIVES[this.index] ?? null;
  }

  /** Avança se o objetivo atual foi cumprido; devolve o objetivo concluído. */
  check(progress: ObjectiveProgress): ObjectiveDef | null {
    const current = this.current;
    if (!current) return null;
    if (current.progress(progress) >= 1) {
      this.index++;
      return current;
    }
    return null;
  }

  fraction(progress: ObjectiveProgress): number {
    const current = this.current;
    if (!current) return 1;
    return Math.max(0, Math.min(1, current.progress(progress)));
  }
}
