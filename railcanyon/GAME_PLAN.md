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

| Fase | Entregável | Estado |
|------|-----------|--------|
| **S01 — Fatia vertical** | Cena viva a 60fps: terreno mesa+canyon flat-shaded com rio, scatter instanciado, linha em spline, trem com fumaça, câmera WASD/drag/turn/zoom, shell da UI e minimapa | ✅ concluída |
| **S02 — Assentamento de trilhos** | Railhead pulsante, ghost verde/vermelho, 5 tipos de peça com custo, validação de rampa e limites, desfazer com reembolso de 70%, ponte de cavalete automática sobre o rio | ✅ concluída |
| **S03 — Trem operacional** | Estações nas cidades conectadas, paradas com embarque, lenha consumida e reabastecida, condição caindo com o uso + reparo pago, vagões compráveis, reversão no fim da linha | ✅ concluída |
| **S04 — Construções** | 9 construções procedurais com preço, ghost no cursor, rotação `[` `]`, validação de encosta/água/sobreposição/faixa da linha, bônus reais (carga, lenha, desgaste, renda) | ✅ concluída |
| **S05 — Economia e objetivos** | Moedas/pontos/XP/níveis, contratos com timer, recompensa e expiração, 6 objetivos-tutorial encadeados, painéis Trens/Rede/Contratos/Loja, save/load em `localStorage` | ✅ concluída |
| **S06 — Polimento e release** | Bosques de pinheiros; pedras que bloqueiam a obra e a dinamite que as remove (ou desmonta construções); desvios ancorados na linha existente com locomotiva própria; áudio sintetizado (bufado, apito, estouro, vento); deploy dos dois jogos no GitHub Pages | ✅ concluída |

### O laço de jogo hoje

Escolher uma peça → o ghost aparece na ponta brilhante da linha → clicar (ou Espaço)
assenta e cobra as moedas → pedras no caminho barram a obra até serem dinamitadas →
ao chegar a 26 m de uma cidade ela conecta, vira parada do trem e libera contratos →
o trem circula sozinho, para nas estações, reabastece, carrega e entrega → contratos
concluídos pagam moedas/pontos/XP → o nível sobe e libera contratos maiores → moedas
viram trilhos, construções, desvios e novas locomotivas. Sem derrota: sem lenha o trem
apenas desacelera, e contratos expirados só somem.

### Controles

WASD move · arrastar move · botão direito gira · roda aproxima · clique assenta ·
Espaço repete a peça · Z desfaz · L troca a linha ativa · `[` `]` giram a construção ·
Esc cancela a seleção.

### Publicação

`.github/workflows/deploy.yml` publica os dois jogos do repositório no GitHub Pages a
cada push na `main` — Isle Builder na raiz e Canyon Rails em `/canyon-rails/`. Exige
Pages habilitado em *Settings → Pages → Source: GitHub Actions*.

## 3. Arquitetura (espelha o padrão do Isle Builder)

Vite + TypeScript + Three.js (`WebGLRenderer`, **câmera perspectiva** — diferente
do Isle Builder ortográfico), Vitest para lógica pura.

- `src/core/` — `loop.ts` (rAF com delta clampado), `camera.ts` (rig orbital:
  alvo no chão, yaw por right-drag, pan WASD/left-drag no plano, dolly por wheel),
  `input.ts` (estado cru de pointer/teclado/wheel; distingue clique de arrasto).
- `src/world/` — `heightfield.ts` (altura determinística: mesa + rio cavado +
  buttes + platôs das cidades; puro, testável), `terrain.ts` (malha flat-shaded
  com cor por face), `scatter.ts` (InstancedMesh de pedras/cactos/arbustos),
  `towns.ts` (3 cidades com layout de casas e placas), `buildings.ts` (9 modelos
  procedurais + material de ghost), `raycast.ts` (interseção analítica do cursor
  com a heightfield, sem tocar na malha).
- `src/rail/` — `geometry.ts` (poses puras das peças: reta e 4 curvas),
  `network.ts` (linha construída: railhead, validação, caminho amostrado por
  arc-length com folga de ponte e suavização), `trackview.ts` (dormentes/trilhos
  instanciados, cavaletes, ghost da peça, anel do railhead), `train.ts` (posição
  sempre função de `s`; paradas, lenha, condição, carga, fumaça).
- `src/game/` — `game.ts` (orquestra tudo), `economy.ts`, `contracts.ts`,
  `objectives.ts`, `save.ts` (`localStorage` validado ao ler).
- `src/ui/` — `hud.ts` (DOM overlay reativo: topbar, cards, painéis, nav, toasts),
  `minimap.ts` (canvas 2D: terreno + cidades + linha + trem), `styles.css`.

Regras herdadas do repo-mãe (ver `CLAUDE.md` na raiz): sem parameter properties
(TS1294/`erasableSyntaxOnly`), sem `const enum`, `npm run build` (gate `tsc`) antes
de declarar sprint concluída, validação de movimento "nunca sai do trilho" por
construção (posição é função do arc-length, não integração livre).
