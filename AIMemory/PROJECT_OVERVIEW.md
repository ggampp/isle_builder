# Visão Geral do Projeto

## O que é este projeto

Recriação do jogo **Isle Builder**: um sandbox relaxante de construção de ilhas,
2D top-down, em pixel art estilo Stardew Valley, rodando no navegador. O jogador
pinta terreno (água/areia/grama/trilha/ponte) com auto-tiling automático para
esculpir ilhas em um oceano vivo, decora com um catálogo de props e observa uma
simulação ambiente: aldeões que vagam e atravessam pontes, cardumes de peixes
(boids), baleias, tubarões e navios autônomos. A referência canônica é o vídeo
`game_video.mp4` (1m50s, 4K@60fps) na raiz do projeto; a análise completa do
vídeo e o plano de construção em 8 fases estão em `GAME_PLAN.md`.

Estado atual (2026-07-02): **Sprints 01–06 concluídas e validadas** (ver
`sprints/ANDAMENTO.md`). Projeto Vite + TS + Three.js com loop de jogo, câmera
ortográfica, oceano animado, tilemap multicamada, ferramentas com undo/redo,
costa procedural, **53 props colocáveis** (abas Land/Decor/Props), atlas de
terreno/props e **simulação viva** (aldeões, cardumes, fauna marinha, navios +
botão pausa). Sprints 04-06 foram auditadas independentemente após a
implementação (por outro agente); 3 bugs reais foram encontrados e corrigidos
nessa auditoria — ver `handoffs/2026-07-02-validacao-sprints-04-06.md` e as
armadilhas abaixo (convenção de eixo Y, `renderOrder` sem teto, e o padrão de
testar empiricamente critérios "nunca"/"sempre" de movimento de agentes em vez
de confiar em steering suave). Próximo passo: Sprint 07 (UI premium).

## Build / test / lint

```bash
npm install       # instalar dependências (three + vite + typescript)
npm run dev       # servidor de desenvolvimento (Vite, HMR)
npm run build     # tsc --noEmit (via build) + build de produção em dist/
npm run preview   # servir o build de produção localmente
npm run test      # Vitest (testes em world/, tools/ e entities/ — 49 no total)
npx tsc --noEmit  # só type-check, sem gerar build
```

## Convenções

- Documentação do projeto e mensagens ao usuário em **português (pt-BR)**;
  código, identificadores e comentários em inglês.
- Plano de fases com critérios de aceite em `GAME_PLAN.md` — executar em ordem
  (0 a 7) e validar o critério de aceite antes de avançar de fase.
- Orquestração da construção via skills `threejs-*` do Claude Code:
  `threejs-game-director` (entrada principal), `threejs-image-generator`
  (tilesets/sprites), `threejs-gameplay-systems`, `threejs-game-ui-designer`,
  `threejs-audio-generator`, `threejs-qa-release`, `threejs-debug-profiler`.
- Arquitetura alvo: `src/{core,world,tools,entities,props,ui,persistence,render}`
  (detalhada em `GAME_PLAN.md` §4).

## Regras rígidas

- **Nunca commitar `game_video.mp4`** (~130 MB) — adicionar ao `.gitignore` ao
  inicializar o repositório (ou usar Git LFS se o vídeo precisar ser versionado).
- Git sempre com a conta pessoal do usuário, configurada **apenas no repositório
  local** (nunca `git config --global`): `user.name "Guilherme Pimentel"`,
  `user.email "ggampp@gmail.com"`; remote SSH `git@github-pessoal:ggampp/<repo>.git`.
- Nunca fazer `git push` sem confirmação explícita do usuário.
- Não commitar chaves, tokens, cookies ou dados de sessão.
- Em `AIMemory/work.log`: apenas append; nunca editar ou apagar entradas passadas.

## Armadilhas conhecidas

- **`npm create vite@latest <caminho absoluto Windows>` quebra** neste ambiente:
  o `create-vite` mangla o caminho (remove `:` e `\`) e escreve relativo ao cwd
  errado. Sempre `cd` para o diretório alvo primeiro e rodar com `.` como
  argumento (via PowerShell, não Bash — Bash usa paths posix que também confundem
  o resolvedor). Se precisar escaffoldar de novo em outro lugar, use esse padrão.
- Template atual do Vite (vanilla-ts) ativa `erasableSyntaxOnly` no `tsconfig.json`:
  **parameter properties em construtores não são permitidas**
  (`constructor(private readonly x: Foo)` falha com TS1294). Declarar o campo e
  atribuir no corpo do construtor manualmente.
- O jogo de referência é **2D com tiles**, mas a stack escolhida é Three.js com
  câmera ortográfica (para aproveitar o pipeline de skills) — não introduzir
  câmera perspectiva/3D por engano.
- O ambiente de automação do navegador (`claude-in-chrome`) não simula clique do
  botão do meio nem tecla segurada durante arrasto — validar pan/zoom via
  `PointerEvent`/`WheelEvent` sintéticos com `javascript_tool` é o padrão
  equivalente adotado na Sprint 01; reconfirmar manualmente com mouse real
  quando possível.
- **A aba controlada pelo `claude-in-chrome` frequentemente fica com
  `document.hidden = true`** neste ambiente (mesmo com foco/clique), o que faz
  o Chrome suspender `requestAnimationFrame`. Qualquer lógica *poll-based*
  ligada ao game loop (ex.: pintura por pincel) não avança enquanto isso, e
  disparar eventos sintéticos síncronos (pointerdown→pointerup sem ceder tempo
  real) nunca funciona. Para verificar lógica ligada ao loop: (a) manipule o
  estado/sistemas diretamente (chamando os métodos do módulo) e meça com
  `performance.now()`, sem depender de rAF; (b) para conferir o render, use
  `gl.readPixels()` após forçar `renderer.render(...)` manualmente, em vez de
  confiar em screenshots — **screenshots do `computer` tool são JPEG e podem
  mostrar um falso padrão de "pontos"/moiré em áreas de cor sólida grande**
  (artefato de compressão, não bug de render). Cliques reais (`computer` tool)
  em elementos de UI comuns (botões, sliders) funcionam normalmente, já que não
  dependem de rAF — só a simulação de "segurar botão do mouse" é afetada.
- **Evitar `const enum`** em qualquer tipo que atravesse arquivos — não
  funciona de forma confiável sob `isolatedModules`/esbuild (usado pelo Vite).
  Usar objetos `as const` (ex.: `world/layers.ts`, `world/autotiler.ts`).
- **`npm run test` (Vitest) passar não significa que `npm run build` passa.**
  O Vitest não aplica `noUnusedLocals`/`noUnusedParameters` do `tsconfig.json`
  — só o `tsc` do script de build faz essa checagem. Já aconteceu de um
  arquivo de teste com imports não usados quebrar o build silenciosamente
  enquanto os testes continuavam verdes (ver `handoffs/2026-07-02-sprint-03-validacao.md`).
  **Sempre rodar `npm run build` antes de declarar uma sprint concluída**,
  não só `npm run test`.
- **Three.js ordena objetos transparentes por `renderOrder` antes de
  distância/Z** (`WebGLRenderList.painterSortStable`). Definir só a posição Z
  de um mesh (achando que "mais perto da câmera" = "desenha por cima") não
  basta se outro mesh no mesmo local tiver `renderOrder` maior — o
  `renderOrder` sempre vence o desempate por distância. Cadeia atual (a
  respeitar ao adicionar novo mesh transparente): coast(0.3) <
  bridge-shadow(0.8) < sand(1) < grass(2) < path(3) < bridge(4) < cliff(5) <
  terrain-preview(6) < props(10–11.9, faixa fixa) < entidades(11.5–12) <
  prop-preview(20).
- Lógica de ferramentas/histórico/simulação (`Tilemap`, `HistoryManager`,
  `BucketTool`, `EntityManager`, `CoastManager` etc.) **não depende de
  DOM/Three.js** — para validar esse tipo de lógica (incl. critérios de
  aceite tipo "N strokes + undo + redo reproduz o mapa" ou "200 agentes a
  60fps"), prefira um script standalone (`npx vite-node arquivo.mjs` de dentro
  da raiz do projeto, para os imports relativos resolverem) em vez de lutar
  com o Chrome automatizado — mais rápido e imune à instabilidade de
  `document.hidden`. Só o que realmente TOCA canvas/DOM (ex.: `entityAtlas.ts`
  usa `document.createElement('canvas')` para o atlas) precisa do navegador —
  nesse caso, execução síncrona via `javascript_tool` (não `requestAnimationFrame`)
  ainda funciona por não depender de rAF.
- **Convenção de eixo confirmada empiricamente** (não só por leitura de
  código): mundo **+Y = Norte = topo da tela**, `-Y` = Sul = base da
  tela/mais perto da câmera (verificado renderizando dois quads coloridos em
  posições opostas e comparando com um screenshot). Qualquer lógica de
  profundidade/y-sort nova deve lembrar que "mais ao sul" (Y menor) = "mais
  perto da câmera" = deve desenhar por cima.
- **Nunca usar um contador `renderOrder` incremental sem teto** quando o
  número de objetos pode variar (ex.: um `renderOrder` por prop colocada) —
  ele cresce sem limite e pode ultrapassar o `renderOrder` fixo de outro
  sistema (entidades, previews) assim que houver itens suficientes. Normalizar
  para uma faixa fixa (ex.: `10 + (i / (total-1)) * 1.9`) preservando a ordem
  relativa, não a contagem absoluta. Achado real: com só 17 props, um contador
  `10, 11, 12...` chegava a 27, acima do `renderOrder=12` das entidades e do
  `renderOrder=20` do preview de props.
- **Critérios de aceite com "nunca"/"sempre" sobre movimento de agentes
  (ex.: "navios nunca cruzam terra") não são garantidos por steering suave**
  (uma força de repulsão somada à velocidade) — isso só reduz a frequência,
  não elimina o caso. A forma correta é validar a posição seguinte ANTES de
  commitar o movimento (só avança se o tile de destino for válido; senão, gira
  e tenta de novo no próximo tick) — o padrão que `EntityManager.updateVillager`
  já usava. Para verificar esse tipo de critério, um teste de poucos segundos
  não basta: rode uma simulação de estresse de vários minutos numa costa
  irregular (pior caso) contando violações reais tile a tile — um bug real foi
  encontrado assim (~360 violações em 2 min simulados) que não aparecia em
  simulações curtas.
- O auto-tiling é **multicamada** (grama sobre areia sobre água, cada transição
  com borda própria) — um auto-tiler de camada única não reproduz o visual do
  vídeo. Prototipar na Fase 1 antes de gerar arte final.
- Performance é requisito visível no vídeo (60fps em 4K com centenas de agentes):
  usar instancing/batching e LOD de animação desde cedo, não como otimização tardia.
- Para re-inspecionar o vídeo, extrair frames com ffmpeg (instalado via chocolatey)
  para o scratchpad da sessão e ler os JPGs:
  `ffmpeg -i game_video.mp4 -vf "fps=0.5,scale=1280:-1" frames/frame_%03d.jpg`.
