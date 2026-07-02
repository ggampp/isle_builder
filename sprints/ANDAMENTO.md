# Andamento do Desenvolvimento — Isle Builder

> Painel de controle do projeto. Atualize este arquivo ao **iniciar** e ao
> **concluir** cada sprint (status, data, % e log). Os detalhes de escopo e
> tarefas vivem no arquivo de cada sprint; aqui fica só o resumo.

**Última atualização:** 2026-07-02
**Sprint atual:** 08 — Persistência, áudio e release (próxima)
**Progresso geral:** 7 de 8 sprints concluídas (87,5%)

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
| 08 | [Persistência, áudio e release](SPRINT_08_persistencia_audio_release.md) | Save/load, paisagem sonora e build de produção verificado | Não iniciado | — | — |

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
- [ ] Sprint 08: onde publicar o build (GitHub Pages, Netlify, outro?).

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
