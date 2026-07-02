# Andamento do Desenvolvimento — Isle Builder

> Painel de controle do projeto. Atualize este arquivo ao **iniciar** e ao
> **concluir** cada sprint (status, data, % e log). Os detalhes de escopo e
> tarefas vivem no arquivo de cada sprint; aqui fica só o resumo.

**Última atualização:** 2026-07-02
**Sprint atual:** 08 — Refit visual (em andamento)
**Progresso geral:** 7 de 10 sprints concluídas (70%)

## Visão geral das sprints

| # | Sprint | Entregável resumido | Status | Início | Fim |
|---|--------|--------------------|--------|--------|-----|
| 01 | [Fundação](SPRINT_01_fundacao.md) | Oceano animado com câmera zoom/pan a 60fps | Concluído | 2026-07-02 | 2026-07-02 |
| 02 | [Tilemap e pintura](SPRINT_02_tilemap_pintura.md) | Pintar ilhas com auto-tiling multicamada em tempo real | Concluído | 2026-07-02 | 2026-07-02 |
| 03 | [Ferramentas e histórico](SPRINT_03_ferramentas_historico.md) | Toolbar completa + undo/redo/clear robustos | Concluído | 2026-07-02 | 2026-07-02 |
| 04 | [Costa viva](SPRINT_04_costa_viva.md) | Água rasa/recifes procedurais + trilha, ponte e penhasco | Concluído | 2026-07-02 | 2026-07-02 |
| 05 | [Arte e props](SPRINT_05_arte_props.md) | Arte pixel final + catálogo de 53 props colocáveis | Concluído | 2026-07-02 | 2026-07-02 |
| 06 | [Simulação viva](SPRINT_06_simulacao.md) | Aldeões, cardumes, baleias e navios autônomos a 60fps | Concluído | 2026-07-02 | 2026-07-02 |
| 07 | [UI premium](SPRINT_07_ui_premium.md) | Paridade visual com o vídeo + abas World/Map/Help | Concluído | 2026-07-02 | 2026-07-02 |
| 08 | [Refit visual](SPRINT_08_refit_visual.md) | Água/costa/terreno com fidelidade real + atlas de props/entidades corrigido | Em andamento | 2026-07-02 | — |
| 09 | [Persistência, áudio e release](SPRINT_09_persistencia_audio_release.md) | Save/load, paisagem sonora e build de produção verificado | Não iniciado | — | — |
| 10 | [Progressão](SPRINT_10_progressao.md) | Ateliê global, marcos visíveis e capítulos de ilha | Não iniciado | — | — |

**Status possíveis:** `Não iniciado` → `Em andamento` → `Concluído` (ou `Bloqueado` com motivo no log).

## Regras de trabalho

1. Executar as sprints **em ordem** — cada uma depende das anteriores.
2. Uma sprint só é `Concluído` quando **todos os critérios de aceite** do seu
   arquivo foram verificados (marcar os checkboxes das tarefas no próprio arquivo).
3. Mudanças de escopo: registrar no arquivo da sprint (seção Escopo) e no log
   abaixo, nunca silenciosamente.
4. Ao concluir uma sprint, registrar também um evento no `AIMemory/work.log` e
   um handoff em `AIMemory/handoffs/` se a sessão terminar no meio de uma sprint.

## Pontos de decisão pendentes com o usuário

- [x] Sprint 07: 4º botão do topo direito = **Screenshot** (PNG sem UI). Confirmado e implementado.
- [x] Sprint 07: abas World, Map e Help — layout aprovado (`mockups/ui-abas-mockup.html`).
- [ ] Sprint 09: onde publicar o build (GitHub Pages, Netlify, outro?).

## Ajustes técnicos pendentes (Sprint 03)

Todos resolvidos em 2026-07-02 — ver `SPRINT_03_ferramentas_historico.md` § "Ajustes pendentes — resolvidos".

## Arte com IA (pós-Sprint 07)

Plano completo em [`assets/ART_PLAN.md`](../assets/ART_PLAN.md). Ícones de UI e logo atuais são **procedurais** (`src/ui/uiIcons.ts`) como placeholder até a geração via Gemini na fase de arte final (~120–150 assets).

## Log de andamento

| Data | Evento |
|------|--------|
| 2026-07-02 | Vídeo de referência analisado (~70 frames); `GAME_PLAN.md` criado |
| 2026-07-02 | Planejamento dividido em 8 sprints; arquivos criados em `sprints/` |
| 2026-07-02 | Mockup das abas World/Map/Help criado e **aprovado** — escopo da Sprint 07 |
| 2026-07-02 | **Sprint 01 concluída** |
| 2026-07-02 | **Sprint 02 concluída** — 15 testes |
| 2026-07-02 | **Sprint 03 concluída** — 7 ferramentas + histórico |
| 2026-07-02 | **Sprint 03 validada** — Hand pan, toast balde, testes geometry |
| 2026-07-02 | **Sprint 04 concluída** — costa viva + Path/Bridge/Cliff |
| 2026-07-02 | **Sprint 05 concluída** — 53 props, SidePanel, PropRenderer |
| 2026-07-02 | **Sprint 06 concluída** — simulação viva, EntityManager |
| 2026-07-02 | **Sprints 04/05/06 validadas** — 3 bugs corrigidos (fauna em tiles proibidos, y-sort, renderOrder) |
| 2026-07-02 | **Plano de arte IA** documentado em `assets/ART_PLAN.md` |
| 2026-07-02 | **Sprint 07 concluída** — UIManager, 6 abas, settings modal, minimapa interativo, ícones/logo procedurais, cursores contextuais. 52 testes + build verdes. Handoff: `AIMemory/handoffs/2026-07-02-sprint-07-concluida.md` |
| 2026-07-02 | Discussão de design: transformar o sandbox em jogo com progressão (SimCity/Tropico como referência, mas mantendo o tom relaxante) — decisão: ateliê global, meta visível, sem economia/derrota. Sprint de progressão criada, inicialmente como Sprint 09. |
| 2026-07-02 | Comparação visual entre `assets/status/image copy.png` (estado atual) e `assets/status/jogo_exemplo.png` (frame de `game_video.mp4`) expôs 3 causas técnicas concretas do "pixelado": atlas de props/entidades gerados via IA quebrado (cenas coladas + marca d'água, carregado direto sem cair no fallback procedural), oceano/terreno ainda 100% procedurais sem textura/espuma, densidade de props abaixo da referência. **Sprint 08 — Refit visual** criada (`SPRINT_08_refit_visual.md`) e inserida **antes** de persistência e progressão, que foram renumeradas: 08→09 (`SPRINT_09_persistencia_audio_release.md`), 09→10 (`SPRINT_10_progressao.md`). |
| 2026-07-02 | **Sprint 08 iniciada.** Task 0 (ilha inicial): `src/world/seedIsland.ts` stampa ilha orgânica no boot (oeste só areia, leste areia+grama), chamada em `main.ts` sem passar por `HistoryManager` (não desfazível). Task 1 (parar a sangria): `main.ts` revertido para `buildPropsAtlas()`/`buildEntityAtlas()` procedurais em vez de carregar os PNGs quebrados — confirmado visualmente no browser que os artefatos tipo confete na costa sumiram. `npm run build`/`npm run test` verdes (52 testes), FPS 60 no boot, sem erros de console. Faltam: água/costa/terreno com textura real e regeneração correta do atlas (coordenar com o outro agente). |
| 2026-07-02 | **Sprint 08 — Tasks 2 e 3.** Água: `Ocean.ts` trocado de navy quase-preto para turquesa claro, afinado para casar com o anel de água rasa do `CoastRenderer` (espuma já existia, só não aparecia bem contra o navy). Costa: `terrainAtlas.ts` `drawQuadrant` reescrito — o corte reto que ia até o centro do tile (causa raiz do serrilhado "dente de tubarão") virou recorte arredondado e raso. Terreno: grão de sand/grass reduzido (~60%) e atlas trocado para `LinearMipmapLinearFilter`/mipmaps (corrige aliasing Moiré da minificação 64px→16px). Corrigido também um bug pré-existente de casing (`ocean.ts` vs `Ocean.ts`) que só apareceu ao tocar o arquivo. Build/testes verdes. **Pendência real:** as screenshots via `computer` tool ainda mostram um padrão de pontos na areia/grama que não mudou visualmente após os ajustes — tentativa de ler pixels reais via canvas falhou (aba automatizada com `document.hidden`, gotcha já conhecido); suspeita forte de artefato de compressão JPEG (documentado no `CLAUDE.md`), mas não confirmado nesta sessão — pedido ao usuário para conferir `localhost:5183` num navegador normal. Identificado também um risco de fundo não resolvido: o grão é gerado por célula do atlas compartilhado (não por posição no mundo), então tiles com a mesma máscara repetem o mesmo padrão — mitigado (intensidade menor), não eliminado. |
