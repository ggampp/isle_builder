# Sprint 10 — Progressão: ateliê, marcos e capítulos de ilha

- **Status:** Não iniciado
- **Duração sugerida:** 1–2 semanas
- **Dependências:** Sprint 09 (persistência) — este sprint estende o formato de save
- **Referências:** discussão de game design 2026-07-02 (registrada abaixo); `src/entities/census.ts`, `src/entities/manager.ts`, `src/props/catalog.ts`

## Objetivo

Transformar o sandbox livre em uma jornada com estrutura, sem abrir mão do
clima contemplativo: o jogador começa com um catálogo limitado, desbloqueia
props/ferramentas ao ver sua ilha florescer, e progride por uma sequência de
ilhas — sem economia, sem estado de derrota, sem pressão de tempo. A única
coisa que "trava" é o catálogo; colocar o que já está desbloqueado continua
ilimitado.

Decisões de design já fechadas com o usuário (não reabrir sem motivo novo):
1. **Ateliê global**: props/ferramentas desbloqueados valem para todas as
   ilhas, atuais e futuras — não há reset por ilha.
2. **Meta visível**: o próximo desbloqueio e o progresso até ele aparecem na
   UI (não é surpresa silenciosa).
3. **Sem restrição de colocação**: nenhum sistema de recurso/ficha. O único
   gate é "este prop está no catálogo desbloqueado ou não".
4. **Sem derrota, sem timer**: marcos só adicionam, nunca subtraem ou expiram.

## Entregável

- Painel de progresso na `sidepanel` mostrando o marco atual e quanto falta.
- Estado de ateliê (props/ferramentas desbloqueados) persistido por perfil de
  jogador, separado do save de cada ilha, carregado em toda ilha nova ou existente.
- Uma ilha "florescida" (todos os marcos daquele mapa concluídos) oferece,
  sem forçar, criar a próxima ilha com o ateliê atual herdado.
- Lista inicial de marcos cobrindo população, diversidade de terreno e
  conectividade por ponte, cada um desbloqueando um grupo real de props do
  catálogo atual (`src/props/props.json`, 53 itens em 4 categorias).

## Escopo

**Dentro:**
- Modelo de dados de marcos (`milestones.ts`), motor de avaliação ligado às
  métricas já existentes (`TerrainCensus`, contagem real de `EntityManager.villagers`).
- Estado de ateliê persistido (chave separada do save de mundo).
- UI: indicador de progresso + toast de desbloqueio + tela/menu simples de
  seleção de ilha ("Minhas ilhas" + "Nova ilha").
- Gate de catálogo: `ToolSystem`/UI de props só oferece props desbloqueados.

**Fora:**
- Qualquer sistema de economia/recurso, impostos, felicidade numérica exibida
  como "score" competitivo, estados de derrota ou eventos negativos.
- Multiplayer ou compartilhamento de ilhas entre jogadores.
- Balanceamento fino do ritmo de desbloqueio (fica para uma sessão de
  playtesting depois que o sprint estiver funcionalmente completo).

## Tarefas

### Modelo de marcos
- [ ] `src/progression/milestones.ts`: lista ordenada de marcos, cada um com
  `id`, métrica-alvo (`villagerCount`, `grassTiles`, `componentCount` via
  ponte, `terrainVariety` = nº de `TerrainLayer` distintas presentes), valor
  de threshold, e o que desbloqueia (lista de `propId`s de `PROP_CATALOG` e/ou
  `toolId`).
- [ ] Primeira leva de marcos (rascunho, ajustável): ilha nasce só com
  categoria `vegetation` básica + ferramentas Brush/Eraser/Hand; marcos
  seguintes destravam `decor`, depois `utility`, depois `building`, e as
  ferramentas Line/Rect/Bucket/Dropper em pontos intermediários — não tudo de
  uma vez no início.
- [ ] `src/progression/tracker.ts`: recalcula progresso a partir do
  `TerrainCensusTracker` + contagem real de `EntityManager` (não a meta
  teórica de `targetVillagerCount`, que é só o alvo de spawn) a cada vez que o
  censo é reconstruído; dispara evento de desbloqueio quando um marco é
  cruzado.

### Ateliê (estado global do jogador)
- [ ] `src/progression/atelier.ts`: conjunto de `propId`/`toolId` desbloqueados,
  persistido em `localStorage` sob chave própria (`isle-builder:atelier`),
  independente do save de cada ilha (que fica em Sprint 09).
- [ ] Toda ilha nova ou carregada inicializa seu catálogo disponível a partir
  do ateliê atual — nunca a partir de zero fixo.
- [ ] Ilha "florescida" (todos os marcos daquele mapa atingidos) grava uma
  flag no save da ilha; não bloqueia edição contínua depois disso.

### UI
- [ ] Indicador de progresso na `sidepanel` (aba nova ou widget na aba
  `worldtab`): nome do próximo marco + barra/contador (ex: "142/200
  moradores").
- [ ] Toast de desbloqueio reaproveitando `toast.ts`, ao estilo dos toasts
  existentes (ex: do balde), anunciando o que foi liberado.
- [ ] Tela "Minhas ilhas": lista de ilhas salvas (nome + miniatura, reaproveitando
  a lógica do minimapa do Sprint 07) + botão "Nova ilha"; ao florescer uma
  ilha, sugestão sutil (não modal bloqueante) de iniciar a próxima.
- [ ] `ToolSystem`/paleta de props (side panel) filtra por catálogo
  desbloqueado do ateliê — prop bloqueado não aparece, sem "cadeado visível"
  (ele simplesmente ainda não existe na lista, mantendo o clima descontraído).

## Critérios de aceite

1. Uma ilha nova criada depois que o ateliê já desbloqueou N props mostra
   esses N props disponíveis desde o primeiro segundo — sem precisar
   re-desbloquear.
2. Pintar grama suficiente para a população real (`EntityManager.villagers.length`)
   cruzar o threshold do próximo marco dispara o toast de desbloqueio em até
   um ciclo de recenseamento (mesma cadência de rebuild do censo), sem exigir
   reload.
3. Conectar duas massas de terra por ponte (evento já coberto pelo
   `componentCount` do censo) conta corretamente para o marco correspondente,
   mesmo que a ponte seja destruída e reconstruída depois.
4. Fechar e reabrir o navegador preserva tanto o ateliê (global) quanto o
   progresso de marcos de cada ilha individualmente (depende do formato de
   save do Sprint 09 já estar migrado para incluir isso).
5. Em nenhum momento o jogo exibe estado de "perdeu", cobra tempo, ou remove
   um prop já desbloqueado do catálogo.
6. `npm run build` e `npm run test` verdes; nenhum teste novo depende de rAF
   (seguir o padrão de `simulation.test.ts`: acionar os sistemas diretamente).

## Riscos

- **Acoplar demais ao número exato de props atuais (53)**: se o outro agente
  gerando arte adicionar/remover props do catálogo, os marcos precisam
  referenciar por `category`/`id` estável, não por índice ou contagem total
  fixa — checar `src/props/props.json` no início do sprint, pois pode já ter
  mudado desde a análise feita aqui.
- **Ritmo de desbloqueio errado**: sem playtesting, é fácil desbloquear tudo
  rápido demais (perde a sensação de jornada) ou devagar demais (frustra).
  Tratar os thresholds do rascunho como valores de partida, não finais.
- **Métrica de "população real" tem teto de simulação** (`SIM_CONFIG.maxVillagers
  = 200`): marcos que dependem de contagem de moradores não podem assumir
  valores acima desse teto sem primeiro revisar `SIM_CONFIG`.

## Notas de contexto (discussão de design, 2026-07-02)

Motivação: o usuário quer transformar o Isle Builder de sandbox puro em algo
com estrutura de "jogo real" (referência: SimCity, Tropico 6), mas optou
explicitamente por manter o tom relaxante em vez de replicar economia/política
desses jogos. As perguntas de design e respostas do usuário que fecharam este
escopo:
- Nível de simulação desejado → **progressão leve, mantendo o clima relaxante**
  (não economia estilo SimCity, não política estilo Tropico).
- Feedback de desbloqueio → **meta visível**, não surpresa silenciosa.
- Estrutura entre ilhas → **progressão global** (ateliê), não ilhas
  independentes resetando a cada vez.
- Restrição de colocação → **nenhuma**, catálogo é o único gate.
