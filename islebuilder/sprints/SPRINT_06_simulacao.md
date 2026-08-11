# Sprint 06 — Simulação viva: aldeões, fauna marinha e navios

- **Status:** Concluído
- **Duração sugerida:** 2 semanas
- **Dependências:** Sprints 04–05
- **Referências:** `GAME_PLAN.md` §2.5; vídeo — centenas de aldeões, cardumes, baleias, galeões

## Objetivo

Dar vida ao mundo: agentes autônomos que reagem ao terreno pintado — aldeões
na grama, peixes e baleias na água, navios navegando entre as ilhas.

## Entregável

Mundo populado automaticamente conforme o jogador constrói: aldeões surgem na
grama e atravessam pontes; cardumes, tubarões, orcas e baleias nadam na água;
botes e galeões com velas animadas navegam desviando da costa. Botão de pausa
congela a simulação.

## Escopo

**Dentro:**
- Sistema de entidades, todos os agentes, spawning dinâmico, LOD, pausa.

**Fora:**
- Sons dos agentes (Sprint 09), interação direta do jogador com agentes (não existe no vídeo).

## Tarefas

### Infraestrutura
- [x] `entities/manager.ts`: ECS leve (arrays tipados por espécie), update em passo fixo, render interpolado.
- [x] Render instanciado por spritesheet (`InstancedMesh` + atlas de frames via UV offset) — nunca 1 draw call por agente.
- [x] LOD de animação: longe da câmera → menos frames/updates; fora da câmera → só posição.
- [x] Spawning dinâmico por censo de terreno: área de grama → nº de aldeões; área de água profunda → fauna e navios (com tetos configuráveis).
- [x] Botão **pausa** (topo esquerdo, abaixo do FPS): congela update da simulação, mantém render e edição.

### Agentes
- [x] Aldeão: wander steering com pausas; caminha só em grama/areia/trilha/**ponte**; animação 4 frames; variações de sprite (cores de roupa/cabelo).
- [x] Travessia de ponte: grafo de conectividade entre massas de terra via pontes; aldeões ocasionalmente atravessam (comportamento visível no vídeo).
- [x] Cardume: boids (separação/alinhamento/coesão) confinados à água; cardumes pequenos coloridos na água rasa, densos na profunda.
- [x] Baleia azul: grande, lenta, água profunda, jato d'água periódico; orca e tubarão similares com sprites próprios; espadarte rápido.
- [x] Bote a remo: deriva lenta próximo à costa.
- [x] Galeão: velas animadas, rastro de espuma, navegação por campo de distância da costa (nunca encalha), rotação suave.
- [x] Todos os agentes com sombra e evitação básica entre si (separação).

## Critérios de aceite

1. 200 aldeões + 150 peixes + 8 baleias/tubarões + 6 navios a 60fps em zoom médio (medir com `threejs-debug-profiler`).
2. Apagar a terra sob aldeões não os deixa presos na água (teleporte/despawn gracioso).
3. Pintar uma ponte entre duas ilhas leva aldeões a atravessá-la em < 1 min de observação.
4. Navios nunca cruzam terra nem água rasa; baleias nunca entram na água rasa.

## Riscos

- Este é o sprint com maior risco de performance — perfilar cedo, no meio da
  sprint, não no fim.
- Interação simulação × edição em tempo real (terreno muda sob o agente):
  revalidar célula do agente a cada passo, com fallback barato.

## Notas de implementação (2026-07-02)

- `src/entities/` — `manager.ts`, `census.ts`, `walkability.ts`, `config.ts`
- `src/render/entityAtlas.ts` + `entityRenderer.ts` — atlas procedural + InstancedMesh por espécie
- `src/ui/pausebutton.ts` — toggle pausa (simulação para, pintura continua)
- 6 testes em `simulation.test.ts` (ponte, rescue, spawn targets)
- 49 testes + build verdes

## Validação (2026-07-02, auditoria independente)

Implementado por outro agente ("cursor"); esta sprint passou por validação
que **encontrou e corrigiu 1 bug real**, além de fornecer números concretos
de performance que não existiam antes.

### Bug corrigido: fauna marinha e navios entravam em água rasa/terra proibida

`EntityManager.updateMarine`/`updateShip` calculavam uma direção de
afastamento da costa (steering) mas nunca validavam o próximo tile antes de
mover — o steering era só uma dica suave, insuficiente perto de penínsulas e
reentrâncias. Um teste de estresse de 2 minutos simulados numa ilha em
formato de estrela (pior caso de litoral complexo) encontrou:

- **~359 violações** de baleia/tubarão/orca/espadarte entrando em água rasa
  (Orca: 309; Whale: 49; Shark: 1; Swordfish: 0).
- **1 violação** de Galeão entrando em água rasa.
- **14 violações** de Bote a remo entrando em terra.

Isso violava diretamente o critério de aceite #4 ("navios nunca cruzam terra
nem água rasa; baleias nunca entram na água rasa"). Corrigido replicando o
padrão que `updateVillager` já usava corretamente: calcular a posição
seguinte, validar o tile de destino, só então commitar o movimento (senão,
girar mais forte e tentar de novo no próximo tick). Reverificado com 3 minutos
simulados (mais que o teste original): **zero violações** nas 4 categorias,
sem regressão de performance.

### Critérios de aceite — status real após validação

1. **Verificado com números concretos** (não existiam antes): `EntityManager.update()`
   ~3.1ms e `EntityRenderer.sync()` ~0.22ms, ambos medidos na população máxima
   (200 aldeões + 150 peixes + 8 fauna + 6 navios) — bem dentro do orçamento
   de 16.7ms/frame a 60fps.
2. **Confirmado** — teste existente em `simulation.test.ts` é válido e
   significativo (não tautológico).
3. **Reverificado com integração real** — o teste existente só cobria a
   escolha probabilística do alvo (`pickWalkTarget`); escrevi uma verificação
   adicional simulando um aldeão nascido fora da ponte, que efetivamente
   **andou até ela em 3.9s** simulados (bem abaixo do limite de 60s).
4. **Corrigido** (ver acima) — era o critério mais frágil, violado
   sistematicamente antes da correção; agora verificado com margem (3 min
   simulados sem nenhuma violação, o teste original rodava só 2 min).

Detalhes completos em `AIMemory/handoffs/2026-07-02-validacao-sprints-04-06.md`.
