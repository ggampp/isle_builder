# Canyon Rails — plano do jogo

> Recriação original, para browser, do jogo de ferrovias mostrado no vídeo do post
> https://x.com/DilumSanjaya/status/2086858760753201622 (baixado como `game_video.mp4`
> na raiz do repositório, gitignored — 1m04s, 3024×1714@60fps). Mesmo processo usado
> no Isle Builder (raiz deste repo): análise do vídeo → plano em fases → sprints.
> Código e arte 100% originais/procedurais; o nome "Canyon Rails" é próprio.

## 1. O que o vídeo mostra

**Cenário.** Uma mesa desértica low-poly (flat-shaded) vista de câmera perspectiva
inclinada, cercada por um rio turquesa que corre num canyon de paredes vermelhas.
Paleta: areia `#e8a66c`, rocha laranja `#d97e4a`, rocha vermelha `#c05038`,
água `#5fd3c8`, vegetação verde-cacto `#3f9b4f`. Espalhados pelo terreno: pedras
vermelhas facetadas, cactos, arbustos/flores pequenas, pinheiros em áreas de
"floresta", morros-testemunha (buttes) nas bordas.

**Ferrovia.** O jogador assenta trilhos peça a peça: seleciona um tipo de peça no
painel Build (reta 15 m/50 coins, curvas suave/fechada), clica num *railhead*
brilhante na ponta da linha e um *ghost* verde translúcido mostra onde a peça
cairá; Espaço/clique confirma. Trilhos cruzam o rio sobre pontes de cavalete
(trestle) de madeira. Um trem ("Workhorse 1915": locomotiva azul + 4 vagões)
percorre a linha soltando fumaça, com painel próprio: Speed (45 mph), Logs 0–56
(combustível), Condition % (cai com o uso; botão Repair), Wagons (botão +Wagon
1.250), rota "Pine Hollow — Canyon Town" e status ("Running to Canyon Town",
"End of the line — lay track, then Space").

**Construções.** Painel Build com ~12 itens e preço em moedas: marcador de estação,
peças de trilho, casas (120/450), cabana de madeira (220), torre d'água (300,
rotaciona com `[` `]`), moinho de vento (380/90), armazém (180), poste de luz (60)
e uma bomba ("Blast rockfalls and boulders") para limpar pedras/desmoronamentos.
Toasts confirmam ("Water tower built", "Storage shed built"). Cidades têm chip de
nome flutuante ("Canyon Town").

**Economia e progressão.** Topo: Coins, Score, Level com barra de XP (750/900 →
1.475). Card Objective no canto: tutorial ("Lay a siding", 3/4, recompensa 400) e
contratos com timer ("Deliver 54 Stone to Copper Creek", 3:07, recompensa 1.750).
Rodapé: botões Trains, Network, Contracts, Shop. Canto inferior direito: minimapa
com o rio, nós (cidades) e arestas da rede ferroviária, zoom ±.

**Câmera/controles** (chip de dica no rodapé): WASD pan · drag · right-drag turn ·
wheel zoom. Botões topo-direito: tema/sol, ajuda, save, menu.

## 2. Fases de construção

| Fase | Entregável | Conteúdo |
|------|-----------|----------|
| **S01 — Fatia vertical** *(esta sessão)* | Cena viva a 60fps | Terreno mesa+canyon procedural flat-shaded com rio; scatter instanciado (pedras/cactos/arbustos); loop de trilhos em spline com dormentes+trilhos gerados; trem (loco+vagões) seguindo a curva por arc-length com fumaça; câmera WASD/drag-pan/right-drag-turn/wheel-zoom; shell da UI (topbar, Objective, Build, painel do trem, nav inferior, minimapa real do terreno+linha+trem, chip de dica); testes de terreno/track |
| S02 — Assentamento de trilhos | Construir a linha | Railhead brilhante, ghost verde válido/inválido, peças reta/curvas, custo em moedas, undo, ponte trestle automática sobre o rio |
| S03 — Trem operacional | Rota e recursos | Estações/paradas, combustível (Logs) consumido, Condition caindo + Repair, +Wagon, velocidade variável, física de aceleração |
| S04 — Construções | Cidades vivas | Catálogo Build completo, rotação `[` `]`, bomba para pedras, chips de nome, toasts |
| S05 — Economia | Jogo com objetivos | Coins/Score/XP/Level, contratos com timer e recompensa, tutorial de objetivos, Shop/Contracts/Network/Trains funcionais |
| S06 — Polimento e release | Build final | Save/load, áudio, performance, deploy |

## 3. Arquitetura (espelha o padrão do Isle Builder)

Vite + TypeScript + Three.js (`WebGLRenderer`, **câmera perspectiva** — diferente
do Isle Builder ortográfico), Vitest para lógica pura.

- `src/core/` — `loop.ts` (rAF com delta clampado), `camera.ts` (rig orbital:
  alvo no chão, yaw por right-drag, pan WASD/left-drag no plano, dolly por wheel),
  `input.ts` (estado cru de pointer/teclado/wheel).
- `src/world/` — `heightfield.ts` (função de altura determinística: mesa + rio
  cavado + buttes; puro, testável), `terrain.ts` (malha flat-shaded com cores por
  vértice altura/inclinação + plano d'água), `scatter.ts` (InstancedMesh de
  pedras/cactos/arbustos posicionados pela heightfield, fora do rio e da linha).
- `src/rail/` — `track.ts` (spline fechada CatmullRom amostrada por arc-length;
  dormentes/trilhos instanciados; puro o suficiente para testes), `train.ts`
  (composição low-poly da loco+vagões; avanço por arc-length; fumaça por sprites).
- `src/ui/` — `hud.ts` (DOM overlay: topbar, cards, painéis, nav, toasts),
  `minimap.ts` (canvas 2D: terreno da heightfield + polilinha da track + ponto do
  trem), `styles.css`.

Regras herdadas do repo-mãe (ver `CLAUDE.md` na raiz): sem parameter properties
(TS1294/`erasableSyntaxOnly`), sem `const enum`, `npm run build` (gate `tsc`) antes
de declarar sprint concluída, validação de movimento "nunca sai do trilho" por
construção (posição é função do arc-length, não integração livre).
