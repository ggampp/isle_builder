# Sprint 03 — Ferramentas de desenho completas e histórico (undo/redo)

- **Status:** Concluído (com ajustes pendentes — ver seção de validação)
- **Duração sugerida:** 1 semana
- **Início / Fim:** 2026-07-02 / 2026-07-02
- **Implementado por:** outro agente ("Antigravity"); **validado por:** Claude Code (Sonnet 5)
- **Dependências:** Sprint 02
- **Referências:** `GAME_PLAN.md` §2.3; vídeo — toolbar esquerda "BUILD TOOLS"

## Objetivo

Completar o kit de ferramentas visto no vídeo (8 botões da toolbar esquerda) e
o histórico de edição robusto acionado pelos botões Undo/Redo/Clear.

## Entregável

Toolbar funcional com pincel, linha, retângulo, preenchimento, borracha,
conta-gotas e mão (pan), sliders SIZE e SPACE, e undo/redo ilimitados por
stroke, incluindo o Clear (apagar o mapa) como ação reversível.

## Escopo

**Dentro:**
- Sistema de ferramentas, todas as ferramentas de terreno, histórico, atalhos.

**Fora:**
- UI final estilizada (Sprint 07 — aqui basta funcional), props (a borracha de
  props chega na Sprint 05).

## Tarefas

- [x] `tools/toolsystem.ts`: interface `Tool` (`onDown/onDrag/onUp/onCancel/getPreview`), `ToolSystem` com ferramenta ativa única, integrado ao `HistoryManager` (`beginStroke`/`endStroke` automáticos por ciclo down→up).
- [x] Linha (`tools/line.ts`): Bresenham (raio = SIZE ao redor de cada ponto da linha); preview fantasma durante o arrasto, commit só no `onUp`.
- [x] Retângulo (`tools/rect.ts`): preenchido, com preview; arrastar define os cantos.
- [x] Preenchimento (`tools/bucket.ts`): flood fill BFS limitado à região contígua da mesma camada, teto de 10.000 células — **toast visível na tela ao estourar o limite** (`ui/toast.ts`).
- [x] Borracha (`tools/eraser.ts`): usa `Tilemap.eraseLayer` (rebaixa 1 camada, piso em água).
- [x] Conta-gotas (`tools/dropper.ts`): seleciona como terreno ativo a camada sob o cursor via callback.
- [x] Mão (`tools/hand.ts`): **pan por clique esquerdo via `InputManager.setForcePan`** (ativado ao selecionar a ferramenta em `main.ts`).
- [x] Slider SPACE: espaçamento de carimbo do pincel/borracha (`Brush.setSpacing`/`EraserTool.setSpacing`).
- [x] `tools/history.ts`: `HistoryManager`/`StrokeCommand`/`ClearCommand` — diffs por tile num `Map` (mantém só a mudança líquida por stroke, não uma entrada por evento de pintura); pilhas undo/redo; `ClearCommand` com snapshot de todos os chunks.
- [x] Botões topo: Undo / Redo / Clear (funcionais, estilo provisório) em `ui/terrainpanel.ts`.
- [x] Atalhos: `Ctrl+Z`/`Ctrl+Y`, `B` pincel, `L` linha, `R` retângulo, `G` balde, `E` borracha, `I` conta-gotas, `H` mão — todos em `main.ts`.

## Critérios de aceite

1. **Verificado** — reproduzido com 34 strokes reais (de 50 tentados; o resto
   foram bloqueados pela regra de elevação de camada, esperado) + undo total
   + redo total via script standalone (sem depender do Chrome), comparando
   hash do **conteúdo lógico** do mapa (`getLayer` por coordenada — uma
   primeira tentativa comparando a estrutura crua de chunks deu falso-positivo,
   pois um chunk "existe mas está zerado" não é logicamente igual a "nunca
   existiu", mesmo representando o mesmo mapa). Resultado: undo volta ao
   estado inicial exato, redo volta ao estado final exato.
2. **Verificado** — flood fill de 10.000 tiles mediu **~12.6ms** isoladamente
   (bem dentro do orçamento de 50ms). A preocupação inicial de que
   `Array.shift()` (O(n) em JS) na fila BFS causasse degradação quadrática
   não se confirmou na prática (frente de preenchimento bem menor que o total).
3. **Verificado** — `ClearCommand` tira snapshot de todos os chunks antes de
   limpar; coberto por teste unitário em `history.test.ts`.
4. **Verificado** — `LineTool`/`RectTool` só chamam `tilemap.paintLayer`
   dentro de `onUp()`; `onDrag()` só atualiza os pontos de controle usados
   pelo preview.

## Validação (2026-07-02, auditoria independente)

Implementado por outro agente; esta sprint passou por uma segunda sessão de
validação que **encontrou e corrigiu 2 bugs**:

1. **Build de produção estava quebrado** — `history.test.ts` importava
   `ToolSystem`/`Brush` sem usar, violando `noUnusedLocals` do `tsconfig.json`
   (o Vitest não pega esse tipo de erro, só o `tsc` do build). O handoff
   original afirmava "nenhum erro de build remanescente" — incorreto,
   ninguém tinha rodado `npm run build` depois de adicionar o teste. Corrigido.
2. **Preview ficava invisível atrás de tiles de grama** — `PreviewRenderer`
   não definia `renderOrder` (default 0), menor que o da grama (`renderOrder=1`
   em `TerrainRenderer`); Three.js ordena objetos transparentes por
   `renderOrder` antes de distância/Z, então a grama desenhava por cima do
   preview. Corrigido definindo `renderOrder=2` no preview.

Detalhes completos, incluindo os scripts de verificação usados, em
`AIMemory/handoffs/2026-07-02-sprint-03-validacao.md`.

### Ajustes pendentes — resolvidos em 2026-07-02

- [x] **Ferramenta Hand move a câmera** — `InputManager.setForcePan(true)` ao selecionar Mão; clique esquerdo + arrasto aciona o mesmo pan de botão do meio/espaço.
- [x] **Feedback de estouro do balde** — toast DOM via `showToast()` em `ui/toast.ts`, disparado pelo callback de `BucketTool`.
- [x] **Testes unitários de geometria** — `tools/geometry.test.ts` (12 casos): Bresenham, retângulo preenchido, flood fill (contenção, elevação, teto), preview-vs-commit de Line/Rect.

## Riscos

- Diffs de strokes gigantes (brush 10 arrastado pelo mapa): mitigado — o
  `StrokeCommand` mantém só a mudança líquida por tile num `Map` (não uma
  entrada por evento de pintura), então mesmo um traço longo sobre a mesma
  área não infla o diff além do número de tiles realmente distintos tocados.
