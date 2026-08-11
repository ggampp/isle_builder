# Sprint 08 — Refit visual: água, costa, terreno e props de verdade

- **Status:** Em andamento
- **Duração sugerida:** 1–2 semanas
- **Dependências:** Sprints 01–07 (o jogo jogável já existe; este sprint é só de fidelidade visual)
- **Referências:** diagnóstico de design 2026-07-02 (registrado abaixo); `assets/status/image copy.png` (estado atual) vs. `assets/status/jogo_exemplo.png` (frame de `game_video.mp4`, alvo); `assets/ART_PLAN.md`

## Objetivo

Fechar a distância visual entre o estado atual (terreno/água chapados e
serrilhados, arte de props/entidades quebrada) e o vídeo de referência
(água viva com espuma, costa orgânica suave, terreno com textura/variação,
props densos e variados). Este sprint é **só de fidelidade visual** — nenhuma
mecânica nova.

## Entregável

Build com: oceano com textura/gradiente de profundidade e espuma na costa;
autotiler produzindo bordas suaves em vez de dentes triangulares; tiles de
sand/grass/path/bridge/cliff com grão e variação orgânica de cor; atlas de
props e entidades com sprites isolados corretos (sem cenas coladas, sem
marca d'água); densidade/variedade de props no nível da referência.

## Escopo

**Dentro:**
- Shader/textura do oceano, suavização de costa + espuma, textura de tiles
  de terreno, correção ou regeneração dos atlases de props/entidades,
  densidade/variedade de scatter de props.
- Ilha inicial: o jogo deve abrir com uma ilha já pintada (parte grama, parte
  só areia), nunca em oceano vazio (pedido do usuário 2026-07-02, adicionado
  ao escopo original).
- Câmera: `MAX_ZOOM` capado de 8 → 4 em `src/core/camera.ts` (aprovado pelo
  usuário 2026-07-02): 4x = tile de 16 world units em 64px de tela = 1:1 com
  a célula de 64px do atlas; acima disso o `NearestFilter` só amplia texels
  ("pixels gigantes"). Enquadramento inicial mantido (ilha seed centrada em
  (0,0), câmera nasce em (0,0) com zoom 1 ≈ mesma fração de tela da
  referência — medido: ~52–57% da altura nos dois).

**Fora:**
- Qualquer sistema novo de gameplay (fica para Sprint 09/10).
- UI icons (`src/ui/uiIcons.ts` → `public/assets/ui/icons/*.png`) — já foram
  gerados corretamente e parecem consistentes; não fazem parte do problema
  diagnosticado aqui. Reavaliar só se o QA visual (última tarefa) encontrar
  algo.

## Diagnóstico (não redescobrir — já investigado em 2026-07-02)

Três problemas distintos, raiz técnica confirmada lendo o código, não só
comparando screenshots:

1. **Regressão ativa nos atlases gerados.** `public/assets/atlas/props-atlas.png`
   e `entity-atlas.png` (gerados via MuAPI/Gemini pelo pipeline em `scripts/`)
   não contêm sprites isolados — cada célula é uma cena inteira de ilha em
   miniatura, algumas com marca d'água "STARDEW VALLEY". O próprio
   `assets/ART_PLAN.md` §7 já diagnosticou a causa: a IA funde vários itens
   numa única bounding box no recorte em lote.
   `loadPropsAtlasFromImage` (`src/render/art/propsAtlas.ts:323`) carrega esse
   PNG **com sucesso** (é um arquivo válido) e por isso **não aciona o
   fallback procedural** — o jogo desenha o conteúdo quebrado direto. É por
   isso que há confetes/artefatos ao redor da costa no screenshot atual: é a
   arte gerada errada, não o placeholder procedural (que era mais limpo).
2. **Terreno e oceano nunca saíram do procedural.** `src/render/Ocean.ts` é um
   shader que mistura duas cores sólidas com um termo `stripe` — daí o padrão
   de listras diagonais escuras, sem textura de água real, sem espuma.
   `src/render/art/terrainAtlas.ts` desenha sand/grass/etc. como preenchimento
   de canvas por quadrante, sem grão nem variação orgânica. A Fase D do
   `ART_PLAN.md` (arte de terreno) nunca foi executada.
3. **Densidade/variedade de props abaixo da referência.** Mesmo ignorando o
   atlas quebrado, `src/props/propplacement.ts` espalha poucos itens
   espaçados; a referência tem aglomerados densos com variação de
   escala/rotação e sombra.

## Tarefas

### 0 — Ilha inicial
- [x] `src/world/seedIsland.ts`: stampa uma ilha orgânica (raio com wobble,
  não círculo perfeito) centrada em (0,0) via `tilemap.paintLayer` direto —
  bypassa `HistoryManager` de propósito (é estado inicial, não ação do
  jogador, então não deve ser desfazível). Lado oeste só areia, lado leste
  areia+grama com faixa de praia entre grama e água. Chamado em `main.ts`
  logo após `history.chainPropCallback(...)` (callbacks de coast/censo já
  encadeados nesse ponto).
- [x] Verificado no browser: ilha aparece centrada no boot, `FPS: 60`, sem
  erros de console.

### 1 — Parar a sangria (props/entidades)
- [x] Revertido `main.ts` para usar `buildPropsAtlas()`/`buildEntityAtlas()`
  (procedural) em vez de `loadPropsAtlasFromImage`/`loadEntityAtlasFromImage`
  — confirmado visualmente no browser: os artefatos tipo confete ao redor da
  costa desapareceram.
- [ ] Coordenar com o pipeline de geração (`scripts/generate_image_muapi.mjs`,
  `run_pipeline.mjs`) para gerar **um sprite isolado por vez** (a "Via
  Automatizada Unitária" já recomendada em `ART_PLAN.md` §7), evitando o
  problema de fusão de bounding box do lote.
- [ ] Script de validação: antes de aceitar um novo atlas gerado, checar
  automaticamente que cada célula tem fundo transparente nas bordas e não
  contém texto/marca d'água (heurística simples: % de pixels não-transparentes
  na borda da célula).

### 2 — Água
- [x] `Ocean.ts`: `uColorBase`/`uColorDeep` trocados de navy quase-preto
  (`#1c5c93`/`#0d2b4a`) para turquesa claro (`#4fb8c9`/`#1f7a95`), afinado para
  casar com o anel de água rasa do `CoastRenderer` (`#4ecdc4`/`#2a9d8f`) em vez
  de contrastar bruscamente com ele. Termo `stripe` (glint diagonal)
  suavizado — era um artefato bem visível, virou um brilho bem mais sutil.
- [x] Espuma já existia (`CoastRenderer`/`FOAM_FRAGMENT`, `foamEnabled = true`
  por padrão) — não precisou ser criada, só o oceano de fundo estava feio
  perto dela.

### 3 — Costa e terreno
- [x] `world/render/art/terrainAtlas.ts` — `drawQuadrant` reescrito: o corte
  diagonal reto que ia até o **centro do tile** (causa raiz do serrilhado tipo
  "dente de tubarão") virou um recorte arredondado (aproximação bezier de
  arco de círculo) e raso, preservando a maior parte do quadrante preenchida.
- [x] Grão de sand/grass (`applySandTexture`/`applyGrassTexture`) reduzido
  (~60% menos frequência/intensidade) — causa real: o grão é gerado **uma vez
  por célula do atlas compartilhado**, então tiles com a mesma máscara (a
  maioria de uma ilha) repetem exatamente o mesmo padrão, virando um
  "papel de parede" mecânico em vez de grão orgânico. Reduzir a intensidade
  ajuda mas não resolve a repetição de raiz — ver risco novo abaixo.
- [x] `minFilter`/`generateMipmaps` do atlas de terreno trocados de
  `NearestFilter`/`false` para `LinearMipmapLinearFilter`/`true` — a
  minificação de 64px (célula) → ~16px (tile em zoom padrão) sem mipmap
  gerava aliasing (Moiré) por cima da repetição já mencionada.
- [ ] **CONFIRMADO 2026-07-02 (2ª sessão): o padrão de pontos é REAL, não é
  artefato JPEG.** Evidência: (a) os pontos **escalam com o zoom do jogo**
  (zoom sintético via `WheelEvent` até 4x — pontos viram círculos grandes,
  um furo por vértice de 4 tiles, cor do oceano visível através de TODAS as
  camadas de terreno); (b) inspeção pixel a pixel do atlas real, importando
  o módulo direto na página (`await import('/src/render/art/terrainAtlas.ts')`
  no dev server Vite — técnica que driblou o problema de `document.hidden`):
  célula do mask **255** (interior, 8 vizinhos) = 0% transparente (correta,
  sólida); célula do mask **15** (4 arestas, zero bits de canto) = 13,1%
  transparente com os 4 cantos recortados — **a única célula com exatamente
  4 recortes de canto, e é exatamente o desenho dos furos renderizados**.
  Conclusão: tiles interiores estão sendo desenhados com a célula do mask 15
  em vez da 255. Suspeito nº 1: mapeamento de linha do atlas (v/`flipY`) em
  `buildLayerGeometry` (`src/render/chunkmesh.ts`) — trocar linha 15 ↔ linha
  0 mapeia 255→15 com a mesma coluna, o que bate perfeitamente. Ver seção
  "Próximos passos" do handoff `AIMemory/handoffs/2026-07-02-sprint-08-task4-diagnostico-dots.md`
  para o passo de verificação decisivo antes de aplicar o fix.

### 4 — Props (implementado 2026-07-02, 2ª sessão)
- [x] **Sprites com proporção correta e maiores**: `propWorldSize`
  (`src/render/art/propSpriteUtils.ts`) reescrito — as células do atlas são
  quadradas (48px), mas os quads eram retangulares por categoria, espremendo
  a arte (árvores viravam "palitos" de 16×48). Agora todos os quads são
  quadrados: vegetação 44×44 (copa ~2 tiles, como na referência), decor
  24×24, utility ≥20, building = footprint. Footprint de colisão inalterado.
- [x] **Variação visual por prop**: `PlacedProp` ganhou `scale?` (0.85–1.2) e
  `flip?` (espelhamento horizontal; material virou `DoubleSide` para o quad
  espelhado não sumir). Aplicado só a vegetação/decor — construções ficam
  uniformes. Persistem no undo/redo de graça (viajam dentro do objeto).
- [x] **Ilha seed populada**: `seedStarterProps` (`src/world/seedIsland.ts`)
  — RNG determinístico (mulberry32, mesma ilha todo boot), ~11% árvores +
  ~14% flora pequena por tile de grama, ~5% scatter por tile de areia
  (palmeiras/conchas/rochas), tabelas ponderadas, valida com `canPlaceProp`,
  bypassa histórico (mesma razão do terreno seed). Ligado em `main.ts`.
- [x] **Scatter em aglomerados**: `propplacement.ts` — cada passo de scatter
  coloca 1–2 vizinhos extras com jitter ±2 tiles, com variação de escala/flip.
- [x] Sombra sob props estáticos: já existia para todos (PropRenderer desenha
  shadow mesh sempre); corrigida para escalar com a largura **visual** do
  sprite (antes usava o footprint e virava um risco minúsculo sob a copa).
- [x] Verificado no browser: ilha nasce "viva" (floresta + praia decorada),
  FPS 60 no boot, zero erros de console, build + 52 testes verdes.
- [ ] Reavaliar densidade/mix contra a referência **depois** que o bug dos
  furos de canto (Task 3) for corrigido — os furos dominam a leitura visual
  hoje e impedem comparação justa.

### 5 — QA visual
- [ ] Comparar screenshot lado a lado com `assets/status/jogo_exemplo.png` em
  pelo menos 2 níveis de zoom.
- [ ] `npm run build` + `npm run test` verdes; nenhuma regressão de FPS (medir
  com `threejs-debug-profiler` no mesmo cenário de estresse do Sprint 06).

## Critérios de aceite

1. Nenhum artefato de "cena colada"/marca d'água visível em nenhum prop ou
   entidade renderizado.
2. Água apresenta gradiente de profundidade + espuma visível na costa, sem o
   padrão de listra diagonal atual.
3. Costa não exibe mais serrilhado triangular grosseiro em nenhum ângulo de
   zoom testado.
4. Sand/grass/path/bridge/cliff têm variação de textura visível (não é mais
   um preenchimento chapado uniforme).
5. Densidade de props numa ilha de teste padrão se aproxima visualmente do
   frame de referência (julgamento por comparação lado a lado, não métrica
   numérica).
6. FPS do cenário de estresse do Sprint 06 (200 aldeões + 150 peixes + fauna +
   navios) não regride.
7. **[Cumprido]** Um novo carregamento do jogo (sem nenhuma ação do jogador)
   já mostra uma ilha com parte de grama e parte só de areia — nunca oceano
   vazio.

## Riscos

- **Dependência do outro agente de geração de imagem**: os itens 1 e 3 (Fase
  D de terreno) dependem de arte nova sendo gerada corretamente desta vez.
  Se a geração unitária não resolver o problema de recorte a tempo, manter o
  fallback procedural melhorado (grão/variação) como saída aceitável — não
  bloquear o sprint esperando arte perfeita.
- **Regressão de performance**: textura de água mais complexa e grão extra no
  terreno podem custar mais draw calls/fill rate — perfilar cedo, não só no
  fim (mesma lição do Sprint 06).
- **Risco de re-open de escopo**: não redesenhar mecânica de jogo aqui — se
  surgir vontade de mudar UI/ferramentas durante o refit visual, registrar
  como item futuro, não expandir este sprint.
- **Grão de terreno preso ao atlas compartilhado, não à posição no mundo**:
  `applySandTexture`/`applyGrassTexture` geram ruído por célula do atlas
  (256 variantes de máscara), não por tile do mundo — todo tile que usa a
  mesma máscara (a maioria de uma área interior grande) repete o **mesmo**
  padrão de grão pixel a pixel. Reduzir a intensidade (feito) disfarça mas não
  resolve; uma correção de raiz exigiria variação por posição no mundo (ex.:
  múltiplas variantes de cada máscara escolhidas por hash da posição do tile,
  ou mover o grão para um shader que amostra em espaço de mundo) — escopo
  maior, não assumido nesta rodada.
- **Screenshot JPEG do `computer` tool pode mentir sobre textura fina**: já
  documentado em `CLAUDE.md` § Known gotchas — áreas de cor quase-chapada
  podem mostrar um "dot pattern" que é artefato de compressão, não o
  render real. Confirmar qualquer ajuste fino de grão/textura (não geometria
  grande como forma da costa) olhando o app rodando de verdade, não só a
  screenshot automatizada.

## Notas de contexto

Motivação: usuário comparou o estado atual (`assets/status/image copy.png`)
com um frame do vídeo de referência (`assets/status/jogo_exemplo.png`) e
apontou que o jogo está "muito pixelado" em relação ao alvo. Investigação
encontrou 3 causas técnicas concretas (não é só "falta mais arte") — ver
diagnóstico acima. Esta sprint foi inserida **antes** das sprints de
persistência e progressão (que foram renumeradas de 08→09 e 09→10) porque a
fidelidade visual é considerada bloqueante antes de investir em save/load e
progressão sobre uma base visual que ainda vai mudar bastante.

## Atualizacao 2026-07-02 - fix dos furos do terreno

- [x] `src/render/chunkmesh.ts` agora usa as constantes do atlas real (`TERRAIN_ATLAS_COLS/ROWS`) e inverte a linha V para compensar `CanvasTexture.flipY`. Isso corrige a causa isolada no handoff: tiles interiores com mask 255 estavam amostrando a linha da mask 15, criando um furo em cada vertice de 4 tiles.
- [x] Adicionado `src/render/chunkmesh.test.ts`, cobrindo os ranges de UV para mask 0 e mask 255.
- [x] `npm run test` (53) e `npm run build` verdes.
- [ ] Checagem visual side-by-side ainda pendente em navegador normal: `agent-browser` falhou neste ambiente com `CDP response channel closed`.
