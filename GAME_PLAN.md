# Isle Builder — Análise do vídeo e Plano de Construção

> Fonte: `game_video.mp4` (1m50s, 4K@60fps, capturado de `localhost:8003`).
> Análise feita a partir de ~70 frames extraídos do vídeo.

## 1. O que é o jogo

**Isle Builder** é um sandbox relaxante de construção de ilhas, 2D top-down, em pixel art
estilo Stardew Valley, rodando no navegador. Não há objetivo/pontuação: o jogador pinta
terreno para esculpir ilhas em um oceano vivo, decora com props e observa uma simulação
ambiente (aldeões, peixes, baleias, navios) reagir ao mundo criado.

## 2. Funcionalidades observadas no vídeo

### 2.1 Mundo e câmera
- Oceano "infinito" com textura de água animada e dois níveis visuais: água profunda
  (azul escuro, listras de correnteza) e água rasa costeira (turquesa clara).
- Zoom contínuo muito amplo: de "ilha é um pontinho" até close-up em que cada prancha
  da ponte e cada coral são visíveis. Pan com ferramenta de mão/arrasto.
- Grid de tiles invisível (~16px lógicos); pintura ocorre por tile.

### 2.2 Pintura de terreno (aba **Land**)
- Terrenos: **Water, Sand, Grass, Dirt Path, Wooden Bridge, Cliff edge**.
- **Auto-tiling multicamada**: grama pintada sobre areia gera borda orgânica irregular;
  areia sobre água gera contorno de praia com espuma; ponte de madeira liga ilhas com
  pranchas + bordas. Tudo automático, sem o jogador escolher variantes.
- **Costa procedural**: ao criar terra, um anel de água rasa com recifes de coral,
  vegetação subaquática e manchas de areia clara aparece automaticamente ao redor.

### 2.3 Ferramentas de construção (toolbar esquerda "BUILD TOOLS")
- Pincel, linha, retângulo, preenchimento/carimbo, borracha, conta-gotas(?), mão (pan),
  gota (água). 8 botões no total.
- Slider **SIZE** (raio do pincel, valores vistos: 1, 1.5, 5) e **SPACE** (espaçamento
  de carimbo, 1.0).
- **Undo / Redo / Clear** no topo central (Clear apaga o mapa inteiro).

### 2.4 Painel direito com abas
- Abas: **Land, Decor, Props, World, Map, Help** (Land e Props aparecem no vídeo).
- **Props**: catálogo grande rolável (~60+ itens): pedras, troncos, lanterna, cercas,
  bote, guarda-sol, espreguiçadeira, caixotes, barris, placa/cavalete, balde, garfo,
  pá, garrafa, saco, varal de luzes, palha, flores, leiteira, banqueta, tina, regador,
  frutas, e **construções**: casas (várias cores), celeiro, loja "SHOP", portas,
  janelas, poço etc.
- Colocação de prop: clique posiciona com sombra e ordenação de profundidade correta
  (villager passa na frente/atrás).

### 2.5 Simulação de agentes (o "vivo" do jogo)
- **Aldeões**: dezenas/centenas spawnam na grama, vagam pela ilha com animação de
  caminhada em 4 direções, respeitam terra (não entram na água) e **atravessam pontes**
  entre ilhas.
- **Vida marinha**: cardumes de peixes (comportamento boid), peixes vermelhos/laranja,
  tubarões, orcas, **baleias azuis** (grandes, com jato d'água), espadarte — nadam com
  rotação suave e ficam na água profunda.
- **Embarcações**: botes a remo e galeões com velas animadas e rastro de espuma,
  navegando de forma autônoma e desviando das ilhas.
- Botão de **pausa** da simulação no topo direito.

### 2.6 UI / sistema
- Logo "Isle BUILDER" com folhinhas (canto sup. esquerdo).
- Topo direito: engrenagem (settings), pausa, e mais 2 botões (toggle de UI — o vídeo
  abre com a UI totalmente oculta — e possivelmente screenshot/tempo).
- Estilo de UI: casual/cartoon, painéis azul-escuros arredondados, chips amarelos de
  seleção, ícones coloridos por aba.

### 2.7 Estética
- Pixel art saturada e alegre, sombras suaves sob entidades e props, flores/conchas/
  estrelas-do-mar espalhadas, árvores (5+ tipos, incluindo macieiras), arbustos, rochas.
- 60fps constantes mesmo em 4K com centenas de agentes.

## 3. Stack recomendada

| Camada | Escolha | Motivo |
|---|---|---|
| Build | Vite + TypeScript | padrão moderno, HMR rápido |
| Render | **Three.js com câmera ortográfica** (sprites/planos instanciados) | WebGL performático e aproveita as skills `threejs-*` disponíveis (director, image-generator p/ tilesets, audio-generator, QA) |
| Assets 2D | `threejs-image-generator` (tilesets/sprites pixel art) + packs CC0 (Kenney) como fallback | consistência visual |
| Áudio | `threejs-audio-generator` (ElevenLabs) | ambiente de oceano, UI, música |
| Persistência | localStorage + export/import JSON | sandbox salvo entre sessões |

Alternativa: PixiJS v8 é igualmente válido para 2D puro, mas fica fora do pipeline de
skills já instalado.

## 4. Arquitetura proposta

```
src/
  core/        loop de jogo, relógio, câmera (zoom/pan suave), input unificado
  world/       TileMap em chunks, camadas de terreno, AutoTiler (bitmask 47-blob),
               CoastGenerator (água rasa + recifes procedurais ao redor da terra)
  tools/       ToolSystem (brush/line/rect/fill/eraser/picker/pan),
               History (undo/redo por diffs de stroke — command pattern)
  entities/    ECS leve: Villager (wander + travessia de ponte), FishSchool (boids),
               Whale/Shark/Orca (wander em água profunda), Boat/Ship (navegação com
               desvio de costa), SpriteAnimator, sombras
  props/       catálogo data-driven (props.json), preview fantasma, y-sort
  ui/          toolbar, painel de abas, sliders, top bar, telas Help/Map/World
  persistence/ save/load/export
  render/      batching/instancing de sprites, culling por câmera,
               shader de água animada (2 profundidades), pipeline pixel-perfect
```

**Decisões-chave:**
- Tilemap em **chunks** (ex.: 32×32 tiles) re-mesh apenas do chunk alterado.
- Terreno como **pilha de camadas com prioridade** (water < sand < grass < path/bridge);
  o auto-tiler resolve transições entre camadas adjacentes.
- Recife/costa: máscara de terra dilatada + ruído → espalha decoração subaquática
  determinística (seed por posição, sobrevive a save/load).
- Agentes com **LOD**: em zoom-out, animação reduzida/agrupada para manter 60fps.
- Undo/redo: cada stroke gera um diff `{pos, antes, depois}[]` — barato e ilimitado.

## 5. Fases de construção

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **0. Setup** | Vite+TS+Three ortho, loop, câmera zoom/pan, oceano animado | 60fps, zoom suave de 0.1x a 8x |
| **1. Tilemap + pintura** | chunks, brush Sand/Grass/Water com auto-tiling, slider SIZE | pintar ilha com bordas corretas em tempo real |
| **2. Ferramentas + histórico** | linha, retângulo, fill, borracha, undo/redo/clear | 50 undos consecutivos sem glitch |
| **3. Costa viva** | água rasa, espuma, recifes procedurais, Dirt Path, Bridge, Cliff | recife aparece/some ao editar terra |
| **4. Props** | catálogo com abas Land/Decor/Props, preview, y-sort, remoção | villager passa atrás/na frente da casa corretamente |
| **5. Agentes** | aldeões (spawn na grama, pontes), boids, baleias, navios | 200 aldeões + 150 peixes + 6 navios a 60fps |
| **6. UI premium** | painéis estilo do vídeo, sliders, pause, hide-UI, Help/Map/World | paridade visual com o vídeo |
| **7. Ship** | save/load, áudio, ajustes de performance, build de produção, QA | build estático servível, sem erros de console |

Ordem de skills na execução: `threejs-game-director` (orquestração) →
`threejs-image-generator` (tileset/sprites) → `threejs-gameplay-systems` →
`threejs-game-ui-designer` → `threejs-audio-generator` → `threejs-qa-release`.

## 6. Riscos e mitigação

- **Performance com centenas de agentes**: instancing obrigatório, LOD de animação,
  culling; medir cedo (Fase 5) com `threejs-debug-profiler`.
- **Auto-tiling multicamada** é o coração visual do jogo — prototipar na Fase 1 com
  as 47 variantes blob antes de gerar arte final.
- **Arte consistente**: gerar todos os sprites com a mesma paleta/resolução de
  referência; validar em zoom máximo e mínimo.
- **Água**: shader simples de scroll + ruído resolve; evitar pós-processamento pesado.
